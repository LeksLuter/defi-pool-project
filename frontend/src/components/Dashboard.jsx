import React, { useState } from 'react';
import PoolList from './PoolList';
import AddLiquidity from './AddLiquidity';
import SwapTokens from './SwapTokens';
import Vault from './Vault';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('pools');

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900">
      <div className="container mx-auto">
        {/* Заголовок дашборда */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Дашборд</h1>
          <p className="text-lg text-gray-300">Управляйте своими активами и ликвидностью</p>
        </div>

        {/* Навигация по вкладкам */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 p-1 bg-gray-800 bg-opacity-50 rounded-xl backdrop-blur-sm border border-gray-700 inline-flex">
            <button
              onClick={() => setActiveTab('pools')}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'pools'
                ? 'bg-gray-700 text-cyan-400 shadow'
                : 'text-gray-300 hover:text-white hover:bg-gray-700 hover:bg-opacity-30'
                }`}
            >
              Пулы ликвидности
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'vault'
                ? 'bg-gray-700 text-cyan-400 shadow'
                : 'text-gray-300 hover:text-white hover:bg-gray-700 hover:bg-opacity-30'
                }`}
            >
              Хранилище токенов
            </button>
            <button
              onClick={() => setActiveTab('swap')}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'swap'
                ? 'bg-gray-700 text-cyan-400 shadow'
                : 'text-gray-300 hover:text-white hover:bg-gray-700 hover:bg-opacity-30'
                }`}
            >
              Обмен токенов
            </button>
          </div>
        </div>

        {/* Контент вкладок */}
        <div className="bg-gray-800 bg-opacity-50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700 shadow-xl">
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
    </div>
  );
};

export default Dashboard;