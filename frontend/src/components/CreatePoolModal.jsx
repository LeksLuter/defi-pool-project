import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const CreatePoolModal = ({ onClose }) => {
  const { signer, account, isAdmin } = useWeb3();
  const [token0, setToken0] = useState('');
  const [token1, setToken1] = useState('');
  const [feeRate, setFeeRate] = useState('30'); // 0.3% по умолчанию
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreatePool = async (e) => {
    e.preventDefault();
    if (!signer || !account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }

    if (!isAdmin) {
      setStatus('Только администратор может создавать пулы');
      return;
    }

    if (!token0 || !token1) {
      setStatus('Пожалуйста, введите адреса токенов');
      return;
    }

    setIsLoading(true);
    setStatus('');

    try {
      // Импортируем ABI фабрики
      const factoryABI = [
        "function createPool(address token0, address token1, uint24 fee) returns (address)"
      ];

      // Адрес фабрики (замените на ваш реальный адрес)
      const factoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

      // Создаем экземпляр контракта фабрики
      const factory = new ethers.Contract(factoryAddress, factoryABI, signer);

      // Вызываем функцию создания пула
      const tx = await factory.createPool(token0, token1, feeRate);
      setStatus(`Транзакция отправлена: ${tx.hash}`);

      // Ждем подтверждения
      const receipt = await tx.wait();
      setStatus(`Пул успешно создан! Хэш: ${receipt.transactionHash}`);

      // Очищаем форму
      setToken0('');
      setToken1('');
      setFeeRate('30');
    } catch (error) {
      console.error('Ошибка при создании пула:', error);
      setStatus(`Ошибка: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Создать пул</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreatePool}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Адрес токена 1 (Token0)
              </label>
              <input
                type="text"
                value={token0}
                onChange={(e) => setToken0(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="0x..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Адрес токена 2 (Token1)
              </label>
              <input
                type="text"
                value={token1}
                onChange={(e) => setToken1(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="0x..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Комиссия (%)
              </label>
              <select
                value={feeRate}
                onChange={(e) => setFeeRate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {/* Убираем опцию 0.05% (value="5") */}
                <option className="bg-gray-800" value="30">0.3%</option>
                <option className="bg-gray-800" value="100">1%</option>
              </select>
            </div>

            {status && (
              <div className={`text-sm p-2 rounded mb-4 ${status.includes('Ошибка') || status.includes('Пожалуйста')
                  ? 'bg-red-900 bg-opacity-50 text-red-300'
                  : 'bg-green-900 bg-opacity-50 text-green-300'
                }`}>
                {status}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg transition ${isLoading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:from-cyan-600 hover:to-blue-600'
                }`}
            >
              {isLoading ? 'Создание...' : 'Создать пул'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePoolModal;