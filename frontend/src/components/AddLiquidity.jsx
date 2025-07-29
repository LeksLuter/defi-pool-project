import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AddLiquidity = () => {
  const { signer, account } = useWeb3();
  const [token0Amount, setToken0Amount] = useState('');
  const [token1Amount, setToken1Amount] = useState('');
  const [lowerPrice, setLowerPrice] = useState('');
  const [upperPrice, setUpperPrice] = useState('');

  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    // Здесь будет логика добавления ликвидности
    console.log("Добавление ликвидности:", {
      token0Amount,
      token1Amount,
      lowerPrice,
      upperPrice
    });
    alert("Функция добавления ликвидности будет реализована");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Добавить ликвидность</h2>
      <form onSubmit={handleAddLiquidity}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество TokenA
            </label>
            <input
              type="number"
              value={token0Amount}
              onChange={(e) => setToken0Amount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество TokenB
            </label>
            <input
              type="number"
              value={token1Amount}
              onChange={(e) => setToken1Amount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Нижняя граница цены
            </label>
            <input
              type="number"
              value={lowerPrice}
              onChange={(e) => setLowerPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Верхняя граница цены
            </label>
            <input
              type="number"
              value={upperPrice}
              onChange={(e) => setUpperPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Добавить ликвидность
        </button>
      </form>
    </div>
  );
};

export default AddLiquidity;