import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const TokenVault = () => {
  const { account } = useWeb3();
  const [deposits, setDeposits] = useState([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Здесь будет логика получения депозитов
  // Пока что показываем заглушку
  useEffect(() => {
    if (account) {
      // Получение списка депозитов пользователя
      // Это пример, вам нужно будет реализовать реальную логику
      setDeposits([
        { id: 1, token: "TokenA", amount: "10.5" },
        { id: 2, token: "TokenB", amount: "5.2" }
      ]);
    }
  }, [account]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }
    if (!selectedToken || !amount) {
      setStatus('Пожалуйста, выберите токен и введите сумму');
      return;
    }
    if (parseFloat(amount) <= 0) {
      setStatus('Сумма должна быть больше 0');
      return;
    }

    setIsSubmitting(true);
    setStatus('Выполняется депозит...');
    // Здесь будет логика депозита токенов
    console.log("Депозит токенов:", { selectedToken, amount });
    // alert("Функция депозита будет реализована");

    // Имитация асинхронной операции
    setTimeout(() => {
      setStatus('Депозит успешно выполнен!');
      setAmount('');
      setIsSubmitting(false);
      // Обновить список депозитов
      setDeposits(prev => [...prev, { id: prev.length + 1, token: selectedToken, amount }]);
    }, 2000); // Имитация задержки 2 секунды
  };

  const handleWithdraw = async (depositId) => {
    if (!account) {
      alert("Пожалуйста, подключите кошелек");
      return;
    }
    // Здесь будет логика вывода токенов
    console.log("Вывод токенов:", depositId);
    alert("Функция вывода будет реализована");
  };

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-2">Хранилище токенов</h1>
      <p className="mb-8 text-gray-400">Безопасно храните и управляйте своими токенами</p>

      {/* Секция депозита */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8 shadow-lg">
        <h2 className="text-xl font-bold text-cyan-400 mb-4">Депозит токенов</h2>
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200"
              required
            >
              <option value="">Выберите токен</option>
              {/* Предполагается, что список токенов доступен */}
              <option value="TokenA">TokenA</option>
              <option value="TokenB">TokenB</option>
              <option value="TokenC">TokenC</option>
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200"
              placeholder="Сумма"
              step="any"
              min="0"
              required
            />
          </div>
          {status && (
            <div className={`text-sm px-4 py-2 rounded-lg ${status.includes('успешно') ? 'bg-green-900/30 text-green-400 border border-green-800' : status.includes('Пожалуйста') ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'}`}>
              {status}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`py-2.5 px-5 rounded-lg font-medium transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 ${isSubmitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg hover:shadow-cyan-500/20'}`}
          >
            {isSubmitting ? 'Обработка...' : 'Депонировать'}
          </button>
        </form>
      </div>

      {/* Секция списка депозитов */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-lg overflow-hidden">
        <h2 className="text-xl font-bold text-cyan-400 mb-4">Мои депозиты</h2>
        {deposits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-2">У вас пока нет активных депозитов</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700/30">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Токен</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Сумма</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {deposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-gray-700/30 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">{deposit.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{deposit.token}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{deposit.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleWithdraw(deposit.id)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200 px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                      >
                        Вывести
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenVault;