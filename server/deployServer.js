const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const {
  Connection,
  Keypair,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
  BPF_LOADER_UPGRADEABLE,
} = require("@solana/web3.js");

const upload = multer({ dest: "uploads/" });
const app = express();
const port = 10001;

app.use(express.json());
app.use(express.static("public"));

app.post("/deploy", upload.single("program"), async (req, res) => {
  try {
    const { signerKeypair, programKeypair } = req.body;
    const soFile = req.file;

    if (!signerKeypair || !programKeypair || !soFile) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(signerKeypair)));
    const programKey = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(programKeypair)));

    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const programId = programKey.publicKey;

    const programBuffer = fs.readFileSync(soFile.path);
    const rentExempt = await connection.getMinimumBalanceForRentExemption(programBuffer.length);

    const programAccount = Keypair.generate();

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: signer.publicKey,
        newAccountPubkey: programId,
        lamports: rentExempt,
        space: programBuffer.length,
        programId: BPF_LOADER_UPGRADEABLE,
      }),
      {
        keys: [
          { pubkey: programId, isSigner: true, isWritable: true },
          { pubkey: signer.publicKey, isSigner: true, isWritable: false },
        ],
        programId: BPF_LOADER_UPGRADEABLE,
        data: programBuffer,
      }
    );

    console.log("Sending deploy transaction...");
    await sendAndConfirmTransaction(connection, tx, [signer, programKey]);

    res.json({ success: true, programId: programId.toBase58() });
  } catch (e) {
    console.error("Deploy error:", e);
    res.status(500).json({ error: e.message });
  } finally {
    if (req.file) fs.unlinkSync(req.file.path);
  }
});

app.listen(port, () => {
  console.log(`Solana deploy server listening at http://localhost:${port}`);
});
