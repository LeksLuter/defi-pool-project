import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AddLiquidityModal = ({ pool, onClose }) => {
  const { signer, account } = useWeb3();
  const [token0Amount, setToken0Amount] = useState('');
  const [token1Amount, setToken1Amount] = useState('');
  const [lowerPrice, setLowerPrice] = useState('');
  const [upperPrice, setUpperPrice] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    setStatus('Добавление ликвидности...');
    // Здесь будет логика добавления ликвидности
    console.log("Добавление ликвидности:", { pool, token0Amount, token1Amount, lowerPrice, upperPrice });

    // Имитация асинхронной операции
    setTimeout(() => {
      setStatus('Ликвидность успешно добавлена!');
      // Очищаем форму после успешного добавления
      setToken0Amount('');
      setToken1Amount('');
      setLowerPrice('');
      setUpperPrice('');
      setIsSubmitting(false);
      // Закрытие модального окна через 1.5 секунды после успеха
      setTimeout(onClose, 1500);
    }, 2000); // Имитация задержки 2 секунды

    // alert("Функция добавления ликвидности будет реализована");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 overflow-hidden">
        {/* Заголовок модального окна */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <h3 className="text-lg font-bold text-cyan-400">
            Добавить ликвидность в пул <span className="text-white">{pool.token0}/{pool.token1}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-full p-1"
            aria-label="Закрыть"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Содержимое формы */}
        <div className="px-6 py-5">
          <form onSubmit={handleAddLiquidity}>
            <div className="space-y-4">
              <div>
                <label htmlFor="token0Amount" className="block text-sm font-medium text-gray-300 mb-1">
                  Количество {pool.token0}
                </label>
                <input
                  type="number"
                  id="token0Amount"
                  value={token0Amount}
                  onChange={(e) => setToken0Amount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200"
                  placeholder="0.0"
                  step="any"
                  min="0"
                  required
                />
              </div>

              <div>
                <label htmlFor="token1Amount" className="block text-sm font-medium text-gray-300 mb-1">
                  Количество {pool.token1}
                </label>
                <input
                  type="number"
                  id="token1Amount"
                  value={token1Amount}
                  onChange={(e) => setToken1Amount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200"
                  placeholder="0.0"
                  step="any"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lowerPrice" className="block text-sm font-medium text-gray-300 mb-1">
                    Нижняя цена
                  </label>
                  <input
                    type="number"
                    id="lowerPrice"
                    value={lowerPrice}
                    onChange={(e) => setLowerPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200"
                    placeholder="0.0"
                    step="any"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="upperPrice" className="block text-sm font-medium text-gray-300 mb-1">
                    Верхняя цена
                  </label>
                  <input
                    type="number"
                    id="upperPrice"
                    value={upperPrice}
                    onChange={(e) => setUpperPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200"
                    placeholder="0.0"
                    step="any"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {status && (
              <div className={`mt-4 text-sm text-center px-4 py-2 rounded-lg ${status.includes('успешно') ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'}`}>
                {status}
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 ${isSubmitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg hover:shadow-cyan-500/20'}`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Обработка...
                  </span>
                ) : (
                  'Добавить ликвидность'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddLiquidityModal;