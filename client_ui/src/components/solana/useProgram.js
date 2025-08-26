"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3 } from "@project-serum/anchor";
import API from "../api";

export function useProgram(programId, programName) {
  const { publicKey, connected, wallet } = useWallet();
  const [program, setProgram] = useState(null);
  const [idl, setIdl] = useState(null);
  const [connection] = useState(() => new web3.Connection(web3.clusterApiUrl("devnet")));


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

  return {
    program,
    idl,
    connection,
    publicKey,
    connected,
  };
}
