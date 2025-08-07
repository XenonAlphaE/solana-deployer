// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { Keypair, Connection, sendAndConfirmTransaction } = require("@solana/web3.js");
const { BpfLoader, BPF_LOADER_PROGRAM_ID } = require("@solana/web3.js");

const app = express();
const PORT = 10001;
const KEYSTORE_DIR = path.join(process.cwd(), "keystore");
const PROGRAM_DIR = path.join(process.cwd(), "programs");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure folders exist
fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
fs.mkdirSync(PROGRAM_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROGRAM_DIR),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// Upload .so file
app.post("/api/upload", upload.single("program"), (req, res) => {
  return res.json({ filename: req.file.filename });
});

// List uploaded .so files
app.get("/api/programs", (req, res) => {
  const files = fs.readdirSync(PROGRAM_DIR).filter(f => f.endsWith(".so"));
  return res.json({ files });
});

// List keystores
app.get("/api/keystores", (req, res) => {
  const keys = fs.readdirSync(KEYSTORE_DIR).filter(f => f.endsWith(".json"));
  return res.json({ keys });
});

// Create new keypair
app.post("/api/keystore", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const kp = Keypair.generate();
  fs.writeFileSync(
    path.join(KEYSTORE_DIR, `${name}.json`),
    JSON.stringify(Array.from(kp.secretKey))
  );
  res.json({ message: "Keypair created", pubkey: kp.publicKey.toBase58() });
});

// Deploy program
app.post("/api/deploy", async (req, res) => {
  const { signerFile, programFile } = req.body;
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

  try {
    const tx = await BpfLoader.load(
      connection,
      signer,
      programKeypair,
      programData,
      BPF_LOADER_PROGRAM_ID
    );

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
