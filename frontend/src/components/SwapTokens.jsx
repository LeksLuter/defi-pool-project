import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const SwapTokens = () => {
  const { signer, account } = useWeb3();
  const [fromToken, setFromToken] = useState('TokenA');
  const [toToken, setToToken] = useState('TokenB');
  const [amount, setAmount] = useState('');

  const handleSwap = async (e) => {
    e.preventDefault();
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
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Обмен токенов</h2>
      <form onSubmit={handleSwap}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            От
          </label>
          <div className="flex">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="w-1/3 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="TokenA">TokenA</option>
              <option value="TokenB">TokenB</option>
              <option value="TokenC">TokenC</option>
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-2/3 px-3 py-2 border-t border-b border-gray-300 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
            />
          </div>
        </div>

        <div className="flex justify-center my-2">
          <button
            type="button"
            onClick={switchTokens}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
          >
            ↓↑
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            К
          </label>
          <div className="flex">
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="w-1/3 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="TokenA">TokenA</option>
              <option value="TokenB">TokenB</option>
              <option value="TokenC">TokenC</option>
            </select>
            <input
              type="number"
              value=""
              readOnly
              className="w-2/3 px-3 py-2 border-t border-b border-gray-300 bg-gray-100 shadow-sm"
              placeholder="0.0"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Обменять
        </button>
      </form>
    </div>
  );
};

export default SwapTokens;