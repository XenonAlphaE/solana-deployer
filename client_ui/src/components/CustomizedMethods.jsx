"use client";
import React, { useEffect, useState } from "react";
import { useProgram } from "@/components/solana/useProgram";
import { useAppContext } from "./appcontext";
import { parseIdlValue } from "./solana/inputUtil";
import { API, OraclePriceAPI } from "./api";

export default function CustomizedMethods() {
  const { selectedProgram } = useAppContext();

  const {
    program,
    idl,
    calculatedAccounts,
    programInfo,
    allAccounts,
    sendBuyWithOracle
  } = useProgram(selectedProgram?.publicKey, selectedProgram?.name);

  const specialMethods = ["buyWithSolOracle"];
  // 🟢 Define extra fields for specific methods
  const specialFields = {
    buyWithSolOracle: [
        { name: "symbol", type: "string" },
    ],
  };

  const [inputs, setInputs] = useState({});
  const [txStatus, setTxStatus] = useState("");
  const [expandedIx, setExpandedIx] = useState({}); // track collapse state

  useEffect(() => {
    if (!idl) return;

    const initInputs = {};
    const initExpanded = {};
    idl.instructions.forEach((ix) => {
      initInputs[ix.name] = { args: {}, accounts: {} };

      // normal IDL args
      ix.args.forEach((arg) => {
        initInputs[ix.name].args[arg.name] = "";
      });

      // 🟢 extra args for special methods
      if (specialFields[ix.name]) {
        specialFields[ix.name].forEach((arg) => {
          initInputs[ix.name].args[arg.name] = "";
        });
      }

      // accounts
      ix.accounts.forEach((acc) => {
        initInputs[ix.name].accounts[acc.name] = "";
      });

      initExpanded[ix.name] = false;
    });
    setInputs(initInputs);
    setExpandedIx(initExpanded);
  }, [idl]);

  const toggleExpand = (ixName) => {
    setExpandedIx((prev) => ({
      ...prev,
      [ixName]: !prev[ixName],
    }));
  };

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

  const callGenericMethod = async (ix, ixInputs) => {
    const argValues = ix.args.map((arg) =>
      parseIdlValue(ixInputs.args[arg.name], arg["type"])
    );

    const accounts = {};
    ix.accounts.forEach((acc) => {
      accounts[acc.name] = ixInputs.accounts[acc.name];
    });
    debugger
    return program.methods[ix.name](...argValues).accounts(accounts).rpc();
  };

  const specialHandlers = {
    buyWithSolOracle: async (ix, ixInputs) => {
        // merge args from IDL + specialFields if exists
        const allArgs = Array.from(
            new Map(
                [...ix.args, ...(specialFields[ix.name] || [])].map(arg => [arg.name, arg])
            ).values()
        );
    
        const signatureData = await OraclePriceAPI.post(
            "/api/solana/price",   // <-- must be string (relative path)
            {
            "symbol": ixInputs?.args?.['symbol'],
            "decimals": "6"
            }
        )

      const formattedValues = Object.fromEntries(
        allArgs.map((arg) => {
        let raw = ixInputs.args[arg.name];
        return [arg.name, parseIdlValue(raw, arg["type"])];
        })
      );

    
      const accounts = {};
      ix.accounts.forEach((acc) => {
        accounts[acc.name] = ixInputs.accounts[acc.name];
      });
      debugger
      await sendBuyWithOracle(
        {
        buyer : accounts['buyerInfo'],
        signatureData : signatureData?.data,  
        tokenSymbol :formattedValues['tokenSymbol'],
        amountLamports :formattedValues['amountLamports'],
        priceMicroUsd: formattedValues['priceMicroUsd'],
        timestamp :formattedValues['priceTimestamp'],
        accounts: accounts,
        }
      )
      return 
    },
  };

  const handleCallMethod = async (ix) => {
    if (!program) return;
    try {
      setTxStatus("Sending transaction...");
      const ixInputs = inputs[ix.name];
      let txSig;
      if (specialMethods.includes(ix.name) && specialHandlers[ix.name]) {
        txSig = await specialHandlers[ix.name](ix, ixInputs);
      } else {
        txSig = await callGenericMethod(ix, ixInputs);
      }
      setTxStatus(`✅ Transaction sent: ${txSig}`);
    } catch (err) {
      console.error(err);
      setTxStatus(`❌ Error: ${err.message}`);
    }
  };

  if (!selectedProgram) return <p>⚡ Select a program</p>;
  if (!idl) return <p>Loading IDL…</p>;

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Methods in {selectedProgram.name}</h3>
      <hr/>
        <ul className="space-y-1">
            {Object.entries(calculatedAccounts).map(([key, value]) => (
            <li key={key}>
                <span >{key} : </span>
                <span >
                {Array.isArray(value) ? `[${value.join(", ")}]` : String(value)}
                </span>
            </li>
            ))}
        </ul>      
      {JSON.stringify(programInfo)}
    <hr />
    <div>
    {Object.entries(allAccounts).map(([key, account], idx) => (
        <details key={idx} style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "6px", marginBottom: "6px" }}>
        <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
            {key}
        </summary>
        <pre style={{ fontSize: "0.9em", whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: "6px" }}>
            {JSON.stringify(account, null, 2)}
        </pre>
        </details>
    ))}
    </div>
    <hr />

      <ul style={{ listStyle: "none", padding: 0 }}>
        {idl.instructions.map((ix, i) => {
          // 🟢 merge IDL args with extra fields
            const combinedArgs = Array.from(
                new Map(
                    [...ix.args, ...(specialFields[ix.name] || [])].map(arg => [arg.name, arg])
                ).values()
            );

          return (
            <li
              key={i}
              style={{
                marginBottom: "10px",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "#f9f9f9",
                  cursor: "pointer",
                }}
                onClick={() => toggleExpand(ix.name)}
              >
                <b>{ix.name}</b>
                <span>{expandedIx[ix.name] ? "▾" : "▸"}</span>
              </div>

              {expandedIx[ix.name] && (
                <div style={{ padding: "10px 15px" }}>
                  <h4>Accounts:</h4>
                  {ix.accounts.map((acc) => (
                    <div key={acc.name} style={{ marginBottom: 4 }}>
                      <label>{acc.name}: </label>
                      <input
                        type="text"
                        value={inputs[ix.name]?.accounts[acc.name] || ""}
                        onChange={(e) =>
                          handleChange(
                            ix.name,
                            "accounts",
                            acc.name,
                            e.target.value
                          )
                        }
                        placeholder={
                          acc.isSigner ? "signer pubkey" : "readonly pubkey"
                        }
                      />
                    </div>
                  ))}

                  <h4>Arguments:</h4>
                  {combinedArgs.map((arg) => {
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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCallMethod(ix);
                    }}
                  >
                    Call Method
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {txStatus && <p>{txStatus}</p>}
    </div>
  );
}
