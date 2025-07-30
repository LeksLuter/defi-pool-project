import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const CreatePoolModal = ({ onClose }) => {
  const { signer, account, isAdmin } = useWeb3();
  const [token0, setToken0] = useState('');
  const [token1, setToken1] = useState('');
  const [feeRate, setFeeRate] = useState('30'); // 0.3% по умолчанию
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Адрес фабрики пулов (замените на реальный адрес после деплоя)
  const factoryAddress = "YOUR_POOL_FACTORY_CONTRACT_ADDRESS";

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
    if (token0 === token1) {
      setStatus('Адреса токенов не могут совпадать');
      return;
    }

    setIsLoading(true);
    setStatus('Создание пула...');

    try {
      // АБИ фабрики пулов (замените на реальное АБИ)
      const factoryABI = [
        "function createPool(address token0, address token1, uint256 feeRate) external returns (address)"
      ];

      // Создаем экземпляр контракта фабрики
      const factory = new ethers.Contract(factoryAddress, factoryABI, signer);

      // Выполняем транзакцию создания пула
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

  // Отображаем форму всем пользователям
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">Создать новый пул</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
              aria-label="Закрыть"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="0x..."
                required
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="0x..."
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Комиссия (в базисных пунктах, 30 = 0.3%)
              </label>
              <input
                type="number"
                value={feeRate}
                onChange={(e) => setFeeRate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="30"
                min="1"
                max="10000"
                required
              />
            </div>

            {status && (
              <div className="mb-4 p-3 bg-gray-700 bg-opacity-50 rounded-lg text-center">
                <p className="text-sm text-white">{status}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg transition ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:from-cyan-600 hover:to-blue-600'}`}
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