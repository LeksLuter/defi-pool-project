import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Импортируем useNavigate
import { useWeb3 } from '../context/Web3Context';

const PoolList = () => {
  const { provider } = useWeb3();
  const navigate = useNavigate(); // Хук для навигации
  const [pools, setPools] = useState([]);

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

  // Функция для перехода на страницу обмена
  const handleSwapClick = () => {
    navigate('/swap'); // Переход на маршрут обмена
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Список пулов</h2>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pools.map((pool) => (
              <tr key={pool.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{pool.token0}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{pool.token1}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{pool.fee}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                    Добавить ликвидность
                  </button>
                  {/* Кнопка обмена теперь ведет на отдельную страницу */}
                  <button
                    onClick={handleSwapClick}
                    className="text-green-600 hover:text-green-900"
                  >
                    Обменять
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PoolList;