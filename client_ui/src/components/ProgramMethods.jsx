"use client";
import React, { useEffect, useState } from "react";
import { useAppContext } from "./appcontext";
import API from "./api";
import CustomWalletButton from "./solana/CustomWalletButton";

const ProgramMethods = () => {
  const { selectedProgram } = useAppContext();
  const [idl, setIdl] = useState(null);

  useEffect(() => {
    if (!selectedProgram) return;

    // Fetch IDL file for this program
    const loadIdl = async () => {
      try {
        const res =await API.get(`/api/idl/${selectedProgram?.name}`);
        debugger
        setIdl(res?.data );
      } catch (err) {
        console.error("Failed to load IDL", err);
      }
    };

    loadIdl();
  }, [selectedProgram]);

  if (!selectedProgram) {
    return <p>⚡ Select a program to see methods</p>;
  }

  if (!idl) {
    return <p>Loading IDL…</p>;
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Methods in {selectedProgram?.name}</h3>
      <ul>
        {idl?.instructions?.map((ix, i) => (
          <li key={i} style={{ marginBottom: "10px" }}>
            <b>{ix?.name}</b>
            <ul>
              {ix?.accounts.map((acc, j) => (
                <li key={j}>
                  Account: {acc.name} ({acc.isMut ? "mut" : "readonly"},{" "}
                  {acc.isSigner ? "signer" : "not signer"})
                </li>
              ))}
              {ix?.args.map((arg, k) => (
                <li key={k}>
                  Arg: {arg?.name} 
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProgramMethods;
