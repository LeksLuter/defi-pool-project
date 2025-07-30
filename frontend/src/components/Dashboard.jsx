import React, { useState } from 'react';
import WalletTokens from './WalletTokens';
import PoolsList from './PoolList';
import TokenVault from './TokenVault';
import CreatePoolModal from './CreatePoolModal';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('portfolio'); // Устанавливаем 'portfolio' как активную вкладку по умолчанию
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreatePoolModal = () => {
    setIsModalOpen(true);
  };

  const closeCreatePoolModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto py-8 px-4">
        {/* Навигация по вкладкам */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 border-b border-gray-700">
            {/* Вкладка "Портфолио" */}
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors duration-200 ${activeTab === 'portfolio' ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/30'}`}
            >
              Портфолио
            </button>
            {/* Вкладка "Пулы ликвидности" */}
            <button
              onClick={() => setActiveTab('pools')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors duration-200 ${activeTab === 'pools' ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/30'}`}
            >
              Пулы ликвидности
            </button>
            {/* Вкладка "Хранилище токенов" */}
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors duration-200 ${activeTab === 'vault' ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/30'}`}
            >
              Хранилище токенов
            </button>
          </div>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'portfolio' && <WalletTokens />}
        {activeTab === 'pools' && (
          <div>
            <PoolsList openCreatePoolModal={openCreatePoolModal} />
          </div>
        )}
        {activeTab === 'vault' && <TokenVault />}

        {isModalOpen && <CreatePoolModal onClose={closeCreatePoolModal} />}
      </div>
    </div>
  );
};

export default Dashboard;