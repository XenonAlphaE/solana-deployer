"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3 } from "@project-serum/anchor";
import bs58 from "bs58";
import BN from "bn.js";
import API , {OraclePriceAPI} from "../api";
import { LAMPORTS_PER_SOL, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY,SYSVAR_CLOCK_PUBKEY,
  Transaction,
  Ed25519Program,
 } from "@solana/web3.js";

function toCamelCase(name) {
  return name[0].toLowerCase() + name.slice(1);
}

export function useProgram(programId, programName) {
  const { publicKey, connected } = useWallet();
  const [program, setProgram] = useState(null);
  const [idl, setIdl] = useState(null);
  const [connection] = useState(() => new web3.Connection(web3.clusterApiUrl("devnet")));
  const [asyncCalculatedAccounts, setAsyncCalculatedAccounts] = useState({});
  const [programInfo, setProgramInfo] = useState(null);
  const anchorWallet =  useAnchorWallet();
  const [allAccounts, setAllAccounts] = useState([]);

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

  // Fetch all accounts owned by the program
  useEffect(() => {
    if (!program) return;

    const fetchAllAccounts = async () => {
      try {
        // Anchor convenience: fetch all accounts of a specific IDL type
        // If your IDL has defined accounts (like "state", "userAccount", etc.)
        const decodedAccounts = {};
        if (idl?.accounts) {
          for (const acc of idl.accounts) {
            const camelName = toCamelCase(acc.name); // normalize
            try {
              const all = await program.account[camelName].all();
              decodedAccounts[acc.name] = all.map(a => ({
                pubkey: a.publicKey.toBase58(),
                data: a.account,
              }));
            } catch (err) {
              console.warn(`Failed to fetch accounts for ${acc.name}`, err);
            }
          }
        }

        // Raw fallback: all accounts owned by this program
        const rawAccounts = await connection.getProgramAccounts(program.programId);
        const formattedRaw = rawAccounts.map(acc => ({
          pubkey: acc.pubkey.toBase58(),
          data: acc.account.data.toString("base64"),
          lamports: acc.account.lamports,
        }));

        setAllAccounts({ ...decodedAccounts, raw: formattedRaw });
      } catch (err) {
        console.error("Failed to fetch program accounts", err);
      }
    };

    fetchAllAccounts();
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
    accountsMap['SYSVAR_INSTRUCTIONS_PUBKEY'] = SYSVAR_INSTRUCTIONS_PUBKEY
    accountsMap['SYSVAR_CLOCK_PUBKEY'] = SYSVAR_CLOCK_PUBKEY
    return accountsMap;
  }, [idl, program, publicKey]);

  const sendBuyWithOracle = useCallback(
    async ({
      tokenSymbol,
      amountLamports,
      signatureData,
      accounts,
    }) => {
      if (!program) throw new Error("Program not initialized");
      debugger
      try {
        // 1. ed25519 verify ix
        const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
          publicKey: bs58.decode(signatureData?.pubkey),
          message: new Uint8Array(signatureData?.msg),
          signature:new Uint8Array(signatureData?.signature)
        });

        // 2. program ix
        const programIx = await program.methods
          .buyWithSolOracle(
            [...tokenSymbol],
            amountLamports,
            true,
            new BN(signatureData?.scaledPrice),
            new BN(signatureData?.timestamp),
            new Uint8Array(signatureData?.signature)
          )
          .accounts(accounts)
          .instruction();

          // 3. tx build
          const tx = new Transaction().add(ed25519Ix, programIx);
          tx.feePayer = anchorWallet.publicKey;
          tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

          // 4. let wallet sign
          const signedTx = await anchorWallet.signTransaction(tx);

          // 5. send
          const txid = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
          });

          return txid;
      } catch (err) {
        console.error("sendBuyWithOracle error", err);
        throw err;
      }
    },
    [program, connection, anchorWallet]
  );


  return {
    program,
    idl,
    connection,
    publicKey,
    connected,
    programInfo,  // 👈 new
    calculatedAccounts, // <-- added
    allAccounts,
    sendBuyWithOracle, // 👈 added

  };
}
