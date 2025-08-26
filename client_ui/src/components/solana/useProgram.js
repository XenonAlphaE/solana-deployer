"use client";

import { useEffect, useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3 } from "@project-serum/anchor";
import API from "../api";

export function useProgram(programId, programName) {
  const { publicKey, connected, wallet } = useWallet();
  const [program, setProgram] = useState(null);
  const [idl, setIdl] = useState(null);
  const [connection] = useState(() => new web3.Connection(web3.clusterApiUrl("devnet")));
  const [asyncCalculatedAccounts, setAsyncCalculatedAccounts] = useState({});


  useEffect(() => {
    if (!programId) return;

    // Fetch IDL file for this program
    const loadIdl = async () => {
      try {
        const res = await API.get(`/api/idl/${programName}`);
        debugger
        setIdl(res?.data );
      } catch (err) {
        console.error("Failed to load IDL", err);
      }
    };

    loadIdl();
  }, [programId]);

  useEffect(() => {
    if (!idl) return;

    let prog;
    if (connected && wallet) {
      const provider = new AnchorProvider(connection, wallet, { preflightCommitment: "processed" });
      prog = new Program(idl, programId, provider);
    } else {
      // Read-only program
      prog = new Program(idl, programId, { connection });
    }

    setProgram(prog);
  }, [idl, connected, wallet, programId, connection]);

  // Calculate accounts automatically
  const calculatedAccounts = useMemo(() => {
    if (!idl || !program || !publicKey) return {};

    const accountsMap = {};
    idl.instructions.forEach((ix) => {
      accountsMap[ix.name] = {};
      ix.accounts.forEach((acc) => {
        // Example: if account is a PDA or can be derived
        if (acc.name === "someDerivedAccount") {
          // replace with your PDA derivation logic
          const [pda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("seed"), publicKey.toBuffer()],
            program.programId
          );
          accountsMap[ix.name][acc.name] = pda.toBase58();
        }
        // else leave undefined for user input
      });
    });

    return accountsMap;
  }, [idl, program, publicKey]);

  useEffect(() => {
    if (!idl || !program || !publicKey) return;

    const loadAsyncAccounts = async () => {
      const accountsMap = {};

      for (const ix of idl.instructions) {
        accountsMap[ix.name] = {};

        for (const acc of ix.accounts) {
          // Example: account derived from on-chain state
          if (acc.name === "statePda") {
            const [statePda, stateBump] = await web3.PublicKey.findProgramAddress(
              [Buffer.from("state")],
              program.programId
            );
            accountsMap[ix.name][acc.name] = statePda.toBase58();
          }

          // Example: ATA for a token vault
          if (acc.name === "vaultUsdtAta") {
            const ata = await getOrCreateAssociatedTokenAccount(
              program.provider.connection,
              program.provider.wallet.payer,
              usdtMintAddr,
              program.provider.wallet.publicKey
            );
            accountsMap[ix.name][acc.name] = ata.address.toBase58();
          }
        }
      }

      setAsyncCalculatedAccounts(accountsMap);
    };

    loadAsyncAccounts();
  }, [idl, program, publicKey]);

  return {
    program,
    idl,
    connection,
    publicKey,
    connected,
    calculatedAccounts, // <-- added

  };
}
