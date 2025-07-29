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

    if (!account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }

    if (!isAdmin) {
      setStatus('Только администратор может создавать пулы');
      return;
    }

    if (!token0 || !token1) {
      setStatus('Пожалуйста, введите адреса обоих токенов');
      return;
    }

    if (token0.toLowerCase() === token1.toLowerCase()) {
      setStatus('Адреса токенов должны быть разными');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Создание пула...');

      // Здесь должна быть логика создания пула через фабрику
      // Пример:
      // const factoryAddress = "АДРЕС_ФАБРИКИ";
      // const PoolFactory = new ethers.Contract(factoryAddress, factoryABI, signer);
      // const tx = await PoolFactory.createPool(token0, token1, feeRate);
      // await tx.wait();

      // Для демонстрации просто имитируем задержку
      await new Promise(resolve => setTimeout(resolve, 2000));

      setStatus('Пул успешно создан!');

      // Очищаем форму после успешного создания
      setToken0('');
      setToken1('');
      setFeeRate('30');

      // Закрываем модальное окно через 1.5 секунды
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Ошибка создания пула:", error);
      setStatus(`Ошибка: ${error.message || 'Не удалось создать пул'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Создать новый пул</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form onSubmit={handleCreatePool} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Адрес токена 1 (Token0)
            </label>
            <input
              type="text"
              value={token0}
              onChange={(e) => setToken0(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="0x..."
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Адрес токена 2 (Token1)
            </label>
            <input
              type="text"
              value={token1}
              onChange={(e) => setToken1(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="0x..."
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Комиссия
            </label>
            <select
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={isLoading}
            >
              <option className="bg-gray-800" value="5">0.05% (5)</option>
              <option className="bg-gray-800" value="30">0.3% (30)</option>
              <option className="bg-gray-800" value="100">1% (100)</option>
            </select>
          </div>

          {status && (
            <div className={`text-sm p-2 rounded ${status.includes('Ошибка') || status.includes('Пожалуйста')
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
  );
};

export default CreatePoolModal;