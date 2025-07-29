import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import PoolList from './PoolList';
import AddLiquidity from './AddLiquidity';
import SwapTokens from './SwapTokens';
import Vault from './Vault';

const Dashboard = () => {
  const { account, isConnected } = useWeb3();
  const [activeTab, setActiveTab] = useState('pools');

  if (!isConnected) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold">Ошибка доступа</h2>
        <p className="mt-2 text-gray-400">Пожалуйста, подключите кошелек для доступа к дашборду.</p>
      </div>
    );
  }

  const getShortAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Приветствие и навигация */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Добро пожаловать, <span className="text-cyan-400">{getShortAddress(account)}</span>
        </h1>
        <p className="text-gray-400 mb-6">Управляйте своими активами и ликвидностью.</p>

        <div className="flex flex-wrap gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('pools')}
            className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'pools'
                ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            Пулы ликвидности
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'vault'
                ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            Хранилище токенов
          </button>
          <button
            onClick={() => setActiveTab('swap')}
            className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'swap'
                ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            Обмен токенов
          </button>
        </div>
      </div>

      {/* Контент вкладок */}
      <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
        {activeTab === 'pools' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PoolList />
            <AddLiquidity />
          </div>
        )}

        {activeTab === 'vault' && <Vault />}

        {activeTab === 'swap' && <SwapTokens />}
      </div>
    </div>
  );
};

export default Dashboard;