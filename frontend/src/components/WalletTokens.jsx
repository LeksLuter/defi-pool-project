import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

// ABI для ERC20 токенов (минимальный набор функций для получения метаданных)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Карта адресов токенов Polygon в CoinGecko ID
const TOKEN_ADDRESS_TO_COINGECKO_ID = {
  '0x0000000000000000000000000000000000000000': 'matic-network', // POL (ранее MATIC)
  // Добавьте сюда другие токены по необходимости
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'weth', // WETH
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'usd-coin', // USDC
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'tether', // USDT
};

// Карта адресов токенов Polygon в CoinMarketCap ID
const TOKEN_ADDRESS_TO_CMC_ID = {
  '0x0000000000000000000000000000000000000000': 3890, // POL (ранее MATIC)
  // Добавьте сюда другие токены по необходимости
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
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
      );

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
          }
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

  // Функция для получения цен нескольких токенов через CoinGecko
  const fetchMultipleTokenPricesFromCoinGecko = async (tokenIds) => {
    if (tokenIds.length === 0) return {};

    try {
      const idsString = tokenIds.join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const prices = {};

      tokenIds.forEach(id => {
        prices[id] = data[id]?.usd || 0;
      });

      return prices;
    } catch (error) {
      console.warn('Не удалось получить цены для токенов через CoinGecko:', error);
      return null;
    }
  };

  // Функция для получения цен нескольких токенов через CoinMarketCap
  const fetchMultipleTokenPricesFromCoinMarketCap = async (tokenIds) => {
    if (tokenIds.length === 0) return {};

    try {
      const cmcApiKey = import.meta.env.VITE_COINMARKETCAP_API_KEY;
      if (!cmcApiKey) {
        console.warn('CoinMarketCap API ключ не задан в переменных окружения');
        return null;
      }

      const idsString = tokenIds.join(',');
      const response = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=USD&id=${idsString}`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': cmcApiKey,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CoinMarketCap HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const prices = {};

      tokenIds.forEach(id => {
        const tokenData = data.data[id];
        prices[id] = tokenData?.quote?.USD?.price || 0;
      });

      return prices;
    } catch (error) {
      console.warn('Не удалось получить цены для токенов через CoinMarketCap:', error);
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
    const coingeckoIds = tokenIds.map(id => tokenMap[id].coingeckoId).filter(id => id);
    const cmcIds = tokenIds.map(id => tokenMap[id].cmcId).filter(id => id);

    // Сначала пробуем получить все цены через CoinGecko
    let prices = await fetchMultipleTokenPricesFromCoinGecko(coingeckoIds);

    // Если CoinGecko не сработал, пробуем CoinMarketCap
    if (prices === null) {
      const cmcPrices = await fetchMultipleTokenPricesFromCoinMarketCap(cmcIds);
      prices = cmcPrices || {};
    } else {
      // Если CoinGecko частично сработал, получаем недостающие цены через CoinMarketCap
      const missingIds = coingeckoIds.filter(id => prices[id] === undefined);
      if (missingIds.length > 0) {
        const cmcPrices = await fetchMultipleTokenPricesFromCoinMarketCap(cmcIds);
        if (cmcPrices) {
          prices = { ...prices, ...cmcPrices };
        }
      }
    }

    // Создаем карту адресов токенов к ценам
    const addressToPrice = {};
    tokenIds.forEach(address => {
      const { coingeckoId, cmcId } = tokenMap[address];
      addressToPrice[address] = prices[coingeckoId] || prices[cmcId] || 0;
    });

    return addressToPrice;
  };

  // Функция для получения токенов через Etherscan API v2
  const fetchTokensFromEtherscan = async (account) => {
    try {
      const etherscanApiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
      if (!etherscanApiKey) {
        throw new Error('ETHERSCAN_API_KEY не задан в переменных окружения');
      }

      // Chain ID для Polygon Mainnet
      const polygonChainId = 137;

      // Запрашиваем токены ERC-20 через Etherscan API v2
      // Используем правильный endpoint для получения токенов аккаунта
      const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=${polygonChainId}&module=account&action=tokenbalance&address=${account}&apikey=${etherscanApiKey}`
      );

      if (!response.ok) {
        throw new Error(`Etherscan API error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "1") {
        throw new Error(data.message || 'Ошибка при получении данных от Etherscan API');
      }

      // Обрабатываем данные токенов
      const tokens = data.result.filter(token => {
        try {
          // Фильтруем токены с нулевым балансом
          const balanceBN = ethers.BigNumber.from(token.balance || token.value);
          return balanceBN.gt(0);
        } catch (e) {
          return false;
        }
      });

      return tokens;
    } catch (error) {
      console.warn('Не удалось получить токены через Etherscan:', error);
      throw error;
    }
  };

  // Альтернативный метод получения токенов через tokentx
  const fetchTokensFromEtherscanTx = async (account) => {
    try {
      const etherscanApiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
      if (!etherscanApiKey) {
        throw new Error('ETHERSCAN_API_KEY не задан в переменных окружения');
      }

      // Chain ID для Polygon Mainnet
      const polygonChainId = 137;

      // Запрашиваем транзакции токенов через Etherscan API v2
      const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=${polygonChainId}&module=account&action=tokentx&address=${account}&apikey=${etherscanApiKey}&page=1&offset=100&sort=desc`
      );

      if (!response.ok) {
        throw new Error(`Etherscan API error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "1") {
        throw new Error(data.message || 'Ошибка при получении данных от Etherscan API');
      }

      // Группируем транзакции по токенам и суммируем балансы
      const tokenMap = {};

      data.result.forEach(tx => {
        const contractAddress = tx.contractAddress.toLowerCase();

        // Если токен уже есть в мапе, суммируем баланс
        if (tokenMap[contractAddress]) {
          // Для токенов используем value, для нативных токенов используем value
          const currentBalance = ethers.BigNumber.from(tokenMap[contractAddress].balance);
          const txValue = ethers.BigNumber.from(tx.value);
          tokenMap[contractAddress].balance = currentBalance.add(txValue).toString();
        } else {
          // Добавляем новый токен
          tokenMap[contractAddress] = {
            contractAddress: contractAddress,
            tokenName: tx.tokenName,
            tokenSymbol: tx.tokenSymbol,
            tokenDecimal: parseInt(tx.tokenDecimal),
            balance: tx.value
          };
        }
      });

      // Конвертируем в массив и фильтруем токены с нулевым балансом
      const tokens = Object.values(tokenMap).filter(token => {
        try {
          const balanceBN = ethers.BigNumber.from(token.balance);
          return balanceBN.gt(0);
        } catch (e) {
          return false;
        }
      });

      return tokens;
    } catch (error) {
      console.warn('Не удалось получить токены через Etherscan (tokentx):', error);
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
        // Получаем баланс POL напрямую через провайдер
        const polBalance = await provider.getBalance(account);
        const formattedPolBalance = ethers.utils.formatEther(polBalance);

        // Используем Etherscan API v2 для получения токенов
        let tokenList = [];

        try {
          console.log('Попытка получения токенов через Etherscan API v2 (tokentx)...');
          tokenList = await fetchTokensFromEtherscanTx(account);
          console.log('Токены получены через Etherscan (tokentx):', tokenList);
        } catch (etherscanError) {
          console.error('Etherscan API (tokentx) недоступен:', etherscanError);
          throw new Error(`Не удалось получить токены через Etherscan: ${etherscanError.message}`);
        }

        // Начинаем с POL если баланс больше 0
        let tokenBalances = [];
        if (parseFloat(formattedPolBalance) > 0) {
          tokenBalances.push({
            address: '0x0000000000000000000000000000000000000000', // Адрес для нативного токена
            symbol: 'POL',
            name: 'Polygon Ecosystem Token',
            balance: formattedPolBalance,
            rawBalance: polBalance,
            decimals: 18
          });
        }

        // Получаем метаданные и форматируем балансы для токенов из Etherscan
        const tokenPromises = tokenList
          .filter(token => {
            try {
              const balanceBN = ethers.BigNumber.from(token.balance);
              return balanceBN.gt(0);
            } catch (e) {
              return false;
            }
          })
          .map(async (tokenInfo) => {
            try {
              // Создаем контракт токена для уточнения метаданных
              const tokenContract = new ethers.Contract(tokenInfo.contractAddress, ERC20_ABI, provider);

              // Получаем символ, имя и десятичные знаки параллельно
              const [symbol, name, decimals] = await Promise.allSettled([
                tokenContract.symbol(),
                tokenContract.name(),
                tokenContract.decimals()
              ]);

              // Обрабатываем результаты Promise.allSettled
              const symbolValue = symbol.status === 'fulfilled' ? symbol.value : tokenInfo.tokenSymbol || 'UNKNOWN';
              const nameValue = name.status === 'fulfilled' ? name.value : tokenInfo.tokenName || 'Unknown Token';
              const decimalsValue = decimals.status === 'fulfilled' ? decimals.value : tokenInfo.tokenDecimal || 18;

              // Конвертируем баланс из smallest unit в десятичный формат
              const balanceBN = ethers.BigNumber.from(tokenInfo.balance);
              const formattedBalance = ethers.utils.formatUnits(balanceBN, decimalsValue);

              // Дополнительная проверка: если после форматирования баланс равен 0, исключаем токен
              if (parseFloat(formattedBalance) <= 0) {
                return null;
              }

              return {
                address: tokenInfo.contractAddress,
                symbol: symbolValue,
                name: nameValue,
                balance: formattedBalance,
                rawBalance: balanceBN.toString(),
                decimals: decimalsValue
              };
            } catch (tokenError) {
              console.warn(`Ошибка при обработке данных токена ${tokenInfo.contractAddress}:`, tokenError);

              // Даже в случае ошибки пытаемся использовать данные из Etherscan
              try {
                const balanceBN = ethers.BigNumber.from(tokenInfo.balance);
                const formattedBalance = ethers.utils.formatUnits(balanceBN, tokenInfo.tokenDecimal || 18);

                if (parseFloat(formattedBalance) <= 0) {
                  return null;
                }

                return {
                  address: tokenInfo.contractAddress,
                  symbol: tokenInfo.tokenSymbol || 'UNKNOWN',
                  name: tokenInfo.tokenName || 'Unknown Token',
                  balance: formattedBalance,
                  rawBalance: balanceBN.toString(),
                  decimals: tokenInfo.tokenDecimal || 18
                };
              } catch (formatError) {
                console.warn(`Ошибка при форматировании баланса токена ${tokenInfo.contractAddress}:`, formatError);
                return null;
              }
            }
          });

        // Ждем завершения всех запросов метаданных
        const tokenResults = await Promise.all(tokenPromises);

        // Фильтруем успешные результаты и исключаем токены с нулевым балансом
        const validTokens = tokenResults.filter(token =>
          token !== null && parseFloat(token.balance) > 0
        );

        // Добавляем валидные токены к общему списку
        tokenBalances = [...tokenBalances, ...validTokens];

        // Подготавливаем карту токенов для получения цен
        const tokenPriceMap = {};
        tokenBalances.forEach(token => {
          tokenPriceMap[token.address.toLowerCase()] = {
            coingeckoId: TOKEN_ADDRESS_TO_COINGECKO_ID[token.address.toLowerCase()] || token.symbol.toLowerCase(),
            cmcId: TOKEN_ADDRESS_TO_CMC_ID[token.address.toLowerCase()]
          };
        });

        // Получаем цены для всех токенов с резервными вариантами
        const addressToPrice = await fetchMultipleTokenPricesWithFallback(tokenPriceMap);

        // Добавляем цены и стоимость к токенам
        const tokensWithPrices = tokenBalances.map(token => {
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

  // Функция для форматирования адреса кошелька
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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

  // Рассчитываем общую стоимость портфеля
  const totalValue = tokens.reduce((sum, token) => {
    return sum + parseFloat(token.value || 0);
  }, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Токены кошелька</h2>
        {account && (
          <div className="mt-2 sm:mt-0 flex items-center space-x-2">
            <span className="text-gray-400 text-sm">{formatAddress(account)}</span>
            <button
              onClick={() => copyToClipboard(account, 'Адрес кошелька')}
              className="p-1 rounded hover:bg-gray-700 transition"
              title="Скопировать адрес"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => openInPolygonscan(account)}
              className="p-1 rounded hover:bg-gray-700 transition"
              title="Посмотреть на Polygonscan"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <button
              onClick={() => openInBlockscan(account)}
              className="p-1 rounded hover:bg-gray-700 transition"
              title="Посмотреть на Blockscan"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Отображение общей стоимости */}
      {tokens.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Общая стоимость портфеля:</span>
            <span className="text-2xl font-bold text-cyan-400">${totalValue.toFixed(2)}</span>
          </div>
        </div>
      )}

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
                      ${parseFloat(token.price).toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                      ${parseFloat(token.value).toFixed(2)}
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