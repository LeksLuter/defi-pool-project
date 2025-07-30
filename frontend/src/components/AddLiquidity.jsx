import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AddLiquidity = ({ pool, onClose }) => {
  const { signer, account } = useWeb3();
  const [token0Amount, setToken0Amount] = useState('');
  const [token1Amount, setToken1Amount] = useState(''); // Исправлено: было setToken1mount
  const [lowerPrice, setLowerPrice] = useState('');
  const [upperPrice, setUpperPrice] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    if (!account) {
      alert("Пожалуйста, подключите кошелек");
      return;
    }
    if (!token0Amount || isNaN(token0Amount) || parseFloat(token0Amount) <= 0 ||
      !token1Amount || isNaN(token1Amount) || parseFloat(token1Amount) <= 0) {
      alert("Пожалуйста, введите корректные суммы токенов");
      return;
    }

    setIsSubmitting(true);
    setStatus('Добавление ликвидности...');

    // Здесь будет логика добавления ликвидности
    console.log("Добавление ликвидности:", {
      token0: pool.token0,
      token1: pool.token1,
      token0Amount,
      token1Amount,
      lowerPrice,
      upperPrice
    });

    // Имитация асинхронной операции
    setTimeout(() => {
      setStatus('Ликвидность успешно добавлена!');
      // Очищаем форму после успешного добавления
      setToken0Amount('');
      setToken1Amount(''); // Исправлено: было setToken1mount('')
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
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Добавить ликвидность</h3>
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
                  className="w-full px-3 py-2 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="0.0"
                  step="any"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="token1Amount" className="block text-sm font-medium text-gray-300 mb-1">
                  Количество {pool.token1}
                </label>
                <input
                  type="number"
                  id="token1Amount"
                  value={token1Amount} // Исправлено: было token1mount
                  onChange={(e) => setToken1Amount(e.target.value)} // Исправлено: было setToken1mount
                  className="w-full px-3 py-2 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="0.0"
                  step="any"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lowerPrice" className="block text-sm font-medium text-gray-300 mb-1">
                    Нижняя цена
                  </label>
                  <input
                    type="number"
                    id="lowerPrice"
                    value={lowerPrice}
                    onChange={(e) => setLowerPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="0.0"
                    step="any"
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
                    className="w-full px-3 py-2 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="0.0"
                    step="any"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition ${isSubmitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'}`}
              >
                {isSubmitting ? 'Обработка...' : 'Добавить ликвидность'}
              </button>
            </div>
          </form>

          {status && (
            <div className={`mt-4 text-center text-sm font-medium ${status.includes('успешно') ? 'text-green-400' : 'text-red-400'}`}>
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddLiquidity;