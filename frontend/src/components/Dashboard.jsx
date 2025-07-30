import React, { useState } from 'react';
// Импортируем компоненты напрямую, как в исходном контексте
import WalletTokens from './WalletTokens';
import PoolsList from './PoolsList';
import TokenVault from './TokenVault';
// Убран CreatePoolModal, так как он не импортировался в исходном контексте

const Dashboard = () => {
  // Устанавливаем 'wallet' как активную вкладку по умолчанию
  const [activeTab, setActiveTab] = useState('wallet');
  // Убрано состояние isModalOpen, так как модальное окно не используется напрямую здесь

  // Убраны функции openCreatePoolModal и closeCreatePoolModal

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
            {/* Заголовок секции пулов */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Пулы ликвидности</h1>
                <p className="mt-2 text-gray-400">Управляйте своими позициями в пулах ликвидности</p>
              </div>
              {/* Кнопка создания пула убрана, так как логика в PoolsList */}
            </div>
            <PoolsList />
          </div>
        )}
        {activeTab === 'vault' && <TokenVault />}

        {/* Убран рендер CreatePoolModal */}
      </div>
    </div>
  );
};

export default Dashboard;