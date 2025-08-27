"use client";
import React, { useEffect, useState } from "react";
import { useProgram } from "@/components/solana/useProgram";
import { useAppContext } from "./appcontext";
import { PublicKey } from "@solana/web3.js";

import CustomWalletButton from "./solana/CustomWalletButton";
import API from "./api";
import { parseIdlValue } from "./solana/inputUtil";

export default function ProgramMethods() {
  const { selectedProgram } = useAppContext();

  const { program, idl, calculatedAccounts, programInfo,allAccounts, connected, publicKey } = useProgram(
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
      const argValues = ix.args.map((arg) => {
        const raw = ixInputs.args[arg.name];
        debugger
        return parseIdlValue(raw, arg['type']);

      });
      debugger
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
      
      {JSON.stringify(calculatedAccounts)}
      <hr />
      {JSON.stringify(programInfo)}
      <hr />
      {JSON.stringify(allAccounts)}
      <hr />
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
              {ix.args.map((arg) => {
                const value = inputs[ix.name]?.args[arg.name] || 
                              (arg.type.vec ? [] : "");

                // Handle vec<publicKey>
                if (arg.type?.vec === "publicKey") {
                  return (
                    <div key={arg.name} style={{ marginBottom: 8 }}>
                      <label>{arg.name} (array of pubkeys): </label>
                      {(value || []).map((pubkey, idx) => (
                        <div key={idx} style={{ display: "flex", marginBottom: 4 }}>
                          <input
                            type="text"
                            value={pubkey}
                            onChange={(e) => {
                              const newArr = [...value];
                              newArr[idx] = e.target.value;
                              handleChange(ix.name, "args", arg.name, newArr);
                            }}
                            placeholder="PublicKey"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newArr = value.filter((_, i) => i !== idx);
                              handleChange(ix.name, "args", arg.name, newArr);
                            }}
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          handleChange(ix.name, "args", arg.name, [...value, ""]);
                        }}
                      >
                        ➕ Add pubkey
                      </button>
                    </div>
                  );
                }

                // Fallback to normal single input
                return (
                  <div key={arg.name} style={{ marginBottom: 4 }}>
                    <label>{arg.name}: </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleChange(ix.name, "args", arg.name, e.target.value)}
                      placeholder={JSON.stringify(arg.type)}
                    />
                  </div>
                );
              })}
              <button onClick={() => handleCallMethod(ix)}>Call Method</button>
            </div>
          </li>
        ))}
      </ul>
      {txStatus && <p>{txStatus}</p>}
    </div>
  );
}
