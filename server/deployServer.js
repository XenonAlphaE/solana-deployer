// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { Keypair, Connection, sendAndConfirmTransaction } = require("@solana/web3.js");
const {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  BPF_LOADER_PROGRAM_ID,
  BpfLoader,
  ComputeBudgetProgram,
} = require("@solana/web3.js");

const deploymentRoutes = require('../routes/deploymentRoutes')
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

// Storage rules: save both .so and .json into PROGRAM_DIR
const programStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROGRAM_DIR),
  filename: (req, file, cb) => {
    if (file.originalname.endsWith(".so")) {
      // Save the .so file with its original name
      req.soBaseName = path.parse(file.originalname).name; // remember base name
      cb(null, file.originalname);

    } else if (file.originalname.endsWith("-keypair.json")) {
      const base = req.soBaseName || path.parse(file.originalname).name;
      cb(null, base + "-keypair.json");
    } else if (file.originalname.endsWith(".json")) {
      // This could be IDL
      const base = req.soBaseName || path.parse(file.originalname).name;
      cb(null, base + ".json");
    } 
    else {
      cb(null, file.originalname); // fallback
    }
  },
});

// Uploader that accepts 2 fields: program + keystore
const uploadProgramAndKey = multer({ storage: programStorage }).fields([
  { name: "program", maxCount: 1 },   // expects .so file
  { name: "keystore", maxCount: 1 },   // expects .json file
  { name: "idl", maxCount: 1 },        // Anchor IDL .json
]);


// Upload payer keystore
app.post("/api/keystore", uploadKeystore.single("keystore"), (req, res) => {
  res.json({ message: "Payer keystore uploaded", file: req.file });
});

// Upload program keypair (.json)
app.post("/api/program", uploadProgramAndKey, (req, res) => {
  if (!req.files.program || !req.files.keystore) {
    return res.status(400).json({ error: "Both program (.so) and keystore (.json) are required" });
  }

  res.json({
    message: "Upload successful",
    files: {
      program: req.files.program[0].filename,
      keystore: req.files.keystore?.[0]?.filename,
      idl: req.files.idl?.[0]?.filename,
    }
  });

});


// List uploaded .so files

app.get("/api/programs", (req, res) => {
  try {
    const files = fs.readdirSync(PROGRAM_DIR);

    // Collect by extension
    const binaries = files.filter(f => f.endsWith(".so"));
    const programIds = files.filter(f => f.endsWith(".json") && !f.endsWith("-keypair.json"));
    const keypairs = files.filter(f => f.endsWith("-keypair.json"));

    // Normalize basenames
    const binNames = binaries.map(f => path.basename(f, ".so"));
    const idNames = programIds.map(f => path.basename(f, ".json"));
    const keyNames = keypairs.map(f => path.basename(f, "-keypair.json"));

    // Find intersection of all 3
    const common = binNames.filter(n => idNames.includes(n) && keyNames.includes(n));

    const rows = common.map(name => {
      const keypairPath = path.join(PROGRAM_DIR, `${name}-keypair.json`);
      let publicKey = null;

      try {
        const secret = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
        const kp = Keypair.fromSecretKey(new Uint8Array(secret));
        publicKey = kp.publicKey.toBase58();
      } catch (err) {
        console.error(`Failed to extract public key for ${name}:`, err);
      }

      return {
        name,
        binary: `${name}.so`,
        programId: `${name}.json`,
        keypair: `${name}-keypair.json`,
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
      path.join(PROGRAM_DIR, `${name}-keypair.json`),
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
    const keys = fs.readdirSync(KEYSTORE_DIR).filter(f => f.endsWith(".json"));

    const result = keys.map(filename => {
      const filepath = path.join(KEYSTORE_DIR, filename);
      const raw = JSON.parse(fs.readFileSync(filepath, "utf8"));

      // Solana keystore is usually just an array of secret key bytes
      const keypair = Keypair.fromSecretKey(new Uint8Array(raw));
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
    const secret = Array.from(payer.secretKey);

    // Force filename to use given name
    const fileName = `${safeName}.json`;
    const filePath = path.join(KEYSTORE_DIR, fileName);

    if (fs.existsSync(filePath)) {
      return res.status(400).json({ error: `File ${fileName} already exists` });
    }

    fs.writeFileSync(filePath, JSON.stringify(secret));

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
    const signerSecret = new Uint8Array(JSON.parse(fs.readFileSync(signerPath)));
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
