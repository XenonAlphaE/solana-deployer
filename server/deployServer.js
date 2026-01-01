// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { Keypair, Connection, sendAndConfirmTransaction } = require("@solana/web3.js");
const { saveProgramFile } = require("./storageUtils"); // adjust path if needed
const encodePhase = require('../utils/encodePhase')
const {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  BPF_LOADER_PROGRAM_ID,
  BpfLoader,
  ComputeBudgetProgram,
} = require("@solana/web3.js");
require("dotenv").config(); // Load environment variables

const deploymentRoutes = require('../routes/deploymentRoutes')
const deployCmdRoutes = require('../routes/deployCmdRoutes')
const splTokenRoutes = require('../routes/splTokenRoutes')
// This is the official upgradeable loader program ID
const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);
const app = express();
const PORT = 10001;
const KEYSTORE_DIR = path.join(process.cwd(),  "uploads", "keystores");
const PROGRAM_DIR = path.join(process.cwd(), "uploads","programs");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/deployment', deploymentRoutes);
app.use('/api/cmd', deployCmdRoutes);
app.use('/api/spl', splTokenRoutes);

// Ensure folders exist
fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
fs.mkdirSync(PROGRAM_DIR, { recursive: true });

// Storage for keystores (payer)
const keystoreStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, KEYSTORE_DIR),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const uploadKeystore = multer({ storage: keystoreStorage });


// Uploader that accepts 2 fields: program + keystore
const uploadProgramAndKey = multer({ storage: multer.memoryStorage()  }).fields([
  { name: "program", maxCount: 1 },   // expects .so file
  { name: "keystore", maxCount: 1 },   // expects .json file
  { name: "idl", maxCount: 1 },        // Anchor IDL .json
]);


// Upload payer keystore
// app.post("/api/keystore", uploadKeystore.single("keystore"), (req, res) => {
//   res.json({ message: "Payer keystore uploaded", file: req.file });
// });

// Upload program keypair (.json)
app.post(
  "/api/program",
  uploadProgramAndKey,
  (req, res) => {
    try {
      if (!req.files?.program || !req.files?.keystore) {
        return res.status(400).json({
          error: "Both program (.so) and keystore (.json) are required"
        });
      }

      if (!process.env.ENCODE_SALT) {
        return res.status(400).json({ error: "password is required" });
      }

      const files = {};

      // program (.so)
      files.program = saveProgramFile(
        req,
        req.files.program[0],
        process.env.ENCODE_SALT
      );

      // keystore (encrypted)
      files.keystore = saveProgramFile(
        req,
        req.files.keystore[0],
        process.env.ENCODE_SALT
      );

      // idl (optional)
      if (req.files.idl?.[0]) {
        files.idl = saveProgramFile(
          req,
          req.files.idl[0],
          process.env.ENCODE_SALT
        );
      }

      res.json({
        message: "Upload successful",
        files
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);


// List uploaded .so files

app.get("/api/programs", (req, res) => {
  try {
    const files = fs.readdirSync(PROGRAM_DIR);

    // Collect by extension
    const binaries = files.filter(f => f.endsWith(".so"));
    const programIds = files.filter(f => f.endsWith(".json") && !f.endsWith("-keypair.txt"));
    const keypairs = files.filter(f => f.endsWith("-keypair.txt"));

    // Normalize basenames
    const binNames = binaries.map(f => path.basename(f, ".so"));
    const idNames = programIds.map(f => path.basename(f, ".json"));
    const keyNames = keypairs.map(f => path.basename(f, "-keypair.txt"));

    // Find intersection of all 3
    const common = binNames.filter(n => idNames.includes(n) && keyNames.includes(n));

    const rows = common.map(name => {
      const keypairPath = path.join(PROGRAM_DIR, `${name}-keypair.txt`);
      let publicKey = null;
      
      try {
        const encrypted = fs.readFileSync(keypairPath).toString()
        const decrypted = encodePhase.decryptPhase(
          process.env.ENCODE_SALT,
          encrypted
        );
        const secret = new Uint8Array(JSON.parse(decrypted));
        const kp = Keypair.fromSecretKey(secret);
        publicKey = kp.publicKey.toBase58();
      } catch (err) {
        console.error(`Failed to extract public key for ${name}:`, err);
      }

      return {
        name,
        binary: `${name}.so`,
        programId: `${name}.json`,
        keypair: `${name}-keypair.txt`,
        publicKey,
      };
    });

    return res.json(rows);
  } catch (err) {
    console.error("Error listing programs:", err);
    return res.status(500).json({ error: "Failed to list programs" });
  }
});


app.get("/api/idl/:program", (req, res) => {
  const { program } = req.params;
  const idlPath = path.join(PROGRAM_DIR, `${program}.json`);
  try {
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    res.json(idl);
  } catch (err) {
    res.status(404).json({ error: "IDL not found" });
  }
});


// Delete a program by name (removes .so, -keypair.json, and .json files)
app.delete("/api/programs/:name", (req, res) => {
  const { name } = req.params;

  if (!name) {
    return res.status(400).json({ error: "Missing program name" });
  }

  try {
    const filesToDelete = [
      path.join(PROGRAM_DIR, `${name}.so`),
      path.join(PROGRAM_DIR, `${name}-keypair.txt`),
      path.join(PROGRAM_DIR, `${name}.json`),
    ];

    let deleted = [];
    filesToDelete.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted.push(path.basename(filePath));
      }
    });

    if (deleted.length === 0) {
      return res.status(404).json({ error: `No files found for program "${name}"` });
    }

    return res.json({
      message: `Program "${name}" deleted successfully`,
      deleted,
    });
  } catch (err) {
    console.error("Failed to delete program:", err);
    return res.status(500).json({ error: "Failed to delete program" });
  }
});


app.get("/api/keystores", (req, res) => {
  try {
    const keys = fs.readdirSync(KEYSTORE_DIR).filter(f => f.endsWith(".txt"));

    const result = keys.map(filename => {
      const filepath = path.join(KEYSTORE_DIR, filename);
      const encrypted = fs.readFileSync(filepath).toString()
      const decrypted = encodePhase.decryptPhase(
        process.env.ENCODE_SALT,
        encrypted
      );
      const secret = new Uint8Array(JSON.parse(decrypted));

      // Solana keystore is usually just an array of secret key bytes
      const keypair = Keypair.fromSecretKey(secret);
      const pubkey = keypair.publicKey.toBase58();

      return {
        filename,
        publicKey: pubkey,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate-payer", (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing required field: name" });
    }

    // Sanitize filename: remove spaces and only allow alphanumerics + underscore
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "");

    const payer = Keypair.generate();

    // serialize to string
    const secretStr = JSON.stringify(Array.from(payer.secretKey));
    // Force filename to use given name
    const fileName = `${safeName}.txt`;
    const filePath = path.join(KEYSTORE_DIR, fileName);

    if (fs.existsSync(filePath)) {
      return res.status(400).json({ error: `File ${fileName} already exists` });
    }
    const encrypted = encodePhase.encryptPhase(
      process.env.ENCODE_SALT,
      secretStr
    );


    fs.writeFileSync(filePath, encrypted);

    return res.json({
      name: safeName,
      publicKey: payer.publicKey.toBase58(),
      keystore: fileName,
    });
  } catch (err) {
    console.error("Failed to generate payer:", err);
    return res.status(500).json({ error: "Failed to generate payer" });
  }
});


