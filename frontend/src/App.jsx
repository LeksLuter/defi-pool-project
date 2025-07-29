import React from 'react';
import { Web3Provider } from './context/Web3Context';
import Header from './components/Header';
import PoolList from './components/PoolList';
import AddLiquidity from './components/AddLiquidity';
import SwapTokens from './components/SwapTokens';
import Vault from './components/Vault';

function App() {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container mx-auto py-8 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <PoolList />
            <AddLiquidity />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SwapTokens />
            <Vault />
          </div>
        </main>
      </div>
    </Web3Provider>
  );
}

export default App;