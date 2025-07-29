import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const BurnMintPage = () => {
  const { signer, account } = useWeb3();
  const [action, setAction] = useState('mint'); // 'mint' или 'burn'
  const [token, setToken] = useState('TokenA');
  const [amount, setAmount] = useState('');
  const [tokenId, setTokenId] = useState(''); // Для бурна NFT

  const handleBurnMint = async (e) => {
    e.preventDefault();
    if (!account) {
      alert("Пожалуйста, подключите кошелек");
      return;
    }
    if (action === 'mint' && (!amount || parseFloat(amount) <= 0)) {
      alert("Введите корректную сумму для минта");
      return;
    }
    if (action === 'burn' && (!tokenId || parseInt(tokenId) < 0)) {
      alert("Введите корректный ID токена для бурна");
      return;
    }
    // Здесь будет логика минта/бурна токенов
    console.log("Операция:", {
      action,
      token,
      amount,
      tokenId
    });
    alert(`Функция ${action === 'mint' ? 'минта' : 'бурна'} токенов будет реализована`);
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900">
      <div className="container mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Бурн и минт токенов</h1>
          <p className="text-lg text-gray-300">Создавайте или уничтожайте токены</p>
        </div>

        <div className="max-w-md mx-auto bg-gray-800 bg-opacity-50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700 shadow-xl">
          <form onSubmit={handleBurnMint}>
            {/* Выбор действия: минт или бурн */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Выберите действие:
              </label>
              <div className="flex bg-gray-700 bg-opacity-50 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setAction('mint')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${action === 'mint'
                    ? 'bg-gray-600 text-cyan-400 shadow'
                    : 'text-gray-300 hover:text-white'
                    }`}
                >
                  Минт токенов
                </button>
                <button
                  type="button"
                  onClick={() => setAction('burn')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${action === 'burn'
                    ? 'bg-gray-600 text-cyan-400 shadow'
                    : 'text-gray-300 hover:text-white'
                    }`}
                >
                  Бурн токенов
                </button>
              </div>
            </div>

            {/* Поля ввода в зависимости от действия */}
            {action === 'mint' ? (
              <>
                {/* Выбор токена для минта */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Токен для минта
                  </label>
                  <select
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3 py-3 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option className="bg-gray-800" value="TokenA">TokenA</option>
                    <option className="bg-gray-800" value="TokenB">TokenB</option>
                    <option className="bg-gray-800" value="TokenC">TokenC</option>
                  </select>
                </div>

                {/* Количество для минта */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Количество
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-3 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="0.0"
                    step="any"
                    min="0"
                  />
                </div>
              </>
            ) : (
              <>
                {/* ID токена для бурна */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    ID NFT токена для бурна
                  </label>
                  <input
                    type="number"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="w-full px-3 py-3 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="0"
                    step="1"
                    min="0"
                  />
                </div>
              </>
            )}

            {/* Информация о действии */}
            <div className="bg-gray-700 bg-opacity-30 rounded-lg p-3 mb-6 text-sm text-gray-400">
              {action === 'mint' ? (
                <p>Создание новых токенов {token} на ваш баланс</p>
              ) : (
                <p>Уничтожение NFT токена с ID {tokenId} из вашего кошелька</p>
              )}
            </div>

            {/* Кнопка выполнения */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition shadow-lg"
            >
              {action === 'mint' ? 'Создать токены' : 'Уничтожить токен'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BurnMintPage;