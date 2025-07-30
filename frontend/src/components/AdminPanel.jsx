import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AdminPanel = () => {
  const { signer, account, isAdmin } = useWeb3();
  const [tokenAddress, setTokenAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [vaultAddress, setVaultAddress] = useState('');
  const [status, setStatus] = useState('');

  // Адрес фабрики пулов (замените на реальный адрес после деплоя)
  const factoryAddress = "YOUR_POOL_FACTORY_CONTRACT_ADDRESS";

  const handleMintTokens = async (e) => {
    e.preventDefault();
    if (!account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }
    if (!isAdmin) {
      setStatus('Только администратор может выполнять это действие');
      return;
    }
    if (!tokenAddress || !recipient || !amount) {
      setStatus('Пожалуйста, заполните все поля');
      return;
    }
    if (parseFloat(amount) <= 0) {
      setStatus('Сумма должна быть больше 0');
      return;
    }

    // Здесь будет логика минтинга токенов
    console.log("Минтинг токенов:", { tokenAddress, recipient, amount });
    alert("Функция минтинга токенов будет реализована");
    // setStatus('Выполняется минтинг токенов...');
  };

  const handleDeployVault = async (e) => {
    e.preventDefault();
    if (!account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }
    if (!isAdmin) {
      setStatus('Только администратор может выполнять это действие');
      return;
    }
    if (!vaultAddress) {
      setStatus('Пожалуйста, введите адрес для деплоя хранилища');
      return;
    }

    // Здесь будет логика деплоя хранилища токенов
    console.log("Деплой хранилища:", { vaultAddress });
    alert("Функция деплоя хранилища будет реализована");
    // setStatus('Выполняется деплой хранилища...');
  };

  // Отображаем панель только для администраторов
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white py-8 px-4 flex items-center justify-center">
        <div className="bg-gray-800 bg-opacity-50 p-8 rounded-xl backdrop-blur-sm border border-gray-700 text-center">
          <h2 className="text-2xl font-bold mb-4">Доступ запрещен</h2>
          <p>Только администраторы могут получить доступ к этой панели.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white py-8 px-4">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Панель администратора</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Секция минтинга токенов */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Минтинг токенов</h2>
            <form onSubmit={handleMintTokens}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Адрес токена
                </label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="0x..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Адрес получателя
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="0x..."
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Сумма
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="0.0"
                  step="any"
                  min="0"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
              >
                Минтить токены
              </button>
            </form>
          </div>

          {/* Секция деплоя хранилища */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Деплой хранилища токенов</h2>
            <form onSubmit={handleDeployVault}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Адрес для деплоя хранилища
                </label>
                <input
                  type="text"
                  value={vaultAddress}
                  onChange={(e) => setVaultAddress(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="0x..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
              >
                Задеплоить хранилище
              </button>
            </form>
          </div>
        </div>

        {/* Отображение статуса операций */}
        {status && (
          <div className="mt-6 p-4 bg-gray-800 bg-opacity-50 rounded-lg text-center">
            <p className="text-white">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;