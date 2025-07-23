import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Dashboard from "./components/Dashboard";
import ConnectWallet from "./components/ConnectWallet";
import DisconnectWallet from "./components/DisconnectWallet";
import { useWeb3 } from "./context/Web3Context";
import "./App.css";

function App() {
  const { account } = useWeb3();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-indigo-600">DeFi Pool</h1>
            <div className="flex items-center space-x-4">
              {account ? (
                <>
                  <span className="text-sm text-gray-600">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                  <DisconnectWallet />
                </>
              ) : (
                <ConnectWallet />
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;