import { PublicKey } from "@solana/web3.js";


const PDA_RECIPES = {
  buyer: ({ buyerPubkey, tokenSymbol, programId }) => [
    Buffer.from("buyer___"),
    Buffer.from(tokenSymbol.padEnd(8, "\0")), // fixed length seed if needed
    new PublicKey(buyerPubkey).toBuffer(),
  ],
  vault: ({ tokenMint, programId }) => [
    Buffer.from("vault"),
    new PublicKey(tokenMint).toBuffer(),
  ],
  config: ({ programId }) => [
    Buffer.from("config"),
  ],
};


export function derivePda(type, params, programId) {
  if (!PDA_RECIPES[type]) {
    throw new Error(`Unknown PDA type: ${type}`);
  }
  const seeds = PDA_RECIPES[type]({ ...params, programId });
  return PublicKey.findProgramAddressSync(seeds, programId);
}


/**
 * Convert seed input to buffer
 */
function parseSeed(seed) {
  // If looks like a pubkey, treat as PublicKey
  try {
    if (seed.length > 30) { // rough check
      return new PublicKey(seed).toBuffer();
    }
  } catch (e) {}

  // Otherwise treat as string
  return Buffer.from(seed);
}

/**
 * Compute PDA
 */
export async function computePDA(seeds, programId) {
  const seedBuffers = seeds.map(parseSeed);
  const [pda, bump] = await PublicKey.findProgramAddress(seedBuffers, new PublicKey(programId));
  return { pda: pda.toBase58(), bump };
}
