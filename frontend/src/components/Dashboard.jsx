import React, { useState } from 'react';
import CreatePoolModal from './CreatePoolModal';
import PoolList from './PoolList';
import Vault from './Vault';

const Dashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreatePoolModal = () => {
    setIsModalOpen(true);
  };

  const closeCreatePoolModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white py-8 px-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Дашборд</h1>
          <button
            onClick={openCreatePoolModal}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
          >
            Создать пул
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Пулы ликвидности</h2>
            <PoolList />
          </div>

          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Хранилище токенов</h2>
            <Vault />
          </div>
        </div>

        {isModalOpen && <CreatePoolModal onClose={closeCreatePoolModal} />}
      </div>
    </div>
  );
};

export default Dashboard;