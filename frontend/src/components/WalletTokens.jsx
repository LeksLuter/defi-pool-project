import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

// ABI для ERC20 токенов (минимальный набор функций для получения метаданных)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

const WalletTokens = () => {
  const { provider, account } = useWeb3();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTokenBalances = async () => {
      if (!provider || !account) {
        setTokens([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Получаем баланс MATIC напрямую через провайдер
        const maticBalance = await provider.getBalance(account);
        const formattedMaticBalance = ethers.utils.formatEther(maticBalance);

        // Используем Alchemy API для получения балансов токенов
        // Получаем URL Alchemy из переменных окружения
        const alchemyUrl = import.meta.env.VITE_ALCHEMY_POLYGON_MAINNET_URL;

        if (!alchemyUrl) {
          throw new Error('ALCHEMY_POLYGON_MAINNET_URL не задан в переменных окружения');
        }

        // Запрашиваем балансы токенов через Alchemy API
        const response = await fetch(alchemyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokenBalances',
            params: [account, 'erc20']
          })
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        const tokenBalances = [{
          address: '0x0000000000000000000000000000000000000000', // Адрес для нативного токена
          symbol: 'MATIC',
          name: 'Matic Token',
          balance: formattedMaticBalance,
          rawBalance: maticBalance,
          decimals: 18,
          price: 0, // Будем заполнять позже
          value: 0  // Будем заполнять позже
        }];

        // Фильтруем токены с нулевым балансом
        const nonZeroTokens = data.result.tokenBalances.filter(token =>
          token.tokenBalance !== '0x0' &&
          token.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000' &&
          parseInt(token.tokenBalance, 16) > 0 // Дополнительная проверка на больше 0
        );

        // Получаем метаданные для каждого токена
        for (const tokenInfo of nonZeroTokens) {
          try {
            // Создаем контракт токена
            const tokenContract = new ethers.Contract(tokenInfo.contractAddress, ERC20_ABI, provider);

            // Получаем символ, имя и десятичные знаки параллельно
            const [symbol, name, decimals] = await Promise.all([
              tokenContract.symbol().catch(() => 'UNKNOWN'),
              tokenContract.name().catch(() => 'Unknown Token'),
              tokenContract.decimals().catch(() => 18)
            ]);

            // Конвертируем баланс из hex в десятичный формат
            const balanceBN = ethers.BigNumber.from(tokenInfo.tokenBalance);
            const formattedBalance = ethers.utils.formatUnits(balanceBN, decimals);

            tokenBalances.push({
              address: tokenInfo.contractAddress,
              symbol: symbol,
              name: name,
              balance: formattedBalance,
              rawBalance: balanceBN.toString(),
              decimals: decimals,
              price: 0, // Будем заполнять позже
              value: 0  // Будем заполнять позже
            });
          } catch (tokenError) {
            console.warn(`Ошибка при получении данных токена ${tokenInfo.contractAddress}:`, tokenError);
          }
        }

        // Получаем цены токенов (в реальном приложении можно использовать CoinGecko API)
        // Для демонстрации используем фиктивные цены
        const tokensWithPrices = await Promise.all(tokenBalances.map(async (token) => {
          let price = 0;

          // Для MATIC используем реальную цену (если есть API)
          if (token.symbol === 'MATIC') {
            // В реальном приложении здесь будет запрос к API для получения цены MATIC
            price = 0.75; // Пример цены
          }
          // Для других токенов можно использовать различные методы получения цены
          else {
            // В реальном приложении здесь будет логика получения цены для ERC20 токенов
            // Например, через CoinGecko API или другие источники
            price = Math.random() * 10; // Временная фиктивная цена для демонстрации
          }

          const value = parseFloat(token.balance) * price;

          return {
            ...token,
            price: price.toFixed(4),
            value: value.toFixed(2)
          };
        }));

        setTokens(tokensWithPrices);
      } catch (err) {
        console.error("Ошибка при получении балансов токенов:", err);
        setError(`Не удалось получить балансы токенов: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenBalances();
  }, [provider, account]);

  // Функция для копирования адреса в буфер обмена
  const copyToClipboard = async (address, symbol) => {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-md text-sm"
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Токены кошелька</h2>
      {tokens.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="inline-block h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-300 mb-2">Токены не найдены</h3>
          <p className="text-gray-500">На вашем кошельке пока нет токенов</p>
        </div>
      ) : (
        <div className="bg-gray-800 bg-opacity-50 rounded-xl backdrop-blur-sm border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Токен
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Баланс
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Цена
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Стоимость
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 bg-opacity-30 divide-y divide-gray-700">
                {tokens.map((token, index) => (
                  <tr
                    key={`${token.address}-${index}`}
                    className="hover:bg-gray-700 hover:bg-opacity-30 transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {token.symbol.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{token.symbol}</div>
                          <div className="text-sm text-gray-400 truncate max-w-xs">{token.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {parseFloat(token.balance).toFixed(4)}
                      </div>
                      <div className="text-sm text-gray-400 truncate max-w-xs">
                        {token.address === '0x0000000000000000000000000000000000000000'
                          ? 'Нативный токен'
                          : `${token.address.substring(0, 6)}...${token.address.substring(token.address.length - 4)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400">
                      ${token.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                      ${token.value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => copyToClipboard(token.address, token.symbol)}
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-gray-300 hover:text-white"
                          title="Скопировать адрес"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openInPolygonscan(token.address)}
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-gray-300 hover:text-white"
                          title="Посмотреть на Polygonscan"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletTokens;