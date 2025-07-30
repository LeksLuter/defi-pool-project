import React from 'react';
import { useTokens } from '../context/TokenContext';

// --- Упрощённый AddressDisplay ---
const AddressDisplay = ({ address }) => {
  if (!address) return <span className="text-xs text-gray-500">Адрес не указан</span>;

  const getShortAddress = (addr) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'Native POL';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const copyToClipboard = () => {
    if (address) navigator.clipboard.writeText(address).catch(err => console.warn('Ошибка копирования:', err));
  };

  const openInPolygonscan = () => {
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      window.open(`https://polygonscan.com/address/${address}`, '_blank');
    }
  };

  return (
    <div className="flex items-center mt-1">
      <span className="text-xs text-gray-500 mr-2">{getShortAddress(address)}</span>
      {address !== '0x0000000000000000000000000000000000000000' && (
        <div className="flex space-x-1">
          <button onClick={copyToClipboard} className="p-1 text-gray-400 hover:text-white" title="Копировать">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button onClick={openInPolygonscan} className="p-1 text-gray-400 hover:text-white" title="Polygonscan">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
// --- Конец AddressDisplay ---

const WalletTokens = () => {
  const { tokens, loading, error, refreshTokens } = useTokens();

  // Простое форматирование
  const formatUSD = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Портфель токенов</h1>
            <p className="mt-2 text-gray-400">Ваши токены и их стоимость</p>
          </div>
          <button
            onClick={refreshTokens}
            disabled={loading}
            className="mt-4 md:mt-0 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Обновление...
              </>
            ) : (
              'Обновить'
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded mb-6">
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {loading && tokens.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : tokens.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-4 text-xl text-gray-400">
              {error ? 'Не удалось загрузить токены' : 'Токены не найдены'}
            </p>
            <p className="mt-2 text-gray-500">
              {error ? 'Проверьте подключение.' : 'Кошелек пуст или не подключен.'}
            </p>
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
                    <tr key={token.address} className="hover:bg-gray-700/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-700 to-blue-700 flex items-center justify-center text-white font-bold">
                            {token.symbol ? token.symbol.charAt(0) : '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{token.symbol || '???'}</div>
                            <div className="text-sm text-gray-400">{token.name || 'Неизвестный токен'}</div>
                            <AddressDisplay address={token.address} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {parseFloat(token.balance).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {token.price > 0 ? formatUSD(token.price) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyan-400">
                        {token.value !== '0.00' ? formatUSD(token.value) : '-'}
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