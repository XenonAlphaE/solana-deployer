// routes/solana.js
const express = require("express");
const router = express.Router();
const { Connection, Keypair, clusterApiUrl } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount, mintTo, createMint } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

const KEYSTORE_DIR = path.join(process.cwd(), "uploads", "keystores");
const PROGRAM_DIR = path.join(process.cwd(), "uploads", "programs");
// Ensure folders exist
fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
fs.mkdirSync(PROGRAM_DIR, { recursive: true });


// Devnet connection
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// POST /api/mint-token
router.post("/mint", async (req, res) => {
    try {
        const { signerFile, decimals = 6, amount = 1000_000 } = req.body;
        const signerPath = path.join(KEYSTORE_DIR, signerFile);
        const signerSecret = new Uint8Array(JSON.parse(fs.readFileSync(signerPath)));
        const signer = Keypair.fromSecretKey(signerSecret);

        // Create the mint
        const mint = await createMint(
            connection,
            signer,
            signer.publicKey, // mint authority
            null,            // freeze authority
            decimals
        );

        console.log("Mint created:", mint.toBase58());

        // Create ATA for payer
        const ata = await getOrCreateAssociatedTokenAccount(
            connection,
            signer,
            mint,
            signer.publicKey
        );

        const rawAmount = BigInt(amount) * BigInt(10 ** decimals);


        // Mint tokens to payer's ATA
        await mintTo(
            connection,
            signer,
            mint,
            ata.address,
            signer,
            rawAmount // raw amount (consider decimals!)
        );

        res.json({
            mint: mint.toBase58(),
            ata: ata.address.toBase58(),
            amount,
            decimals,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
