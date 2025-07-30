import React from 'react';
import { useTokens } from '../context/TokenContext'; // Добавлен импорт useTokens

// Функция для форматирования адреса
const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Функция для копирования адреса в буфер обмена
const copyToClipboard = async (address) => {
  if (!address) return;
  try {
    await navigator.clipboard.writeText(address);
    // Можно добавить уведомление об успешном копировании
  } catch (err) {
    console.error('Ошибка при копировании: ', err);
  }
};

// Функция для открытия в Polygonscan
const openInPolygonscan = (address) => {
  if (address && address !== '0x0000000000000000000000000000000000000000') {
    const url = `https://polygonscan.com/address/${address}`;
    window.open(url, '_blank');
  }
};

// Функция для открытия в Blockscan
const openInBlockscan = (address) => {
  if (address && address !== '0x0000000000000000000000000000000000000000') {
    const url = `https://blockscan.com/address/${address}`;
    window.open(url, '_blank');
  }
};

const WalletTokens = () => {
  // Используется useTokens вместо локального состояния и useEffect
  const { tokens, loading, error, refreshTokens } = useTokens();

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Кошелёк</h1>
        <p className="mb-8 text-gray-400">Ваши токены и их стоимость</p>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded mb-6">
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : tokens.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-4 text-xl text-gray-400">Токены не найдены</p>
            <p className="mt-2 text-gray-500">Убедитесь, что ваш кошелек подключен и содержит токены.</p>
          </div>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/30">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Токен</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Баланс</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Цена</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Стоимость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {tokens.map((token) => (
                    <tr key={token.address} className="hover:bg-gray-700/30 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-700 to-blue-700 flex items-center justify-center text-white font-bold">
                            {token.symbol.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{token.symbol}</div>
                            <div className="text-sm text-gray-400">{token.name}</div>
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-gray-500 mr-2">
                                {token.address === '0x0000000000000000000000000000000000000000'
                                  ? 'Native POL'
                                  : formatAddress(token.address)}
                              </span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => copyToClipboard(token.address)}
                                  className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                                  title="Копировать адрес"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openInPolygonscan(token.address)}
                                  className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                                  title="Посмотреть на Polygonscan"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openInBlockscan(token.address)}
                                  className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                                  title="Посмотреть на Blockscan"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {parseFloat(token.balance).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        ${token.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyan-400">
                        ${token.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletTokens;