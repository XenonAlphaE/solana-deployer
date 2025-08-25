const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Loader,
  ComputeBudgetProgram,
  PublicKey,
} = require("@solana/web3.js");
const bip39 = require("bip39");
const { derivePath } = require("ed25519-hd-key");



const router = express.Router();
const KEYSTORE_DIR = path.join(process.cwd(),  "uploads", "keystores");
const PROGRAM_DIR = path.join(process.cwd(), "uploads","programs");

router.post("/cli", async (req, res) => {
  const { signerFile, programFile, programName, rpcUrl, computeUnitPrice, programId } = req.body;

  try {
    if (!signerFile || !programFile || !programId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const endpoint = rpcUrl || "https://api.devnet.solana.com";
    const connection = new Connection(endpoint, "confirmed");

    // Check if program account already exists
    if (programId) {
      const accInfo = await connection.getAccountInfo(new PublicKey(programId));
      if (!!accInfo) throw new Error("Program account already exists. Generate a new one.");
    }

    const signerPath = path.join(KEYSTORE_DIR, signerFile);
    const programPath = path.join(PROGRAM_DIR, programFile);
    const programKeyPath = path.join(PROGRAM_DIR, `${programName}-keypair.json`);

    if (!fs.existsSync(signerPath) || !fs.existsSync(programPath) || !fs.existsSync(programKeyPath)) {
      return res.status(400).json({ error: "Signer, program, or program key file not found" });
    }

    // Build CLI args
    const args = [
      "program",
      "deploy",
      "--url",
      rpcUrl || "https://api.devnet.solana.com",
      "--max-sign-attempts",
      "60",
      "--program-id",
      programKeyPath,
      "--fee-payer",
      signerPath,
      "--upgrade-authority",
      signerPath,
    ];

    if (computeUnitPrice) args.push("--with-compute-unit-price", computeUnitPrice.toString());

    args.push(programPath);

    // Deployment command
    const deployCmd = `SOLANA_KEYPAIR="${signerPath}" solana ${args.map(a => `"${a}"`).join(" ")}`;

    // Follow-up commands (logs + account info)
    const logsCmd = `solana logs --url ${endpoint} ${programId}`;
    const accountCmd = `solana account --url ${endpoint} ${programId}`;

    res.json({
      cliCommands: {
        deploy: deployCmd,
        logs: logsCmd,
        account: accountCmd,
        show: `solana program show --url ${endpoint} ${programId}`,

        // 🔥 New failure handling helpers
        recoverBuffer: `solana-keygen recover -o buffer.json "<12-word-seed-from-error>"`,
        bufferPubkey: `solana-keygen pubkey buffer.json`,
        inspectBuffer: `solana account <BUFFER_PUBKEY> --url ${endpoint}`,
        closeBuffer: `solana program close <BUFFER_PUBKEY> --recipient <YOUR_MAIN_WALLET> --keypair buffer.json --url ${endpoint}`,
        resumeDeploy: `solana program deploy \
          --program-id ${programKeyPath} \
          --buffer <BUFFER_PUBKEY> \
          --buffer-signer buffer.json \
          --upgrade-authority ${signerPath} \
          --fee-payer ${signerPath} \
          --url ${endpoint} \
          ${programPath}`
      },
    });

    // NOTE: if you want to actually run it, uncomment the execFile block
    // const env = { SOLANA_KEYPAIR: signerPath };
    // execFile("solana", args, { env }, (error, stdout, stderr) => {
    //   if (error) {
    //     console.error("Deploy CLI failed:", error, stderr);
    //     return res.status(500).json({
    //       error: stderr || error.message,
    //       cliCommands: { deploy: deployCmd, logs: logsCmd, account: accountCmd }
    //     });
    //   }
    //   res.json({
    //     success: true,
    //     output: stdout,
    //     cliCommands: { deploy: deployCmd, logs: logsCmd, account: accountCmd }
    //   });
    // });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------
// Recover buffer.json from seed
// ----------------------------
router.post("/buffer/recover", async (req, res) => {
  const { seedPhrase, programName } = req.body;

  try {
    if (!seedPhrase || !programName) {
      return res.status(400).json({ error: "Missing seed phrase" });
    }

    const seed = await bip39.mnemonicToSeed(seedPhrase.trim());
    const derived = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
    const keypair = Keypair.fromSeed(derived);

    const filePath = path.join(PROGRAM_DIR, `${programName}-buffer.json`);
    fs.writeFileSync(filePath, JSON.stringify(Array.from(keypair.secretKey)));

    res.json({
      success: true,
      bufferFile: filePath,
      pubkey: keypair.publicKey.toBase58(),
    });
  } catch (err) {
    console.error("Buffer recover failed:", err);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------
// Close or Resume buffer deploy
// ----------------------------
router.post("/buffer/handle", async (req, res) => {
  const { action, bufferFile, bufferPubkey, programId, signerFile, rpcUrl, programPath } = req.body;

  try {
    const endpoint = rpcUrl || "https://api.devnet.solana.com";

    if (!fs.existsSync(bufferFile)) {
      return res.status(400).json({ error: "Buffer keypair file not found" });
    }

    if (action === "close") {
      const closeCmd = `solana program close ${bufferPubkey} --recipient <YOUR_MAIN_WALLET> --keypair ${bufferFile} --url ${endpoint}`;
      return res.json({ action: "close", cliCommand: closeCmd });
    }

    if (action === "resume") {
      if (!programId || !signerFile || !programPath) {
        return res.status(400).json({ error: "Missing programId, signerFile, or programPath for resume" });
      }

      const resumeCmd = `solana program deploy \
        --program-id ${programId} \
        --buffer ${bufferPubkey} \
        --buffer-signer ${bufferFile} \
        --upgrade-authority ${signerFile} \
        --fee-payer ${signerFile} \
        --url ${endpoint} \
        ${programPath}`;

      return res.json({ action: "resume", cliCommand: resumeCmd });
    }

    return res.status(400).json({ error: "Invalid action, must be 'close' or 'resume'" });
  } catch (err) {
    console.error("Buffer handler failed:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
