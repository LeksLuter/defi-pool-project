import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const SwapPage = () => {
  const { signer, account } = useWeb3();
  const [fromToken, setFromToken] = useState('TokenA');
  const [toToken, setToToken] = useState('TokenB');
  const [amount, setAmount] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('0.0');

  // Функция для расчета примерного выходного количества (заглушка)
  const calculateEstimatedAmount = (inputAmount, from, to) => {
    // В реальной реализации здесь будет логика расчета на основе резервов пула
    // Пока используем фиктивный курс 1:1 для демонстрации
    return inputAmount || '0.0';
  };

  // Обновляем оценку при изменении входных данных
  React.useEffect(() => {
    setEstimatedAmount(calculateEstimatedAmount(amount, fromToken, toToken));
  }, [amount, fromToken, toToken]);

  const handleSwap = async (e) => {
    e.preventDefault();
    if (!account) {
      alert("Пожалуйста, подключите кошелек");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Введите корректную сумму");
      return;
    }
    // Здесь будет логика обмена токенов
    console.log("Обмен токенов:", {
      fromToken,
      toToken,
      amount
    });
    alert("Функция обмена токенов будет реализована");
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    // Также меняем сумму для реалистичности, хотя в реальном приложении это требует перерасчета
    setAmount('');
    setEstimatedAmount('0.0');
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900">
      <div className="container mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Обмен токенов</h1>
          <p className="text-lg text-gray-300">Быстро обменивайте токены по лучшим курсам</p>
        </div>

        <div className="max-w-md mx-auto bg-gray-800 bg-opacity-50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700 shadow-xl">
          <form onSubmit={handleSwap}>
            {/* Поле "От" */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                От
              </label>
              <div className="flex bg-gray-700 bg-opacity-50 rounded-lg overflow-hidden">
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="w-1/3 px-3 py-3 bg-transparent text-white focus:outline-none"
                >
                  <option className="bg-gray-800" value="TokenA">TokenA</option>
                  <option className="bg-gray-800" value="TokenB">TokenB</option>
                  <option className="bg-gray-800" value="TokenC">TokenC</option>
                </select>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-2/3 px-3 py-3 bg-transparent text-white placeholder-gray-500 focus:outline-none"
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
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                aria-label="Switch tokens"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Поле "К" */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                К
              </label>
              <div className="flex bg-gray-700 bg-opacity-50 rounded-lg overflow-hidden">
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="w-1/3 px-3 py-3 bg-transparent text-white focus:outline-none"
                >
                  <option className="bg-gray-800" value="TokenA">TokenA</option>
                  <option className="bg-gray-800" value="TokenB">TokenB</option>
                  <option className="bg-gray-800" value="TokenC">TokenC</option>
                </select>
                <input
                  type="text"
                  value={estimatedAmount}
                  readOnly
                  className="w-2/3 px-3 py-3 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* Информация о курсе и комиссии */}
            <div className="bg-gray-700 bg-opacity-30 rounded-lg p-3 mb-6 text-sm text-gray-400">
              <div className="flex justify-between py-1">
                <span>Курс:</span>
                <span>1 {fromToken} = 1 {toToken}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Комиссия:</span>
                <span>0.3%</span>
              </div>
              <div className="flex justify-between py-1 font-medium text-gray-300">
                <span>Вы получите:</span>
                <span>{estimatedAmount} {toToken}</span>
              </div>
            </div>

            {/* Кнопка обмена */}
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