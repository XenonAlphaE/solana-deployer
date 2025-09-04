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
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => getRandomItemFromArray(
    [
      clusterApiUrl(network),
        "https://solana-mainnet.gateway.tatum.io?apiKey=t-68022a161d6adc97b405eb25-25e1aae7d44a4547a7c0ae38",
        "https://muddy-wider-patina.solana-mainnet.quiknode.pro/568cabf5f00a3439934ac00ad5d411fb74db5935",
        "https://solana-mainnet.api.syndica.io/api-key/38SE3KS6MeKGTC1CtsUQpZPG9oRs3Xty5ZG6B48u6WTK2PCv6MRqpbSAQx8x8J1fMyTZh5Kvahgye3Fc61Ec4HC6gt16nj3t66X"
    ]
  ), [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
