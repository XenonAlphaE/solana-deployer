import React from 'react';
import { AppContextProvider } from '@/components/appcontext';
import App from '@/components/App';
import { SolanaWalletProvider } from '@/components/solana/SolanaWalletProvider';


export default function Home() {
  return (
    <React.StrictMode>
      <AppContextProvider>
        <SolanaWalletProvider>
          <App/>
        </SolanaWalletProvider>
      </AppContextProvider>
  </React.StrictMode>
  );
}
