const bs58 = require("bs58");
const fs = require("fs");
require("dotenv").config(); // Load environment variables

// 🔐 Base58 private key (64-byte secret key)
const BASE58_KEY = process.env.SECERT_KEY_BS58;

// Decode
const secretKey = bs58.default.decode(BASE58_KEY);

// Validate
if (secretKey.length !== 64) {
  throw new Error("Invalid secret key length. Expected 64 bytes.");
}

// Write JSON keypair
fs.writeFileSync(
  "keypair.json",
  JSON.stringify(Array.from(secretKey))
);

console.log("✅ keypair.json generated");
