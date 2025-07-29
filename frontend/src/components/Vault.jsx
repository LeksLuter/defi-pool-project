import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const Vault = () => {
  const { signer, account } = useWeb3();
  const [deposits, setDeposits] = useState([]);
  const [selectedToken, setSelectedToken] = useState('TokenA');
  const [amount, setAmount] = useState('');

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
    // Здесь будет логика депозита токенов
    console.log("Депозит токенов:", {
      selectedToken,
      amount
    });
    alert("Функция депозита будет реализована");
  };

  const handleWithdraw = async (depositId) => {
    // Здесь будет логика вывода токенов
    console.log("Вывод токенов:", depositId);
    alert("Функция вывода будет реализована");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Хранилище токенов</h2>

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Депозит токенов</h3>
        <form onSubmit={handleDeposit} className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="TokenA">TokenA</option>
            <option value="TokenB">TokenB</option>
            <option value="TokenC">TokenC</option>
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Количество"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Депозит
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Мои депозиты</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Токен
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Количество
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{deposit.token}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{deposit.amount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleWithdraw(deposit.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Вывести
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Vault;