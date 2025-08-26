"use client";
import React, { useState, useCallback } from "react";
import {
  useWallet,
  useWalletModal,
} from "@solana/wallet-adapter-react";

// Basic styles for demo (you can replace with Tailwind, styled-components, etc.)
const styles = {
  overlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center"
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

export default function CustomWalletButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const [modalVisible, setModalVisible] = useState(false);

  const handleConnect = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return (
    <>
      {connected ? (
        <button onClick={handleDisconnect}>
          Disconnect ({publicKey.toBase58().slice(0, 4)}...
          {publicKey.toBase58().slice(-4)})
        </button>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
      <WalletDialog
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};
