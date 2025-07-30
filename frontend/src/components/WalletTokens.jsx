import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
// Импортируем необходимые функции из ethers v6
import { Contract, formatUnits, parseUnits } from 'ethers'; // Импорт из корня ethers для v6

// ABI для ERC20 токенов (минимальный набор функций для получения метаданных)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)"
];

// Карта адресов токенов Polygon в CoinGecko ID
const TOKEN_ADDRESS_TO_COINGECKO_ID = {
  '0x0000000000000000000000000000000000000000': 'matic-network', // POL (ранее MATIC)
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'weth', // WETH
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'usd-coin', // USDC
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'tether', // USDT
};

// Карта адресов токенов Polygon в CoinMarketCap ID
const TOKEN_ADDRESS_TO_CMC_ID = {
  '0x0000000000000000000000000000000000000000': 3890, // POL (ранее MATIC)
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 2396, // WETH
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 3408, // USDC
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 825, // USDT
};

const WalletTokens = () => {
  const { provider, account } = useWeb3();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Функция для получения цены токена через CoinGecko API
  const fetchTokenPriceFromCoinGecko = async (tokenId) => {
    if (!tokenId) return 0; // Защита от undefined/null
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Таймаут 5 секунд

      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`CoinGecko API ошибка для ${tokenId}: ${response.status}`);
        return 0;
      }
      const data = await response.json();
      return data[tokenId]?.usd || 0;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`Таймаут при получении цены для ${tokenId} через CoinGecko`);
      } else {
        console.warn(`Не удалось получить цену для ${tokenId} через CoinGecko:`, error.message);
      }
      return 0;
    }
  };

  // Функция для получения цены токена через CoinMarketCap API
  const fetchTokenPriceFromCoinMarketCap = async (tokenId) => {
    // Поддержка обоих ключей из переменных окружения
    const cmcApiKey = import.meta.env.VITE_CMC_API_KEY || import.meta.env.VITE_COINMARKETCAP_API_KEY;
    if (!cmcApiKey) {
      console.warn('API ключ CoinMarketCap не задан в переменных окружения (VITE_CMC_API_KEY или VITE_COINMARKETCAP_API_KEY)');
      return null;
    }
    if (!tokenId) return 0; // Защита от undefined/null
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Таймаут 5 секунд

      const response = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=USD&id=${tokenId}`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': cmcApiKey,
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`CoinMarketCap API ошибка для ${tokenId}: ${response.status}`);
        return 0;
      }
      const data = await response.json();
      const tokenData = data.data[tokenId];
      return tokenData?.quote?.USD?.price || 0;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`Таймаут при получении цены для ${tokenId} через CoinMarketCap`);
      } else {
        console.warn(`Не удалось получить цену для ${tokenId} через CoinMarketCap:`, error.message);
      }
      return 0;
    }
  };

  // Функция для получения цены токена с резервными вариантами
  const fetchTokenPriceWithFallback = async (tokenId, cmcId) => {
    // Сначала пробуем CoinGecko
    let price = await fetchTokenPriceFromCoinGecko(tokenId);
    // Если CoinGecko не сработал, пробуем CoinMarketCap
    if ((price === null || price === 0) && cmcId) {
      price = await fetchTokenPriceFromCoinMarketCap(cmcId);
    }
    return price || 0;
  };

  // Функция для получения цен нескольких токенов с резервными вариантами
  const fetchMultipleTokenPricesWithFallback = async (tokenMap) => {
    const tokenIds = Object.keys(tokenMap);
    const addressToPrice = {};
    // Последовательно для предотвращения перегрузки API
    for (const address of tokenIds) {
      const { coingeckoId, cmcId } = tokenMap[address];
      addressToPrice[address] = await fetchTokenPriceWithFallback(coingeckoId, cmcId);
    }
    return addressToPrice;
  };

  // Функция для получения токенов через Etherscan V2 API (основной метод)
  const fetchTokensFromEtherscanV2 = async (accountAddress, ethProvider) => {
    if (!ethProvider || !accountAddress) return [];
    try {
      const etherscanApiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
      if (!etherscanApiKey) {
        console.warn('VITE_ETHERSCAN_API_KEY не задан в переменных окружения');
        return [];
      }
      const polygonChainId = 137;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Таймаут 15 секунд

      const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=${polygonChainId}&module=account&action=tokentx&address=${accountAddress}&apikey=${etherscanApiKey}&page=1&offset=100&sort=desc`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Etherscan V2 API ошибка: ${response.status}`);
        return [];
      }
      const data = await response.json();
      if (data.status !== "1") {
        console.warn('Etherscan V2 API вернул статус 0 или ошибку:', data.message);
        return [];
      }

      const uniqueTokens = new Set();
      const tokenSampleData = {};
      // Ограничиваем количество обрабатываемых транзакций
      data.result.slice(0, 50).forEach(tx => {
        const contractAddress = tx.contractAddress.toLowerCase();
        uniqueTokens.add(contractAddress);
        if (!tokenSampleData[contractAddress]) {
          tokenSampleData[contractAddress] = {
            tokenName: tx.tokenName,
            tokenSymbol: tx.tokenSymbol,
            tokenDecimal: parseInt(tx.tokenDecimal, 10) // Убедимся, что это число
          };
        }
      });

      console.log(`Найдено ${uniqueTokens.size} уникальных токенов через Etherscan`);

      const tokenDetails = [];

      // Обрабатываем нативный токен POL отдельно
      try {
        const polBalance = await ethProvider.getBalance(accountAddress);
        if (polBalance > 0n) { // Используем BigInt для сравнения в v6
          tokenDetails.push({
            contractAddress: '0x0000000000000000000000000000000000000000',
            tokenName: 'Polygon Ecosystem Token',
            tokenSymbol: 'POL',
            tokenDecimal: 18,
            balance: polBalance.toString() // BigInt в строку
          });
        }
      } catch (error) {
        console.warn('Ошибка при получении баланса POL:', error.message);
      }

      // Обрабатываем каждый ERC-20 токен (ограничиваем для скорости)
      let tokenCount = 0;
      const MAX_TOKENS = 20;
      for (const tokenAddress of uniqueTokens) {
        if (tokenCount >= MAX_TOKENS) break;
        try {
          const tokenContract = new Contract(tokenAddress, ERC20_ABI, ethProvider);
          const balance = await tokenContract.balanceOf(accountAddress);

          if (balance > 0n) { // Используем BigInt
            let tokenInfo = tokenSampleData[tokenAddress];
            if (!tokenInfo) {
              // Используем Promise.allSettled корректно
              const results = await Promise.allSettled([
                tokenContract.symbol(),
                tokenContract.name(),
                tokenContract.decimals()
              ]);
              // Правильная обработка результатов
              const symbolResult = results[0];
              const nameResult = results[1];
              const decimalsResult = results[2];

              const symbolValue = symbolResult.status === 'fulfilled' ? symbolResult.value : '???';
              const nameValue = nameResult.status === 'fulfilled' ? nameResult.value : 'Unknown Token';
              // Убедимся, что decimals - это число
              const decimalsValue = decimalsResult.status === 'fulfilled' && Number.isInteger(decimalsResult.value) ? decimalsResult.value : 18;

              tokenInfo = {
                tokenName: nameValue,
                tokenSymbol: symbolValue,
                tokenDecimal: decimalsValue
              };
            }

            tokenDetails.push({
              contractAddress: tokenAddress,
              tokenName: tokenInfo.tokenName,
              tokenSymbol: tokenInfo.tokenSymbol,
              tokenDecimal: tokenInfo.tokenDecimal,
              balance: balance.toString() // BigInt в строку
            });
            tokenCount++;
          }
        } catch (error) {
          console.warn(`Ошибка при обработке токена ${tokenAddress}:`, error.message);
        }
      }

      return tokenDetails;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Критическая ошибка Etherscan V2:', error.message);
      } else {
        console.warn('Таймаут Etherscan V2');
      }
      return [];
    }
  };

  // Функция для получения токенов через прямой вызов balanceOf (резервный метод)
  const fetchTokensDirectBalance = async (accountAddress, ethProvider) => {
    if (!ethProvider || !accountAddress) return [];
    try {
      console.log('Используется резервный метод получения токенов');
      const tokens = [];
      try {
        const polBalance = await ethProvider.getBalance(accountAddress);
        if (polBalance > 0n) {
          tokens.push({
            contractAddress: '0x0000000000000000000000000000000000000000',
            tokenName: 'Polygon Ecosystem Token',
            tokenSymbol: 'POL',
            tokenDecimal: 18,
            balance: polBalance.toString()
          });
        }
      } catch (error) {
        console.warn('Ошибка при получении баланса POL в резервном методе:', error.message);
      }
      return tokens;
    } catch (error) {
      console.warn('Не удалось получить токены через резервный метод:', error.message);
      return [];
    }
  };

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
        let tokenList = [];
        try {
          console.log('Попытка получения токенов через Etherscan V2 API...');
          tokenList = await fetchTokensFromEtherscanV2(account, provider);
          console.log('Токены получены через Etherscan V2:', tokenList.length);
        } catch (etherscanError) {
          console.error('Etherscan V2 API недоступен, пробуем резервный метод...', etherscanError.message);
          try {
            tokenList = await fetchTokensDirectBalance(account, provider);
            console.log('Токены получены через резервный метод:', tokenList.length);
          } catch (directError) {
            console.error('Резервный метод также недоступен:', directError.message);
            // Не блокируем UI критической ошибкой, просто показываем пустой список
            tokenList = [];
          }
        }

        // Преобразуем данные токенов в формат для отображения
        const processedTokens = tokenList
          .filter(token => {
            try {
              const balanceBN = BigInt(token.balance); // Используем BigInt для v6
              return balanceBN > 0n;
            } catch (e) {
              console.warn("Ошибка при проверке баланса BN:", e.message);
              return false;
            }
          })
          .map(tokenInfo => {
            try {
              const balanceBN = BigInt(tokenInfo.balance);
              // Используем formatUnits из ethers v6
              const formattedBalance = formatUnits(balanceBN, tokenInfo.tokenDecimal);
              return {
                address: tokenInfo.contractAddress,
                symbol: tokenInfo.tokenSymbol,
                name: tokenInfo.tokenName,
                balance: formattedBalance,
                rawBalance: balanceBN.toString(),
                decimals: tokenInfo.tokenDecimal
              };
            } catch (formatError) {
              console.warn(`Ошибка при форматировании баланса токена ${tokenInfo.contractAddress}:`, formatError.message);
              return null;
            }
          })
          .filter(token => token !== null && parseFloat(token.balance) > 0);

        // Подготавливаем карту токенов для получения цен
        const tokenPriceMap = {};
        processedTokens.forEach(token => {
          const lowerAddress = token.address.toLowerCase();
          // Используем символ как fallback для CoinGecko ID
          tokenPriceMap[lowerAddress] = {
            coingeckoId: TOKEN_ADDRESS_TO_COINGECKO_ID[lowerAddress] || token.symbol?.toLowerCase(),
            cmcId: TOKEN_ADDRESS_TO_CMC_ID[lowerAddress]
          };
        });

        // Получаем цены для всех токенов с резервными вариантами
        const addressToPrice = await fetchMultipleTokenPricesWithFallback(tokenPriceMap);

        // Добавляем цены и стоимость к токенам
        const tokensWithPrices = processedTokens.map(token => {
          // Убедимся, что баланс - число
          const balanceFloat = parseFloat(token.balance);
          if (isNaN(balanceFloat)) {
            return { ...token, price: '0.0000', value: '0.00' };
          }
          const price = addressToPrice[token.address.toLowerCase()] || 0;
          const value = balanceFloat * price;
          // Защита от NaN при форматировании
          const formattedPrice = isNaN(price) ? '0.0000' : price.toFixed(4);
          const formattedValue = isNaN(value) ? '0.00' : value.toFixed(2);
          return {
            ...token,
            price: formattedPrice,
            value: formattedValue
          };
        });

        setTokens(tokensWithPrices);
      } catch (err) {
        console.error("Критическая ошибка при получении балансов токенов:", err);
        setError(`Не удалось получить балансы токенов: ${err.message || 'Неизвестная ошибка'}`);
      } finally {
        setLoading(false);
      }
    };

    // Используем флаг для предотвращения обновления состояния после размонтирования
    let isMounted = true;
    const fetchData = async () => {
      await fetchTokenBalances();
      if (!isMounted) return;
    };
    fetchData();

    return () => {
      isMounted = false;
    };
  }, [provider, account]);

  // Функция для копирования адреса в буфер обмена
  const copyToClipboard = async (address) => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch (err) {
      console.error('Ошибка при копировании: ', err);
    }
  };

  // Функция для открытия в Polygonscan
  const openInPolygonscan = (address) => {
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      const url = `https://polygonscan.com/address/${address}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Функция для открытия в Blockscan
  const openInBlockscan = (address) => {
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      const url = `https://blockscan.com/address/${address}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Функция для форматирования адреса
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

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
                            {token.symbol ? token.symbol.charAt(0) : '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{token.symbol || '???'}</div>
                            <div className="text-sm text-gray-400">{token.name || 'Неизвестный токен'}</div>
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
                                  aria-label={`Копировать адрес ${token.symbol}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openInPolygonscan(token.address)}
                                  className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                                  title="Посмотреть на Polygonscan"
                                  aria-label={`Открыть ${token.symbol} в Polygonscan`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openInBlockscan(token.address)}
                                  className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                                  title="Посмотреть на Blockscan"
                                  aria-label={`Открыть ${token.symbol} в Blockscan`}
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