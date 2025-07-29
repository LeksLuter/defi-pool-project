import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AddLiquidityModal = ({ pool, onClose }) => {
  const { signer, account } = useWeb3();
  const [token0Amount, setToken0Amount] = useState('');
  const [token1Amount, setToken1Amount] = useState('');
  const [lowerPrice, setLowerPrice] = useState('');
  const [upperPrice, setUpperPrice] = useState('');
  const [status, setStatus] = useState('');

  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    if (!account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }
    if (!token0Amount || !token1Amount) {
      setStatus('Пожалуйста, введите количество токенов');
      return;
    }
    if (parseFloat(token0Amount) <= 0 || parseFloat(token1Amount) <= 0) {
      setStatus('Количество токенов должно быть больше 0');
      return;
    }

    setStatus('Добавление ликвидности...');
    // Здесь будет логика добавления ликвидности
    console.log("Добавление ликвидности:", {
      pool,
      token0Amount,
      token1Amount,
      lowerPrice,
      upperPrice
    });
    setStatus('Ликвидность успешно добавлена!');

    // Очищаем форму после успешного добавления
    setToken0Amount('');
    setToken1Amount('');
    setLowerPrice('');
    setUpperPrice('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Добавить ликвидность в пул {pool.token0}/{pool.token1}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleAddLiquidity} className="px-6 py-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество {pool.token0}
            </label>
            <input
              type="number"
              value={token0Amount}
              onChange={(e) => setToken0Amount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
              step="any"
              min="0"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество {pool.token1}
            </label>
            <input
              type="number"
              value={token1Amount}
              onChange={(e) => setToken1Amount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
              step="any"
              min="0"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Нижняя граница цены
              </label>
              <input
                type="number"
                value={lowerPrice}
                onChange={(e) => setLowerPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.0"
                step="any"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Верхняя граница цены
              </label>
              <input
                type="number"
                value={upperPrice}
                onChange={(e) => setUpperPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.0"
                step="any"
              />
            </div>
          </div>

          {status && (
            <div className={`mb-4 p-3 rounded-md text-sm ${status.includes('успешно')
                ? 'bg-green-100 text-green-700'
                : status.includes('Пожалуйста')
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
              {status}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Добавить ликвидность
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLiquidityModal;