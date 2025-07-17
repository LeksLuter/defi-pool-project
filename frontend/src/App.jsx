import React from "react";
import Hero from "./components/Hero";
import ConnectWallet from "./components/ConnectWallet";
import Dashboard from "./components/Dashboard";
import { Web3Provider } from "./context/Web3Context"; // ✅ Импортируем Web3Provider

function App() {
  return (
    <Web3Provider> {/* ✅ Обёртываем App в Web3Provider */}
      <div className="min-h-screen bg-gray-50">
        <Hero />
        <ConnectWallet />
        <Dashboard />
      </div>
    </Web3Provider>
  );
}

export default App;