import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import AddLiquidityModal from './AddLiquidityModal';
import CreatePoolModal from './CreatePoolModal'; // Импортируем модальное окно создания пула
import { ethers } from 'ethers';

const PoolsList = () => {
  const { provider, account, isAdmin } = useWeb3();
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatePoolModalOpen, setIsCreatePoolModalOpen] = useState(false); // Состояние для модального окна создания пула
  const [selectedPool, setSelectedPool] = useState(null);

  // Функция для получения пулов с фабрики
  const fetchPools = async () => {
    if (!provider) {
      setPools([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // TODO: Замените на реальный адрес фабрики и ABI
      const factoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      const factoryABI = ["function getPools() view returns (address[])"];
      const factory = new ethers.Contract(factoryAddress, factoryABI, provider);

      // TODO: Получите адреса пулов и информацию о каждом пуле (токены, комиссия)
      // Это заглушка, замените на реальную логику
      const poolAddresses = await factory.getPools();
      console.log("Полученные адреса пулов:", poolAddresses);

      // Пример данных, замените на данные из реальных контрактов
      const mockPools = [
        { id: 1, token0: "TokenA", token1: "TokenB", fee: "0.3%", address: "0x..." },
        { id: 2, token0: "TokenC", token1: "TokenD", fee: "1%", address: "0x..." },
        // Добавьте больше пулов по мере необходимости
      ];
      setPools(mockPools);
    } catch (err) {
      console.error("Ошибка при получении пулов:", err);
      setError(`Не удалось получить список пулов: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, [provider]);

  const openAddLiquidityModal = (pool) => {
    setSelectedPool(pool);
    setIsModalOpen(true);
  };

  const closeAddLiquidityModal = () => {
    setIsModalOpen(false);
    setSelectedPool(null);
  };

  // Функции для открытия/закрытия модального окна создания пула
  const openCreatePoolModal = () => {
    setIsCreatePoolModalOpen(true);
  };

  const closeCreatePoolModal = () => {
    setIsCreatePoolModalOpen(false);
  };

  const handleSwapClick = (pool) => {
    console.log("Обменять в пуле:", pool);
    alert(`Функция обмена для пула ${pool.token0}/${pool.token1} будет реализована`);
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
            onClick={openCreatePoolModal}
            className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition shadow-lg"
          >
            Создать пул
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded mb-6">
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : pools.length === 0 ? (
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
                      onClick={() => handleSwapClick(pool)}
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

        {/* Модальное окно создания пула */}
        {isCreatePoolModalOpen && (
          <CreatePoolModal
            onClose={closeCreatePoolModal}
          />
        )}
      </div>
    </div>
  );
};

export default PoolsList;