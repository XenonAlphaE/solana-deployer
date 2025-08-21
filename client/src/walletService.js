import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  setUpgradeAuthority,
  BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
} from "@solana/spl-governance"; // alt: construct instruction manually

// NOTE: You might need a helper that creates the instruction manually,
// since not all SDKs export `setUpgradeAuthority`

export async function sealProgram(wallet, programId) {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const programPubkey = new PublicKey(programId);

  // Build instruction: set new authority = null
  const ix = {
    keys: [
      { pubkey: programPubkey, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false }, // current authority
    ],
    programId: BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
    data: Buffer.from([4, 0, 0, 0]), // "SetAuthority" instruction layout
  };

  const tx = new Transaction().add(ix);
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // Sign + send with Phantom
  const signedTx = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  return sig;
}
