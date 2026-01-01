const express = require("express");

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const { spawn } = require("child_process");
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
const { decryptPhase, encryptPhase } = require("../utils/encodePhase");
const router = express.Router();
const KEYSTORE_DIR = path.join(process.cwd(),  "uploads", "keystores");
const PROGRAM_DIR = path.join(process.cwd(), "uploads","programs");



function writeTempKeypair(encryptedFilePath, password, label) {
  const encrypted = fs.readFileSync(encryptedFilePath, "utf8");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `solana-${Date.now()}`));
  const keypairPath = path.join(tmpDir, `${crypto.randomUUID()}-${label}.json`);

  const decrypted = decryptPhase(
    password,
    encrypted
  );
  const secret = new Uint8Array(JSON.parse(decrypted));

  // Solana keystore is usually just an array of secret key bytes
  const keypair = Keypair.fromSecretKey(secret);
  const pubkey = keypair.publicKey.toBase58();

  fs.writeFileSync(keypairPath, decrypted, { mode: 0o600 });

  return { keypairPath, tmpDir };
}

function deployProgramCLI({
    args,
  rpcUrl,
  soPath,
  programKeypairPath,
  payerKeypairPath,
  onLog
}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "solana",
      [...args],
      {
        env: {
          ...process.env,
          SOLANA_KEYPAIR: payerKeypairPath
        }
      }
    );

    let stderr = "";

    child.stdout.on("data", d => onLog?.(d.toString()));
    child.stderr.on("data", d => {
      const msg = d.toString();
      stderr += msg;
      onLog?.(msg);
    });

    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(stderr));
    });
  });
}
function saveRecoverySeed(seed, programName) {
  fs.writeFileSync(
    `./recovery/${programName}.seed.txt`,
    seed,
    { mode: 0o600 }
  );
}

function extractSeedPhrase(stderr) {
  const match = stderr.match(/([a-z]+(?:\s+[a-z]+){11})/i);
  return match?.[1] || null;
}




// async function secureDeploy({
//   rpcUrl,
//   soPath,
//   encryptedProgramKeypair,
//   encryptedPayerKeypair,
//   password,
//   programName
// }) {
//   let tmpDirs = [];

//   try {
//     const programKP = writeTempKeypair(
//       encryptedProgramKeypair,
//       password,
//       "program"
//     );

//     const payerKP = writeTempKeypair(
//       encryptedPayerKeypair,
//       password,
//       "payer"
//     );

//     tmpDirs.push(programKP.tmpDir, payerKP.tmpDir);

//     await deployProgramCLI({
//       rpcUrl,
//       soPath,
//       programKeypairPath: programKP.keypairPath,
//       payerKeypairPath: payerKP.keypairPath,
//       onLog: console.log
//     });

//     console.log("✅ Deploy successful");
//   } catch (err) {
//     const seed = extractSeedPhrase(err.message);
//     if (seed) {
//       saveRecoverySeed(seed, programName);
//       console.error("⚠️ Recovery seed saved");
//     }
//     throw err;
//   } finally {
//     // 🔥 secure cleanup
//     tmpDirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true }));
//   }
// }


router.post("/execute", async (req, res) => {
  const { signerFile, programFile, programName, rpcUrl, computeUnitPrice, programId } = req.body;
  let tmpDirs = [];

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

    if (!fs.existsSync(signerPath) || !fs.existsSync(programPath) || !fs.existsSync(programKeyPath)) {
      return res.status(400).json({ error: "Signer, program, or program key file not found" });
    }

    const programKP = writeTempKeypair(
        programKeyPath,
        process.env.ENCODE_SALT,
        "program"
    );

    const payerKP = writeTempKeypair(
        signerPath,
        process.env.ENCODE_SALT,
        "payer"
    );

    tmpDirs.push(programKP.tmpDir, payerKP.tmpDir);


    // Build CLI args
    const args = [
      "program",
      "deploy",
      "--url",
      rpcUrl || "https://api.devnet.solana.com",
      "--max-sign-attempts",
      "60",
      "--program-id",
      programKP.keypairPath,
      "--fee-payer",
      payerKP.keypairPath,
      "--upgrade-authority",
      payerKP.keypairPath,
    ];

    if (computeUnitPrice) args.push("--with-compute-unit-price", computeUnitPrice.toString());

    args.push(programPath);


    await deployProgramCLI({
        args,
        rpcUrl,
        programPath,
        programKeypairPath: programKP.keypairPath,
        payerKeypairPath: payerKP.keypairPath,
        onLog: console.log
    });

    console.log("✅ Deploy successful");


    res.json({
        success: true,
        output: stdout,
        cliCommands: { deploy: deployCmd, logs: logsCmd, account: accountCmd }
    });
    // });
  } catch (err) {
    console.error(err);
    const seed = extractSeedPhrase(err.message);
    if (seed) {
        saveRecoverySeed(seed, programName);
    }

    res.status(500).json({ error: err.message });
  }
  finally {
    // 🔥 secure cleanup
    tmpDirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true }));
  }
});

module.exports = router;
