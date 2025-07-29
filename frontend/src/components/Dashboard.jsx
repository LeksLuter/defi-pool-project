import React, { useState } from 'react';
import PoolList from './PoolList';
import CreatePoolModal from './CreatePoolModal';
import Vault from './Vault';
import WalletTokens from './WalletTokens';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('pools');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreatePoolModal = () => {
    setIsModalOpen(true);
  };

  const closeCreatePoolModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
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
        {activeTab === 'pools' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Пулы ликвидности</h2>
              <button
                onClick={openCreatePoolModal}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
              >
                Создать пул
              </button>
            </div>
            <PoolList />
          </div>
        )}
        {activeTab === 'vault' && <Vault />}
        {activeTab === 'wallet' && <WalletTokens />}
      </div>

      {/* Модальное окно создания пула */}
      {isModalOpen && (
        <CreatePoolModal onClose={closeCreatePoolModal} />
      )}
    </div>
  );
};

export default Dashboard;