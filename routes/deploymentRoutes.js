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
        show: `solana program show --url ${endpoint} ${programId}`
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


module.exports = router;
