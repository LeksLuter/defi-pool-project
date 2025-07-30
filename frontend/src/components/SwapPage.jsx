import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const SwapPage = () => {
  const { signer, account } = useWeb3();
  const [fromToken, setFromToken] = useState('TokenA');
  const [toToken, setToToken] = useState('TokenB');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [status, setStatus] = useState('');

  const handleSwap = async (e) => {
    e.preventDefault();
    if (!account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }
    if (!fromAmount) {
      setStatus('Пожалуйста, введите сумму');
      return;
    }
    if (parseFloat(fromAmount) <= 0) {
      setStatus('Сумма должна быть больше 0');
      return;
    }

    // Здесь будет логика обмена токенов
    console.log("Обмен токенов:", { fromToken, toToken, fromAmount, slippage });
    alert("Функция обмена будет реализована");
    // setStatus('Выполняется обмен...');
  };

  // Функция для переключения токенов местами
  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white py-8 px-4">
      <div className="container mx-auto max-w-md">
        <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Обмен токенов</h2>
          <form onSubmit={handleSwap}>
            {/* Поле "Отправить" */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Отправить
              </label>
              <div className="flex items-center bg-gray-700 rounded-lg overflow-hidden">
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="flex-1 px-4 py-3 bg-transparent text-white focus:outline-none"
                >
                  <option value="TokenA">TokenA</option>
                  <option value="TokenB">TokenB</option>
                  <option value="TokenC">TokenC</option>
                </select>
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 px-4 py-3 bg-transparent text-white text-right focus:outline-none"
                  placeholder="0.0"
                  step="any"
                  min="0"
                />
              </div>
            </div>

            {/* Кнопка переключения токенов */}
            <div className="flex justify-center my-2">
              <button
                type="button"
                onClick={switchTokens}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition"
                aria-label="Переключить токены"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* Поле "Получить" */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Получить
              </label>
              <div className="flex items-center bg-gray-700 rounded-lg overflow-hidden">
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="flex-1 px-4 py-3 bg-transparent text-white focus:outline-none"
                >
                  <option value="TokenA">TokenA</option>
                  <option value="TokenB">TokenB</option>
                  <option value="TokenC">TokenC</option>
                </select>
                <input
                  type="number"
                  value={toAmount}
                  readOnly
                  className="flex-1 px-4 py-3 bg-transparent text-white text-right focus:outline-none"
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* Поле допустимого проскальзывания */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Допустимое проскальзывание (%)
              </label>
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="0.5"
                step="0.1"
                min="0"
                max="50"
              />
            </div>

            {status && (
              <div className="mb-4 p-3 bg-gray-700 bg-opacity-50 rounded-lg text-center">
                <p className="text-sm text-white">{status}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition shadow-lg"
            >
              Обменять
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SwapPage;