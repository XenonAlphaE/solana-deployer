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
const { decryptPhase } = require("../utils/encodePhase");
const os = require("os");

const TMP_BASE = path.join(os.tmpdir(), "solana-cli");



const router = express.Router();
const KEYSTORE_DIR = path.join(process.cwd(),  "uploads", "keystores");
const PROGRAM_DIR = path.join(process.cwd(), "uploads","programs");

function ensureTempKeypair(encryptedPath, password, label) {
  if (!fs.existsSync(TMP_BASE)) {
    fs.mkdirSync(TMP_BASE, { recursive: true, mode: 0o700 });
  }


  const tmpPath = path.join(TMP_BASE, `${label}.json`);

  // ✅ idempotent: reuse if valid
  if (fs.existsSync(tmpPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(tmpPath, "utf8"));
      Keypair.fromSecretKey(new Uint8Array(data)); // validate
      return tmpPath;
    } catch {
      fs.unlinkSync(tmpPath); // corrupted → regenerate
    }
  }

  const encrypted = fs.readFileSync(encryptedPath, "utf8");
  const decrypted = decryptPhase(
    password,
    encrypted
  );


  // 🔓 decrypt
  const secret = new Uint8Array(JSON.parse(decrypted));

  // validate before writing
  Keypair.fromSecretKey(secret);

  fs.writeFileSync(tmpPath, decrypted, { mode: 0o600 });

  return tmpPath;
}


router.post("/cli", async (req, res) => {
  const { signerFile, programFile, programName, rpcUrl, computeUnitPrice, programId ,   authorityFile} = req.body;

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
    const programKeyPath = path.join(PROGRAM_DIR, `${programName}-keypair.txt`);
    const authorityPath = authorityFile
      ? path.join(KEYSTORE_DIR, authorityFile)
      : signerPath;

    if (!fs.existsSync(authorityPath)) {
      return res.status(400).json({ error: "Authority key file not found" });
    }

    if (!fs.existsSync(signerPath) || !fs.existsSync(programPath) || !fs.existsSync(programKeyPath)) {
      return res.status(400).json({ error: "Signer, program, or program key file not found" });
    }


    const tempProgramKey = ensureTempKeypair(
      programKeyPath,
      process.env.ENCODE_SALT,
      programName
    );

    const tempSignerKey = ensureTempKeypair(
      signerPath,
      process.env.ENCODE_SALT,
      signerFile
    );

    const tempAuthorityKey = ensureTempKeypair(
      authorityPath,
      process.env.ENCODE_SALT,
      authorityFile || signerFile
    );
    // Build CLI args
    const args = [
      "program",
      "deploy",
      "--url",
      rpcUrl || "https://api.devnet.solana.com",
      "--max-sign-attempts",
      "60",
      "--program-id",
      tempProgramKey,
      "--fee-payer",
      tempSignerKey,
      "--upgrade-authority",
      tempAuthorityKey,
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
        note:"the privkey is encrypted by default, this tmp file key is plaintext for privkey using with cmd running and need to be clear afterwards.",
        deploy: deployCmd,
        logs: logsCmd,
        account: accountCmd,
        authority: authorityFile || signerFile,
        show: `solana program show --url ${endpoint} ${programId}`,
        removeCliTmpKeys: `rm -fv "$(getconf DARWIN_USER_TEMP_DIR)solana-cli/"*.json`,
        // 🔥 New failure handling helpers
        recoverBuffer: `solana-keygen recover -o buffer.json; then enter  "<12-word-seed-from-error>" from deployment fail to get private for buffer`,
        bufferPubkey: `solana-keygen pubkey buffer.json`,
        inspectBuffer: `solana account <BUFFER_PUBKEY> --url ${endpoint}`,
        closeBuffer: `solana program close <BUFFER_PUBKEY>  (((--recipient <YOUR_MAIN_WALLET>))) --keypair <AUTHORITY_OF_BUFFER> --url ${endpoint} ; if not recipient, that will return to authority wallet`,
        resumeDeploy: `solana program deploy \
          --program-id ${tempProgramKey} \
          --buffer <BUFFER_KEYPAIR> \
          --upgrade-authority ${tempAuthorityKey} \
          --fee-payer ${tempSignerKey} \
          --url ${tempSignerKey} \
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



module.exports = router;
