import React from "react";
import Hero from "./components/Hero";
import Dashboard from "./components/Dashboard";
import ConnectWallet from "./components/ConnectWallet";
import { useWeb3 } from "./context/Web3Context";

function App() {
  const { account, connect, poolContract, vaultContract } = useWeb3();

  return (
    <div className="min-h-screen bg-gray-50">
      {!account ? (
        <>
          <Hero />
          <ConnectWallet />
        </>
      ) : (
        <Dashboard account={account} poolContract={poolContract} vaultContract={vaultContract} />
      )}
    </div>
  );
}

export default App;