// --- Preview deploy status ---
app.post("/api/deploy/preview", async (req, res) => {
  const { signerFile, programFile, programId, rpcUrl, feeMultiplier } = req.body;

  if (!signerFile || !programFile) {
    return res.status(400).json({ error: "Missing params" });
  }

  const signerPath = path.join(KEYSTORE_DIR, signerFile);
  const programPath = path.join(PROGRAM_DIR, programFile);

  if (!fs.existsSync(signerPath) || !fs.existsSync(programPath)) {
    return res.status(400).json({ error: "Missing signer or program file" });
  }

  const endpoint = rpcUrl || "https://api.devnet.solana.com";
  const connection = new Connection(endpoint, "confirmed");

  try {
    // Load signer
    const encrypted = fs.readFileSync(signerPath).toString()
    const decrypted = encodePhase.decryptPhase(
      process.env.ENCODE_SALT,
      encrypted
    );
    const signerSecret = new Uint8Array(JSON.parse(decrypted));
    const signer = Keypair.fromSecretKey(signerSecret);

    const balanceLamports = await connection.getBalance(signer.publicKey);

    // Program size
    const programData = fs.readFileSync(programPath);
    const programSize = programData.length;

    // Get prioritization fee reference (cannot be simulated, it's just network state)
    const prioritizationFees = await connection.getRecentPrioritizationFees([]);

    // Rent-exempt minimum
    const rentExemptLamports = await connection.getMinimumBalanceForRentExemption(programSize);

    // Fee per sig
    const { blockhash } = await connection.getLatestBlockhash();
    const dummyTx = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: blockhash,
    });
    const lamportsPerSignature = (await connection.getFeeForMessage(
      dummyTx.compileMessage()
    )).value;

    // --- Fee multiplier (default 1x) ---
    const multiplier = Math.max(1, Number(feeMultiplier) || 1);
    const adjustedLamportsPerSignature = lamportsPerSignature * multiplier;

    const estimatedTxCount = Math.ceil(programSize / 900);
    const estimatedTxFees = estimatedTxCount * adjustedLamportsPerSignature;
    const totalLamports = rentExemptLamports + estimatedTxFees;

    let alreadyDeployed = false;
    if (programId) {
      try {
        const accInfo = await connection.getAccountInfo(new PublicKey(programId));
        alreadyDeployed = !!accInfo;
      } catch (e) {
        console.warn("Invalid programId or not deployed yet");
      }
    }

    return res.json({
      rpcUrl: endpoint,
      signer: signer.publicKey.toBase58(),
      balanceSol: balanceLamports / LAMPORTS_PER_SOL,
      programSize,
      rentExemptLamports,
      lamportsPerSignature,
      multiplier,
      estimatedTxFees,
      totalSolRequired: totalLamports / LAMPORTS_PER_SOL,
      alreadyDeployed,
      prioritizationFeeReference: prioritizationFees, // this is real, affects actual deploy

    });
  } catch (err) {
    console.error("Preview failed", err);
    return res.status(500).json({ error: err.message });
  }
});




app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
