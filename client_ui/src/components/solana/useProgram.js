"use client";

import { useEffect, useState, useMemo } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3 } from "@project-serum/anchor";
import API from "../api";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";


export function useProgram(programId, programName) {
  const { publicKey, connected } = useWallet();
  const [program, setProgram] = useState(null);
  const [idl, setIdl] = useState(null);
  const [connection] = useState(() => new web3.Connection(web3.clusterApiUrl("devnet")));
  const [asyncCalculatedAccounts, setAsyncCalculatedAccounts] = useState({});
  const [programInfo, setProgramInfo] = useState(null);
  const anchorWallet =  useAnchorWallet();

  // Anchor/React code
  useEffect(() => {
    if (!program || !idl) return;

    const loadProgramInfo = async () => {
      try {
        const programId = program.programId;

        const info = {
          programId: programId.toBase58(),
          cluster: connection.rpcEndpoint,
          instructions: idl.instructions?.length || 0,
          accounts: idl.accounts?.map(acc => acc.name) || [],
          types: idl.types?.map(t => t.name) || [],
        };

        // Get program account
        const accountInfo = await connection.getAccountInfo(programId);
        if (accountInfo) {
          info.executable = accountInfo.executable;
          info.lamports = accountInfo.lamports / LAMPORTS_PER_SOL; // balance in SOL
          info.owner = accountInfo.owner.toBase58();
        }

        // Derive ProgramData PDA for upgradeable program
        const [programDataAddr] = PublicKey.findProgramAddressSync(
          [programId.toBytes()],
          new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
        );

        // const programDataAccount = await connection.getAccountInfo(programDataAddr);
        // if (programDataAccount) {
        //   // The authority pubkey is stored at offset 4 + 32 (skip enum + slot)
        //   const buf = programDataAccount.data;
        //   const AUTHORITY_OFFSET = 4 + 8 + 32; // tag(4) + slot(8) + programId(32)
        //   const authorityPubkey = new PublicKey(
        //     buf.slice(AUTHORITY_OFFSET, AUTHORITY_OFFSET + 32)
        //   );
        //   info.authority = authorityPubkey.toBase58();
        // }

        setProgramInfo(info);
      } catch (err) {
        console.error("Failed to load program info", err);
      }
    };

    loadProgramInfo();
  }, [program, idl, connection]);

  useEffect(() => {
    if (!programId) return;

    // Fetch IDL file for this program
    const loadIdl = async () => {
      try {
        const res = await API.get(`/api/idl/${programName}`);
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
    if (connected ) {
      const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: "processed" });
      prog = new Program(idl, programId, provider);
    } else {
      // Read-only program
      prog = new Program(idl, programId, { connection });
    }

    setProgram(prog);
  }, [idl, connected, programId, connection]);

  // Calculate accounts automatically
  const calculatedAccounts = useMemo(() => {
    if (!idl || !program || !publicKey) return {};

    const accountsMap = {};

    const [statePda, stateBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      program.programId
    );
    accountsMap['statePda'] = statePda
    accountsMap['systemProgram'] =  web3.SystemProgram.programId

    return accountsMap;
  }, [idl, program, publicKey]);

  // useEffect(() => {
  //   if (!idl || !program || !publicKey) return;

  //   const loadAsyncAccounts = async () => {
  //     const accountsMap = {};

  //     for (const ix of idl.instructions) {
  //       accountsMap[ix.name] = {};

  //       for (const acc of ix.accounts) {
  //         // Example: account derived from on-chain state
  //         if (acc.name === "statePda") {
  //           const [statePda, stateBump] = await web3.PublicKey.findProgramAddress(
  //             [Buffer.from("state")],
  //             program.programId
  //           );
  //           accountsMap[ix.name][acc.name] = statePda.toBase58();
  //         }

  //         // Example: ATA for a token vault
  //         if (acc.name === "vaultUsdtAta") {
  //           const ata = await getOrCreateAssociatedTokenAccount(
  //             program.provider.connection,
  //             program.provider.wallet.payer,
  //             usdtMintAddr,
  //             program.provider.wallet.publicKey
  //           );
  //           accountsMap[ix.name][acc.name] = ata.address.toBase58();
  //         }
  //       }
  //     }

  //     setAsyncCalculatedAccounts(accountsMap);
  //   };

  //   loadAsyncAccounts();
  // }, [idl, program, publicKey]);

  return {
    program,
    idl,
    connection,
    publicKey,
    connected,
    programInfo,  // 👈 new
    calculatedAccounts, // <-- added

  };
}
