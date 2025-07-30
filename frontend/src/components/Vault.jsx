import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const Vault = () => {
  const { signer, account } = useWeb3();
  const [deposits, setDeposits] = useState([]);
  const [selectedToken, setSelectedToken] = useState('TokenA');
  const [amount, setAmount] = useState(''); // Исправлено: было setTokenAmount
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Здесь будет логика получения депозитов
  // Пока что показываем заглушку
  useEffect(() => {
    if (account) {
      // Получение списка депозитов пользователя
      // Это пример, вам нужно будет реализовать реальную логику
      setDeposits([
        { id: 1, token: 'TokenA', amount: '100' },
        { id: 2, token: 'TokenB', amount: '50' }
      ]);
    }
  }, [account]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!account) {
      alert("Пожалуйста, подключите кошелек");
      return;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert("Пожалуйста, введите корректную сумму");
      return;
    }

    setIsSubmitting(true);
    setStatus('Выполняется депозит...');

    // Здесь будет логика взаимодействия со смарт-контрактом
    console.log("Депозит токенов:", { selectedToken, amount });

    // Имитация асинхронной операции
    setTimeout(() => {
      setStatus('Депозит успешно выполнен!');
      setAmount(''); // Исправлено: было setTokenAmount('')
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Хранилище токенов</h2>

      {/* Форма депозита */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-3">Внести токены</h3>
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tokenSelect" className="block text-sm font-medium text-gray-700 mb-1">Выберите токен</label>
              <select
                id="tokenSelect"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="TokenA">TokenA</option>
                <option value="TokenB">TokenB</option>
                <option value="TokenC">TokenC</option>
              </select>
            </div>
            <div>
              <label htmlFor="amountInput" className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
              <input
                type="number"
                id="amountInput"
                value={amount} // Исправлено: было tokenAmount
                onChange={(e) => setAmount(e.target.value)} // Исправлено: было setTokenAmount
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.0"
                step="any"
                min="0"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isSubmitting ? 'Обработка...' : 'Внести токены'}
          </button>
        </form>
        {status && (
          <div className="mt-4 text-center text-sm font-medium text-green-600">
            {status}
          </div>
        )}
      </div>

      {/* Список депозитов */}
      <div>
        <h3 className="text-lg font-medium mb-3">Ваши депозиты</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Токен</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Количество</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deposits.length > 0 ? deposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{deposit.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{deposit.token}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deposit.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleWithdraw(deposit.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Вывести
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    Депозиты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Vault;