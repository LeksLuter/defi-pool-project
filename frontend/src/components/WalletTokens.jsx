import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

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
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`);
      if (!response.ok) {
        throw new Error(`CoinGecko HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data[tokenId]?.usd || 0;
    } catch (error) {
      console.warn(`Не удалось получить цену для токена ${tokenId} через CoinGecko:`, error);
      return null;
    }
  };

  // Функция для получения цены токена через CoinMarketCap API
  const fetchTokenPriceFromCoinMarketCap = async (tokenId) => {
    try {
      const cmcApiKey = import.meta.env.VITE_COINMARKETCAP_API_KEY;
      if (!cmcApiKey) {
        console.warn('CoinMarketCap API ключ не задан в переменных окружения');
        return null;
      }
      const response = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=USD&id=${tokenId}`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': cmcApiKey,
          },
        }
      );
      if (!response.ok) {
        throw new Error(`CoinMarketCap HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const tokenData = data.data[tokenId];
      return tokenData?.quote?.USD?.price || 0;
    } catch (error) {
      console.warn(`Не удалось получить цену для токена ${tokenId} через CoinMarketCap:`, error);
      return null;
    }
  };

  // Функция для получения цены токена с резервными вариантами
  const fetchTokenPriceWithFallback = async (tokenId, cmcId) => {
    // Сначала пробуем CoinGecko
    let price = await fetchTokenPriceFromCoinGecko(tokenId);
    // Если CoinGecko не сработал, пробуем CoinMarketCap
    if (price === null && cmcId) {
      price = await fetchTokenPriceFromCoinMarketCap(cmcId);
    }
    return price || 0;
  };

  // Функция для получения цен нескольких токенов с резервными вариантами
  const fetchMultipleTokenPricesWithFallback = async (tokenMap) => {
    const tokenIds = Object.keys(tokenMap);
    // Создаем карту адресов токенов к ценам
    const addressToPrice = {};
    for (const address of tokenIds) {
      const { coingeckoId, cmcId } = tokenMap[address];
      addressToPrice[address] = await fetchTokenPriceWithFallback(coingeckoId, cmcId);
    }
    return addressToPrice;
  };


  // Функция для получения токенов через Etherscan V2 API (основной метод)
  const fetchTokensFromEtherscanV2 = async (account) => {
    try {
      const etherscanApiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
      if (!etherscanApiKey) {
        throw new Error('ETHERSCAN_API_KEY не задан в переменных окружения');
      }
      // Chain ID для Polygon Mainnet
      const polygonChainId = 137;

      // Запрашиваем транзакции токенов ERC-20 через Etherscan V2 API
      // Используем page=1, offset=1000 для получения большего количества транзакций за один запрос
      const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=${polygonChainId}&module=account&action=tokentx&address=${account}&apikey=${etherscanApiKey}&page=1&offset=1000&sort=desc`
      );
      if (!response.ok) {
        throw new Error(`Etherscan V2 API error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status !== "1") {
        throw new Error(data.message || 'Ошибка при получении данных от Etherscan V2 API');
      }

      // Получаем уникальные адреса токенов из транзакций
      const uniqueTokens = new Set();
      const tokenSampleData = {}; // Для хранения примера данных токена
      data.result.forEach(tx => {
        const contractAddress = tx.contractAddress.toLowerCase();
        uniqueTokens.add(contractAddress);
        // Сохраняем пример данных для fallback при получении метаданных
        if (!tokenSampleData[contractAddress]) {
          tokenSampleData[contractAddress] = {
            tokenName: tx.tokenName,
            tokenSymbol: tx.tokenSymbol,
            tokenDecimal: parseInt(tx.tokenDecimal)
          };
        }
      });

      console.log(`Найдено ${uniqueTokens.size} уникальных токенов через Etherscan`);

      // Для каждого уникального токена получаем актуальный баланс и метаданные
      const tokenDetails = [];

      // Обрабатываем нативный токен POL отдельно
      try {
        const polBalance = await provider.getBalance(account);
        if (polBalance.gt(0)) {
          tokenDetails.push({
            contractAddress: '0x0000000000000000000000000000000000000000',
            tokenName: 'Polygon Ecosystem Token',
            tokenSymbol: 'POL',
            tokenDecimal: 18,
            balance: polBalance.toString()
          });
        }
      } catch (error) {
        console.warn('Ошибка при получении баланса POL:', error);
      }


      // Обрабатываем каждый ERC-20 токен
      for (const tokenAddress of uniqueTokens) {
        try {
          // Создаем контракт токена
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

          // Получаем баланс токена напрямую
          const balance = await tokenContract.balanceOf(account);

          // Если баланс больше 0, получаем метаданные
          if (balance.gt(0)) {
            let tokenInfo = tokenSampleData[tokenAddress];
            // Если данные из транзакций не получены, запрашиваем напрямую
            if (!tokenInfo) {
              const [symbol, name, decimals] = await Promise.allSettled([
                tokenContract.symbol(),
                tokenContract.name(),
                tokenContract.decimals()
              ]);
              // Обрабатываем результаты Promise.allSettled
              const symbolValue = symbol.status === 'fulfilled' ? symbol.value : '???';
              const nameValue = name.status === 'fulfilled' ? name.value : 'Unknown Token';
              const decimalsValue = decimals.status === 'fulfilled' ? decimals.value : 18;

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
              balance: balance.toString()
            });
          }
        } catch (error) {
          console.warn(`Ошибка при обработке токена ${tokenAddress}:`, error);
          // Пропускаем токен с ошибкой
        }
      }

      return tokenDetails;
    } catch (error) {
      console.warn('Не удалось получить токены через Etherscan V2:', error);
      throw error;
    }
  };

  // Функция для получения токенов через прямой вызов balanceOf (резервный метод)
  const fetchTokensDirectBalance = async (account) => {
    try {
      console.log('Используется резервный метод получения токенов');
      const tokens = [];
      // Получаем баланс POL
      try {
        const polBalance = await provider.getBalance(account);
        if (polBalance.gt(0)) {
          tokens.push({
            contractAddress: '0x0000000000000000000000000000000000000000',
            tokenName: 'Polygon Ecosystem Token',
            tokenSymbol: 'POL',
            tokenDecimal: 18,
            balance: polBalance.toString()
          });
        }
      } catch (error) {
        console.warn('Ошибка при получении баланса POL в резервном методе:', error);
      }
      // Здесь можно добавить запросы балансов для известных токенов из переменных окружения
      // Но в данном случае ограничимся только нативным токеном как минимальный fallback
      return tokens;
    } catch (error) {
      console.warn('Не удалось получить токены через резервный метод:', error);
      throw error;
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
        // Используем Etherscan V2 API как основной метод
        let tokenList = [];
        try {
          console.log('Попытка получения токенов через Etherscan V2 API...');
          tokenList = await fetchTokensFromEtherscanV2(account);
          console.log('Токены получены через Etherscan V2:', tokenList);
        } catch (etherscanError) {
          console.error('Etherscan V2 API недоступен, пробуем резервный метод...', etherscanError);
          // Резервный метод - получение токенов напрямую
          try {
            tokenList = await fetchTokensDirectBalance(account);
            console.log('Токены получены через резервный метод:', tokenList);
          } catch (directError) {
            console.error('Резервный метод также недоступен:', directError);
            throw new Error(`Не удалось получить токены ни через Etherscan V2, ни через резервный метод: ${directError.message}`);
          }
        }

        // Преобразуем данные токенов в формат для отображения
        const processedTokens = tokenList
          .filter(token => {
            try {
              const balanceBN = ethers.BigNumber.from(token.balance);
              return balanceBN.gt(0);
            } catch (e) {
              return false;
            }
          })
          .map(tokenInfo => {
            try {
              // Конвертируем баланс из smallest unit в десятичный формат
              const balanceBN = ethers.BigNumber.from(tokenInfo.balance);
              const formattedBalance = ethers.utils.formatUnits(balanceBN, tokenInfo.tokenDecimal);
              return {
                address: tokenInfo.contractAddress,
                symbol: tokenInfo.tokenSymbol,
                name: tokenInfo.tokenName,
                balance: formattedBalance,
                rawBalance: balanceBN.toString(),
                decimals: tokenInfo.tokenDecimal
              };
            } catch (formatError) {
              console.warn(`Ошибка при форматировании баланса токена ${tokenInfo.contractAddress}:`, formatError);
              return null;
            }
          })
          .filter(token => token !== null && parseFloat(token.balance) > 0);

        // Подготавливаем карту токенов для получения цен
        const tokenPriceMap = {};
        processedTokens.forEach(token => {
          tokenPriceMap[token.address.toLowerCase()] = {
            coingeckoId: TOKEN_ADDRESS_TO_COINGECKO_ID[token.address.toLowerCase()] || token.symbol.toLowerCase(),
            cmcId: TOKEN_ADDRESS_TO_CMC_ID[token.address.toLowerCase()]
          };
        });

        // Получаем цены для всех токенов с резервными вариантами
        const addressToPrice = await fetchMultipleTokenPricesWithFallback(tokenPriceMap);

        // Добавляем цены и стоимость к токенам
        const tokensWithPrices = processedTokens.map(token => {
          const price = addressToPrice[token.address.toLowerCase()] || 0;
          const value = parseFloat(token.balance) * price;
          return {
            ...token,
            price: price.toFixed(4),
            value: value.toFixed(2)
          };
        });

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

  // Функция для открытия в Blockscan
  const openInBlockscan = (address) => {
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      const url = `https://blockscan.com/address/${address}`;
      window.open(url, '_blank');
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
                                  onClick={() => copyToClipboard(token.address, token.symbol)}
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