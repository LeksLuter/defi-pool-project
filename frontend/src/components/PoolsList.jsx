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

      // Пример данных, замените на данные из реальных конт랙тов
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

  // Обработчик для перехода к обмену (заглушка)
  const handleSwapClick = (pool) => {
    console.log("Переход к обмену для пула:", pool);
    // TODO: Реализуйте переход на страницу обмена
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 md:mb-0">Список пулов ликвидности</h2>
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
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">Пулы ликвидности не найдены</div>
            <button
              onClick={fetchPools}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Повторить попытку
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool) => (
              <div key={pool.id} className="bg-gray-700 bg-opacity-50 rounded-xl p-6 border border-gray-600 hover:border-cyan-500 transition">
                <div className="flex items-center">
                  <div className="bg-gray-600 border-2 border-dashed rounded-xl w-16 h-16" />
                  <div className="ml-4">
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