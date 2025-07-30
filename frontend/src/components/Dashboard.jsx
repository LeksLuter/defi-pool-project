import React, { useState } from 'react';
import WalletTokens from './WalletTokens';
import PoolsList from './PoolsList';
import TokenVault from './TokenVault';
import CreatePoolModal from './CreatePoolModal';

const Dashboard = () => {
  // Устанавливаем 'wallet' как активную вкладку по умолчанию
  const [activeTab, setActiveTab] = useState('wallet');
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
        {/* Навигация по вкладкам - "Кошелёк" теперь первая */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('wallet')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors duration-200 ${activeTab === 'wallet' ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                }`}
            >
              Кошелёк
            </button>
            <button
              onClick={() => setActiveTab('pools')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors duration-200 ${activeTab === 'pools' ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                }`}
            >
              Пулы ликвидности
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors duration-200 ${activeTab === 'vault' ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                }`}
            >
              Хранилище токенов
            </button>
          </div>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'wallet' && <WalletTokens />}
        {activeTab === 'pools' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Пулы ликвидности</h2>
              {/* Предполагается, что isAdmin доступен через Web3Context, как в контексте */}
              {/* <button
                onClick={openCreatePoolModal}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
              >
                Создать пул
              </button> */}
            </div>
            <PoolsList />
          </div>
        )}
        {activeTab === 'vault' && <TokenVault />}

        {isModalOpen && <CreatePoolModal onClose={closeCreatePoolModal} />}
      </div>
    </div>
  );
};

export default Dashboard;