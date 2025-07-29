import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const CreatePoolForm = () => {
  const { signer, account } = useWeb3();
  const [token0, setToken0] = useState('');
  const [token1, setToken1] = useState('');
  const [feeRate, setFeeRate] = useState('30'); // 0.3% по умолчанию (вместо 5)
  const [status, setStatus] = useState('');

  const handleCreatePool = async (e) => {
    e.preventDefault();
    if (!account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }
    if (!token0 || !token1) {
      setStatus('Пожалуйста, введите адреса обоих токенов');
      return;
    }
    if (token0.toLowerCase() === token1.toLowerCase()) {
      setStatus('Адреса токенов должны быть разными');
      return;
    }

    setStatus('Создание пула...');
    // Здесь будет логика создания пула через фабрику
    console.log("Создание пула:", {
      token0,
      token1,
      feeRate
    });
    setStatus('Пул успешно создан!');
    // Очищаем форму после успешного создания
    setToken0('');
    setToken1('');
  };

  // Отображаем форму всем пользователям
  return (
    <div className="bg-gray-700 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-600">
      <h3 className="text-xl font-semibold text-white mb-4">Создать новый пул</h3>
      <form onSubmit={handleCreatePool}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Адрес токена 1 (Token0)
          </label>
          <input
            type="text"
            value={token0}
            onChange={(e) => setToken0(e.target.value)}
            className="w-full px-3 py-2 bg-gray-600 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="0x..."
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Адрес токена 2 (Token1)
          </label>
          <input
            type="text"
            value={token1}
            onChange={(e) => setToken1(e.target.value)}
            className="w-full px-3 py-2 bg-gray-600 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="0x..."
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Комиссия (%)
          </label>
          <select
            value={feeRate}
            onChange={(e) => setFeeRate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-600 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {/* Убираем опцию 0.05% (value="5") */}
            <option className="bg-gray-800" value="30">0.3% (30)</option>
            <option className="bg-gray-800" value="100">1% (100)</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
        >
          Создать пул
        </button>
      </form>
      {status && (
        <div className="mt-4 p-3 bg-gray-600 bg-opacity-50 rounded-lg text-center">
          <p className="text-white">{status}</p>
        </div>
      )}
    </div>
  );
};

export default CreatePoolForm;