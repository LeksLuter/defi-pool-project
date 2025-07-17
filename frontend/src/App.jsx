import React from "react";
import Hero from "./components/Hero";
import ConnectWallet from "./components/ConnectWallet";
import Dashboard from "./components/Dashboard";
import { useWeb3 } from "./context/Web3Context";

function App() {
  const { account, poolContract, vaultContract } = useWeb3(); // ✅ Получаем из контекста

  return (
    <div className="min-h-screen bg-gray-50">
      {!account ? (
        <>
          <Hero />
          <ConnectWallet />
        </>
      ) : (
        // ✅ Передаём props в Dashboard
        <Dashboard
          account={account}
          poolContract={poolContract}
          vaultContract={vaultContract}
        />
      )}
    </div>
  );
}

export default App;