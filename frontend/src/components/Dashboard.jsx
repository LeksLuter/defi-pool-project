import React, { useState } from 'react';
import PoolList from './PoolList';
import Vault from './Vault';
import WalletTokens from './WalletTokens'; // Возвращаем компонент кошелька
import CreatePoolForm from './CreatePoolForm'; // Оставляем создание пула

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('pools');

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Навигация по вкладкам */}
      <div className="mb-8">
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
          {/* Возвращаем вкладку "Кошелёк" */}
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'wallet'
              ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Кошелёк
          </button>
        </div>
      </div>
      {/* Контент вкладок */}
      <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
        {activeTab === 'pools' && (
          <div className="grid grid-cols-1">
            <div className="space-y-8">
              <PoolList />
              {/* Оставляем только список пулов и создание пула */}
              <CreatePoolForm />
            </div>
          </div>
        )}
        {activeTab === 'vault' && <Vault />}
        {/* Возвращаем контент вкладки "Кошелёк" */}
        {activeTab === 'wallet' && <WalletTokens />}
      </div>
    </div>
  );
};

export default Dashboard;