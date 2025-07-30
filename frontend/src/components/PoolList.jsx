import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import AddLiquidityModal from './AddLiquidityModal';

const PoolList = () => {
  const { provider, account } = useWeb3();
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);

  // Адрес фабрики пулов (замените на реальный адрес после деплоя)
  const factoryAddress = "YOUR_POOL_FACTORY_CONTRACT_ADDRESS";

  // Функция для получения списка пулов с фабрики
  const fetchPools = async () => {
    if (!provider) {
      setPools([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // АБИ фабрики пулов (замените на реальное АБИ)
      const factoryABI = [
        "function getPools() external view returns (address[])"
      ];

      // Создаем экземпляр контракта фабрики
      const factory = new ethers.Contract(factoryAddress, factoryABI, provider);

      // Получаем список адресов пулов
      const poolAddresses = await factory.getPools();
      console.log("Полученные адреса пулов:", poolAddresses);

      // Здесь нужно получить детали каждого пула (токены, комиссия и т.д.)
      // Это заглушка, замените на реальную логику
      const mockPools = [
        { id: 1, token0: "TokenA", token1: "TokenB", fee: "0.3%" },
        { id: 2, token0: "TokenC", token1: "TokenD", fee: "1%" },
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

  // Функция для открытия модального окна добавления ликвидности
  const openAddLiquidityModal = (pool) => {
    setSelectedPool(pool);
    setIsModalOpen(true);
  };

  // Функция для закрытия модального окна
  const closeAddLiquidityModal = () => {
    setIsModalOpen(false);
    setSelectedPool(null);
  };

  // Функция для перехода на страницу обмена
  const handleSwapClick = () => {
    // navigate('/swap'); // Используйте useNavigate из react-router-dom
    console.log("Переход на страницу обмена");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Список пулов</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>Пулы не найдены</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Токен 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Токен 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Комиссия
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pools.map((pool) => (
                <tr key={pool.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pool.token0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pool.token1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pool.fee}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openAddLiquidityModal(pool)}
                      className="text-cyan-600 hover:text-cyan-900 mr-3"
                    >
                      Добавить
                    </button>
                    <button
                      onClick={handleSwapClick}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Обменять
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && selectedPool && (
        <AddLiquidityModal pool={selectedPool} onClose={closeAddLiquidityModal} />
      )}
    </div>
  );
};

export default PoolList;