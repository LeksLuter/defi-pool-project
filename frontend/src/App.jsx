import React, { useState } from "react";
import Layout from "./components/Layout";
import ConnectWallet from "./components/ConnectWallet";
import PoolSelector from "./components/PoolSelector";
import LiquidityForm from "./components/LiquidityForm";
import SwapForm from "./components/SwapForm";
import PositionList from "./components/PositionList";
import CreatePoolForm from "./components/CreatePoolForm";
import { useWeb3 } from "./context/Web3Context";

function App() {
  const [selectedPool, setSelectedPool] = useState(null);
  const { account } = useWeb3();

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">DeFi Пул Ликвидности</h1>

        <ConnectWallet />

        <CreatePoolForm /> {/* Только админ видит через проверку */}

        <PoolSelector onSelectPool={setSelectedPool} />

        {selectedPool && (
          <>
            <LiquidityForm poolAddress={selectedPool.address} />
            <SwapForm poolAddress={selectedPool.address} />
            <PositionList poolAddress={selectedPool.address} />
          </>
        )}
      </div>
    </Layout>
  );
}

export default App;