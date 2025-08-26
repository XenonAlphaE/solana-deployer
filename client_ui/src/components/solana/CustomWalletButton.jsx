"use client";
import React, { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// Basic styles (replace with Tailwind/styled-components if you want)
const styles = {
  overlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 50,
  },
  modal: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    minWidth: "300px"
  },
  walletBtn: {
    display: "block",
    width: "100%",
    padding: "10px",
    marginBottom: "8px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    textAlign: "left"
  }
};

// Wallet select dialog
const WalletDialog = ({ visible, onClose }) => {
  const { wallets, select } = useWallet();

  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Select a Wallet</h3>
        {wallets.map((wallet) => (
          <button
            key={wallet.adapter.name}
            style={styles.walletBtn}
            onClick={() => {
              select(wallet.adapter.name);
              onClose();
            }}
          >
            {wallet.adapter.name}
          </button>
        ))}
      </div>
    </div>
  );
};

// Connected wallet dialog (copy + disconnect)
const ConnectedDialog = ({ visible, onClose }) => {
  const { publicKey, disconnect } = useWallet();

  if (!visible || !publicKey) return null;

  const shortAddress =
    publicKey.toBase58().slice(0, 4) +
    "..." +
    publicKey.toBase58().slice(-4);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(publicKey.toBase58());
    alert("Address copied to clipboard!");
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Wallet Connected</h3>
        <p>{shortAddress}</p>
        <button style={styles.walletBtn} onClick={copyAddress}>
          Copy Address
        </button>
        <button
          style={{ ...styles.walletBtn, color: "red" }}
          onClick={() => {
            disconnect();
            onClose();
          }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};

export default function CustomWalletButton() {
  const { publicKey, connected } = useWallet();
  const [walletDialogVisible, setWalletDialogVisible] = useState(false);
  const [connectedDialogVisible, setConnectedDialogVisible] = useState(false);

  return (
    <>
      {connected ? (
        <button onClick={() => setConnectedDialogVisible(true)}>
          {publicKey.toBase58().slice(0, 4)}...
          {publicKey.toBase58().slice(-4)}
        </button>
      ) : (
        <button onClick={() => setWalletDialogVisible(true)}>
          Connect Wallet
        </button>
      )}

      {/* dialogs */}
      <WalletDialog
        visible={walletDialogVisible}
        onClose={() => setWalletDialogVisible(false)}
      />
      <ConnectedDialog
        visible={connectedDialogVisible}
        onClose={() => setConnectedDialogVisible(false)}
      />
    </>
  );
}
