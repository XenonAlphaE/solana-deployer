"use client";

import React, { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Import the wallet adapter styles
function getRandomItemFromArray(input, defaultValue = null) {
  // Check if input is undefined or null (falsy)
  if (input === undefined || input === null) {
    throw new TypeError('Input cannot be undefined or null');
  }

  // Convert input to an array (if not already)
  const list = Array.isArray(input) ? input : [input];

  // Check if the array is empty
  if (list.length === 0) {
    return defaultValue;
  }

  // Get a random index within the list length
  const randomIndex = Math.floor(Math.random() * list.length);

  // Return the item at the random index
  return list[randomIndex];
}

export const SolanaWalletProvider = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  // const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint
  // const endpoint = useMemo(() => getRandomItemFromArray(
  //   [
  //     clusterApiUrl(network),
      // "https://go.getblock.us/a2284a3e911549ffa562b421e16cd432",
      // "https://go.getblock.us/c3aec99ad5454bbd80b37defd30c9614",
      // "https://go.getblock.us/62d6be763288468bb5c88c2b25e37604",
      // "https://go.getblock.us/644d658f5cd34a489a6223e1a3597bbf"
  //   ]
  // ), [network]);

  const endpoint = useMemo(
    () =>
      getRandomItemFromArray([
        clusterApiUrl(WalletAdapterNetwork.Devnet),
        "https://api.devnet.solana.com",
        // optional backup devnet RPCs
      ]),
    []
  );


  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
