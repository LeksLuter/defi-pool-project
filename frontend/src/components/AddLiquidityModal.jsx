import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AddLiquidityModal = ({ pool, onClose }) => {
  const { signer, account } = useWeb3();
  const [token0Amount, setToken0Amount] = useState('');
  const [token1Amount, setToken1Amount] = useState('');
  const [status, setStatus] = useState('');

  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    if (!account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }
    if (!token0Amount || !token1Amount) {
      setStatus('Пожалуйста, введите количество токенов');
      return;
    }
    if (parseFloat(token0Amount) <= 0 || parseFloat(token1Amount) <= 0) {
      setStatus('Количество токенов должно быть больше 0');
      return;
    }

    // Здесь будет логика добавления ликвидности
    console.log("Добавление ликвидности:", { pool, token0Amount, token1Amount });
    alert("Функция добавления ликвидности будет реализована");
    // setStatus('Добавление ликвидности...');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Добавить ликвидность</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Закрыть"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleAddLiquidity}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество {pool.token0}
              </label>
              <input
                type="number"
                value={token0Amount}
                onChange={(e) => setToken0Amount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="0.0"
                step="any"
                min="0"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество {pool.token1}
              </label>
              <input
                type="number"
                value={token1Amount}
                onChange={(e) => setToken1Amount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="0.0"
                step="any"
                min="0"
                required
              />
            </div>

            {status && (
              <div className="mb-4 p-3 bg-gray-100 rounded-lg text-center">
                <p className="text-sm text-gray-700">{status}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
            >
              Добавить ликвидность
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddLiquidityModal;