import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const Vault = () => {
  const { provider, signer, account } = useWeb3();
  const [deposits, setDeposits] = useState([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

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

    // Здесь будет логика депозита токенов
    console.log("Депозит токенов:", { selectedToken, amount });
    alert("Функция депозита будет реализована");
    // setStatus('Выполняется депозит...');
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
      <h3 className="text-lg font-semibold mb-4">Депозит токенов</h3>
      <form onSubmit={handleDeposit} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Сумма"
            step="any"
            min="0"
            required
          />
        </div>
        {status && (
          <div className="mb-3 p-2 bg-gray-100 rounded-lg text-center">
            <p className="text-sm text-gray-700">{status}</p>
          </div>
        )}
        <button
          type="submit"
          className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
        >
          Депонировать
        </button>
      </form>

      <h3 className="text-lg font-semibold mb-4">Мои депозиты</h3>
      {deposits.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          <p>У вас пока нет активных депозитов</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Токен</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deposits.map((deposit) => (
                <tr key={deposit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{deposit.id}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{deposit.token}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{deposit.amount}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleWithdraw(deposit.id)}
                      className="text-cyan-600 hover:text-cyan-900"
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
  );
};

export default Vault;