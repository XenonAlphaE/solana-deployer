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
} = require("@solana/web3.js");

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


// List keystores
app.get("/api/keystores", (req, res) => {
  const keys = fs.readdirSync(KEYSTORE_DIR).filter(f => f.endsWith(".json"));
  return res.json([...keys]);
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


// Deploy program
app.post("/api/deploy", async (req, res) => {
  const { signerFile, programFile, preview } = req.body;
  if (!signerFile || !programFile) return res.status(400).json({ error: "Missing params" });

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const signerPath = path.join(KEYSTORE_DIR, signerFile);
  const programPath = path.join(PROGRAM_DIR, programFile);

  if (!fs.existsSync(signerPath) || !fs.existsSync(programPath)) {
    return res.status(400).json({ error: "Missing signer or program file" });
  }

  const signerSecret = new Uint8Array(JSON.parse(fs.readFileSync(signerPath)));
  const signer = Keypair.fromSecretKey(signerSecret);

  const programKeypair = Keypair.generate();
  const programData = fs.readFileSync(programPath);

  if (preview) {
    // Do estimation only, no deploy
    const programData = fs.readFileSync(programPath);
    const rentExemptLamports = await connection.getMinimumBalanceForRentExemption(programData.length);
    const lamportsPerSignature = (await connection.getFeeForMessage(
      (new Transaction()).compileMessage()
    )).value;

    const estimatedTxCount = Math.ceil(programData.length / 900);
    const estimatedTxFees = estimatedTxCount * lamportsPerSignature;
    const totalLamports = rentExemptLamports + estimatedTxFees;

    return res.json({
      programSize: programData.length,
      rentExemptLamports,
      estimatedTxFees,
      totalSol: totalLamports / LAMPORTS_PER_SOL,
    });
  }


  try {
      // Build instruction: set new authority = null
      const ix = {
        keys: [
          { pubkey: programPubkey, isSigner: false, isWritable: true },
          { pubkey: signer.publicKey, isSigner: true, isWritable: false }, // current authority
        ],
        programId: BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
        data: Buffer.from([4, 0, 0, 0]), // "SetAuthority" instruction layout
      };
      


      const tx = new Transaction().add(ix);
      tx.feePayer = signer.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Sign + send with Phantom
      const signedTx = await signer.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(sig, "confirmed");


      return res.json({
        message: "Deployed successfully",
        tx: tx,
        programId: programKeypair.publicKey.toBase58(),
      });
  } catch (err) {
    console.error("Deployment failed", err);
    return res.status(500).json({ error: "Deployment failed", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
