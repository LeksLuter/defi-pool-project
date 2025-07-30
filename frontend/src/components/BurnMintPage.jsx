import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const BurnMintPage = () => {
  const { signer, account } = useWeb3();
  const [action, setAction] = useState('mint'); // 'mint' или 'burn'
  const [token, setToken] = useState('TokenA');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  const handleMintBurn = async (e) => {
    e.preventDefault();
    if (!account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }
    if (!amount) {
      setStatus('Пожалуйста, введите сумму');
      return;
    }
    if (parseFloat(amount) <= 0) {
      setStatus('Сумма должна быть больше 0');
      return;
    }

    // Здесь будет логика минтинга/сжигания токенов
    console.log(`${action} токенов:`, { token, amount });
    alert(`Функция ${action === 'mint' ? 'минтинга' : 'сжигания'} будет реализована`);
    // setStatus(`Выполняется ${action === 'mint' ? 'минтинг' : 'сжигание'}...`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white py-8 px-4">
      <div className="container mx-auto max-w-md">
        <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Mint/Burn токенов</h2>
          <form onSubmit={handleMintBurn}>
            {/* Переключатель Mint/Burn */}
            <div className="flex mb-4 bg-gray-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setAction('mint')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${action === 'mint' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:text-white'}`}
              >
                Mint
              </button>
              <button
                type="button"
                onClick={() => setAction('burn')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${action === 'burn' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:text-white'}`}
              >
                Burn
              </button>
            </div>

            {/* Выбор токена */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Токен
              </label>
              <select
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="TokenA">TokenA</option>
                <option value="TokenB">TokenB</option>
                <option value="TokenC">TokenC</option>
              </select>
            </div>

            {/* Ввод суммы */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Сумма
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="0.0"
                step="any"
                min="0"
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
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition shadow-lg"
            >
              {action === 'mint' ? 'Создать (Mint)' : 'Сжечь (Burn)'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BurnMintPage;