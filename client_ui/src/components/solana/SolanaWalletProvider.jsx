"use client";

import React, { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { getRandomItemFromArray, mainRpcUrls } from '../utils'


export const SolanaWalletProvider = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => getRandomItemFromArray(
    mainRpcUrls
  ), [network]);

  // const endpoint = useMemo(
  //   () =>
  //     getRandomItemFromArray([
  //       clusterApiUrl(WalletAdapterNetwork.Devnet),
  //       "https://api.devnet.solana.com",
  //       // optional backup devnet RPCs
  //     ]),
  //   []
  // );


  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
