"use client";
import React, { useEffect, useState } from "react";
import { useProgram } from "@/components/solana/useProgram";
import { useAppContext } from "./appcontext";
import CustomWalletButton from "./solana/CustomWalletButton";
import API from "./api";

export default function ProgramMethods() {
  const { selectedProgram } = useAppContext();

  const { program, idl, connected, publicKey } = useProgram(
    selectedProgram?.publicKey,
    selectedProgram?.name
  );

  const [inputs, setInputs] = useState({});
  const [txStatus, setTxStatus] = useState("");

  useEffect(() => {
    if (!idl) return;

    // Initialize inputs state for each instruction
    const initInputs = {};
    idl.instructions.forEach((ix) => {
      initInputs[ix.name] = {
        args: {},
        accounts: {},
      };
      ix.args.forEach((arg) => {
        initInputs[ix.name].args[arg.name] = "";
      });
      ix.accounts.forEach((acc) => {
        initInputs[ix.name].accounts[acc.name] = "";
      });
    });
    setInputs(initInputs);
  }, [idl]);

  const handleChange = (ixName, type, name, value) => {
    setInputs((prev) => ({
      ...prev,
      [ixName]: {
        ...prev[ixName],
        [type]: {
          ...prev[ixName][type],
          [name]: value,
        },
      },
    }));
  };

  const handleCallMethod = async (ix) => {
    if (!program) return;

    try {
      setTxStatus("Sending transaction...");

      const ixInputs = inputs[ix.name];
      const argValues = ix.args.map((arg) => ixInputs.args[arg.name]);
      const accounts = {};
      ix.accounts.forEach((acc) => {
        accounts[acc.name] = ixInputs.accounts[acc.name];
      });

      const txSig = await program.methods[ix.name](...argValues)
        .accounts(accounts)
        .rpc();

      setTxStatus(`Transaction sent: ${txSig}`);
    } catch (err) {
      console.error(err);
      setTxStatus(`Error: ${err.message}`);
    }
  };

  if (!selectedProgram) return <p>⚡ Select a program</p>;
  if (!idl) return <p>Loading IDL…</p>;

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Methods in {selectedProgram.name}</h3>
      <ul>
        {idl.instructions.map((ix, i) => (
          <li key={i} style={{ marginBottom: "20px" }}>
            <b>{ix.name}</b>
            <div style={{ marginLeft: "15px" }}>
              <h4>Accounts:</h4>
              {ix.accounts.map((acc) => (
                <div key={acc.name} style={{ marginBottom: 4 }}>
                  <label>{acc.name}: </label>
                  <input
                    type="text"
                    value={inputs[ix.name]?.accounts[acc.name] || ""}
                    onChange={(e) =>
                      handleChange(ix.name, "accounts", acc.name, e.target.value)
                    }
                    placeholder={acc.isSigner ? "signer pubkey" : "readonly pubkey"}
                  />
                </div>
              ))}
              <h4>Arguments:</h4>
              {ix.args.map((arg) => (
                <div key={arg.name} style={{ marginBottom: 4 }}>
                  <label>{arg.name}: </label>
                  <input
                    type="text"
                    value={inputs[ix.name]?.args[arg.name] || ""}
                    onChange={(e) =>
                      handleChange(ix.name, "args", arg.name, e.target.value)
                    }
                    placeholder={JSON.stringify(arg.type)}
                  />
                </div>
              ))}
              <button onClick={() => handleCallMethod(ix)}>Call Method</button>
            </div>
          </li>
        ))}
      </ul>
      {txStatus && <p>{txStatus}</p>}
    </div>
  );
}
