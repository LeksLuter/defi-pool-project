import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import AddLiquidityModal from './AddLiquidityModal'; // Импортируем модальное окно

const PoolList = () => {
  const { provider } = useWeb3();
  const navigate = useNavigate();
  const [pools, setPools] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // Состояние для модального окна
  const [selectedPool, setSelectedPool] = useState(null); // Выбранный пул

  // Здесь будет логика получения списка пулов
  // Пока что показываем заглушку
  useEffect(() => {
    if (provider) {
      // Получение списка пулов с фабрики
      // Это пример, вам нужно будет реализовать реальную логику
      setPools([
        { id: 1, token0: "TokenA", token1: "TokenB", fee: "0.3%" },
        { id: 2, token0: "TokenC", token1: "TokenD", fee: "1%" }
      ]);
    }
  }, [provider]);

  // Функция для открытия модального окна
  const openAddLiquidityModal = (pool) => {
    setSelectedPool(pool);
    setIsModalOpen(true);
  };

  // Функция для закрытия модального окна
  const closeAddLiquidityModal = () => {
    setIsModalOpen(false);
    setSelectedPool(null);
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Пулы ликвидности</h1>
            <p className="mt-2 text-gray-400">Управляйте своими позициями в пулах ликвидности</p>
          </div>
          {/* Кнопка "Создать пул" для всех пользователей */}
          <button
            onClick={() => navigate('/create-pool')}
            className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition shadow-lg"
          >
            Создать пул
          </button>
        </div>

        {pools.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-xl text-gray-400">Пулы не найдены</p>
            <p className="mt-2 text-gray-500">Станьте первым, кто создаст пул!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool) => (
              <div key={pool.id} className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white">{pool.token0}/{pool.token1}</h3>
                      <p className="text-cyan-400 font-medium">{pool.fee} комиссия</p>
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={() => openAddLiquidityModal(pool)}
                      className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                    >
                      Добавить
                    </button>
                    <button
                      onClick={() => console.log("Обменять в пуле:", pool)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                    >
                      Обменять
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Модальное окно добавления ликвидности */}
        {isModalOpen && selectedPool && (
          <AddLiquidityModal
            pool={selectedPool}
            onClose={closeAddLiquidityModal}
          />
        )}
      </div>
    </div>
  );
};

export default PoolList;