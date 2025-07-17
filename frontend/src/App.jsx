import React from "react";
import Hero from "./components/Hero";
import Dashboard from "./components/Dashboard";
import ConnectWallet from "./components/ConnectWallet";
import { useWeb3 } from "./context/Web3Context";

function App() {
  const { account } = useWeb3(); // ✅ Убрали `connect`
  const poolAddress = process.env.POOL_ADDRESS;
  const vaultAddress = process.env.VAULT_ADDRESS;

  return (
    <div className="min-h-screen bg-gray-50">
      {!account ? (
        <>
          <Hero />
          <ConnectWallet />
        </>
      ) : (
        <Dashboard poolAddress={poolAddress} vaultAddress={vaultAddress} />
      )}
    </div>
  );
}

export default App;