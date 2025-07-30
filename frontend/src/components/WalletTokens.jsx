// frontend/src/components/WalletTokens.jsx
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
// Исправлен ID для POL (ранее MATIC)
const TOKEN_ADDRESS_TO_COINGECKO_ID = {
  '0x0000000000000000000000000000000000000000': 'polygon-ecosystem-token', // POL
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'weth', // WETH
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'usd-coin', // USDC
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'tether', // USDT
};

// Карта адресов токенов Polygon в CoinMarketCap ID
// Исправлены ID для USDC и USDT
const TOKEN_ADDRESS_TO_CMC_ID = {
  '0x0000000000000000000000000000000000000000': 3890, // POL
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 2396, // WETH
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 3408, // USDC (CoinMarketCap ID)
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 825,  // USDT (CoinMarketCap ID)
};

// Вспомогательная функция для получения ключа кэша
const getCacheKey = (account) => `walletTokens_${account}`;

// Вспомогательная функция для проверки устаревания кэша (например, 5 минут)
const isCacheExpired = (timestamp, maxAgeMinutes = 5) => {
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  return (now - timestamp) > maxAgeMs;
};

// Функция для получения токенов из кэша
const getCachedTokens = (account) => {
  if (!account) return null;
  try {
    const cacheKey = getCacheKey(account);
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const { tokens, timestamp } = JSON.parse(cachedData);
      // Проверяем, не устарели ли данные
      if (!isCacheExpired(timestamp)) {
        console.log('Загружены токены из кэша');
        return tokens;
      } else {
        console.log('Кэш устарел, будет выполнен запрос к API');
      }
    }
  } catch (error) {
    console.error('Ошибка при чтении кэша токенов:', error);
  }
  return null;
};

// Функция для сохранения токенов в кэш
const saveTokensToCache = (account, tokens) => {
  if (!account || !tokens) return;
  try {
    const cacheKey = getCacheKey(account);
    const dataToCache = {
      tokens,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
    console.log('Токены сохранены в кэш');
  } catch (error) {
    console.error('Ошибка при сохранении токенов в кэш:', error);
  }
};

const WalletTokens = () => {
  const { provider, account } = useWeb3();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Функция для получения цены токена через CoinGecko API
  const fetchTokenPriceFromCoinGecko = async (tokenId) => {
    if (!tokenId) return 0;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Таймаут 5 секунд
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`CoinGecko API ошибка для ${tokenId}: ${response.status}`);
        return 0;
      }

      const data = await response.json();
      return data[tokenId]?.usd || 0;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn(`Ошибка при получении цены из CoinGecko для ${tokenId}:`, error.message);
      } else {
        console.warn(`Таймаут CoinGecko API для ${tokenId}`);
      }
      return 0;
    }
  };

  // Функция для получения цены токена через CoinMarketCap API
  const fetchTokenPriceFromCoinMarketCap = async (cmcId) => {
    if (!cmcId) return 0;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Таймаут 5 секунд
      // Исправлен URL для CoinMarketCap
      const response = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${cmcId}`, {
        headers: {
          'X-CMC_PRO_API_KEY': import.meta.env.VITE_CMC_API_KEY || '' // Используйте свой ключ CMC
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`CoinMarketCap API ошибка для ${cmcId}: ${response.status}`);
        return 0;
      }

      const data = await response.json();
      return data.data?.[cmcId]?.quote?.USD?.price || 0;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn(`Ошибка при получении цены из CoinMarketCap для ${cmcId}:`, error.message);
      } else {
        console.warn(`Таймаут CoinMarketCap API для ${cmcId}`);
      }
      return 0;
    }
  };

  // Функция для получения цены с резервными вариантами
  const fetchTokenPriceWithFallback = async (tokenId, cmcId) => {
    let price = await fetchTokenPriceFromCoinGecko(tokenId);
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
        // Используем BigNumber из ethers v5 для сравнения
        if (polBalance.gt(0)) {
          tokenDetails.push({
            contractAddress: '0x0000000000000000000000000000000000000000',
            tokenName: 'Polygon Ecosystem Token',
            tokenSymbol: 'POL',
            tokenDecimal: 18,
            balance: polBalance.toString() // BigNumber в строку
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
          // Используем Contract из ethers v5
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethProvider);
          const balance = await tokenContract.balanceOf(accountAddress);
          // Используем BigNumber из ethers v5 для сравнения
          if (balance.gt(0)) {
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
              const decimalsValue = decimalsResult.status === 'fulfilled' && !isNaN(parseInt(decimalsResult.value)) ?
                parseInt(decimalsResult.value) : 18;

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
              balance: balance.toString() // BigNumber в строку
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
        // Используем BigNumber из ethers v5 для сравнения
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
        console.warn('Ошибка при получении баланса POL в резервном методе:', error.message);
      }

      // Здесь можно добавить вызовы balanceOf для известных адресов токенов
      // Например, для USDC, USDT и т.д., если Etherscan API недоступен
      const knownTokens = [
        { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', name: 'USD Coin', symbol: 'USDC', decimals: 6 },
        { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', name: 'Tether USD', symbol: 'USDT', decimals: 6 },
        { address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', name: 'Wrapped Ether', symbol: 'WETH', decimals: 18 },
        // Добавьте другие известные токены по необходимости
      ];

      for (const token of knownTokens) {
        try {
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, ethProvider);
          const balance = await tokenContract.balanceOf(accountAddress);
          if (balance.gt(0)) {
            tokens.push({
              contractAddress: token.address,
              tokenName: token.name,
              tokenSymbol: token.symbol,
              tokenDecimal: token.decimals,
              balance: balance.toString()
            });
          }
        } catch (error) {
          console.warn(`Ошибка при получении баланса для ${token.symbol}:`, error.message);
        }
      }

      return tokens;
    } catch (error) {
      console.warn('Не удалось получить токены через резервный метод:', error.message);
      return [];
    }
  };

  // Основная функция обновления токенов и кэширования
  const updateTokensAndCache = async (accountAddress, ethProvider) => {
    if (!ethProvider || !accountAddress) {
      setTokens([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let tokenList = [];

    try {
      // Попытка получить токены через Etherscan V2 API
      try {
        console.log('Попытка получения токенов через Etherscan V2 API...');
        tokenList = await fetchTokensFromEtherscanV2(accountAddress, ethProvider);
        console.log('Токены получены через Etherscan V2:', tokenList.length);
      } catch (etherscanError) {
        console.error('Etherscan V2 API недоступен, пробуем резервный метод...', etherscanError.message);
        try {
          tokenList = await fetchTokensDirectBalance(accountAddress, ethProvider);
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
            // Используем BigNumber из ethers v5 для проверки
            const balanceBN = ethers.BigNumber.from(token.balance);
            return balanceBN.gt(0);
          } catch (e) {
            console.warn("Ошибка при проверке баланса BN:", e.message);
            return false;
          }
        })
        .map(tokenInfo => {
          try {
            const balanceBN = ethers.BigNumber.from(tokenInfo.balance);
            // Используем formatUnits из ethers v5
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
      // Сохраняем в кэш
      saveTokensToCache(accountAddress, tokensWithPrices);
    } catch (err) {
      console.error("Критическая ошибка при получении балансов токенов:", err);
      setError(`Не удалось получить балансы токенов: ${err.message || 'Неизвестная ошибка'}`);
      // В случае ошибки обновления, можно попробовать загрузить из кэша
      const cachedTokens = getCachedTokens(accountAddress);
      if (cachedTokens) {
        setTokens(cachedTokens);
      }
    } finally {
      setLoading(false);
    }
  };

  // Эффект для инициализации: сначала из кэша, потом обновление
  useEffect(() => {
    let isMounted = true;
    
    const initializeTokens = async () => {
      if (!account || !provider) {
        setTokens([]);
        setLoading(false);
        return;
      }

      // 1. Попробуем загрузить из кэша
      const cachedTokens = getCachedTokens(account);
      if (cachedTokens && isMounted) {
        setTokens(cachedTokens);
        setLoading(false); // Показываем кэшированные данные сразу
      }

      // 2. Запускаем обновление в фоне
      await updateTokensAndCache(account, provider);
    };

    initializeTokens();

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
      const url = `https://polygonscan.com/token/${address}`;
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

  // Вычисляем общий баланс
  const totalValue = tokens.reduce((sum, token) => {
    const value = parseFloat(token.value);
    return isNaN(value) ? sum : sum + value;
  }, 0);

  // Функции-заглушки для обмена и сжигания
  const handleSwap = (token) => {
    console.log("Обмен токена:", token);
    alert(`Функция обмена для ${token.symbol} будет реализована`);
  };

  const handleBurn = (token) => {
    console.log("Сжечь токен:", token);
    alert(`Функция сжигания для ${token.symbol} будет реализована`);
  };

  if (loading && tokens.length === 0) { // Показываем спиннер только если нет кэшированных данных
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error && tokens.length === 0) { // Показываем ошибку только если нет кэшированных данных
    return (
      <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Ошибка! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 bg-opacity-50 rounded-xl shadow-lg overflow-hidden border border-gray-700">
      {/* Заголовок с адресом кошелька и общим балансом */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-white mb-2 sm:mb-0">Токены кошелька</h2>
          {account && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">{formatAddress(account)}</span>
              <button
                onClick={() => copyToClipboard(account)}
                className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                title="Копировать адрес"
                aria-label="Копировать адрес кошелька"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => openInPolygonscan(account)}
                className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                title="Посмотреть на Polygonscan"
                aria-label="Открыть кошелек в Polygonscan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {account && (
          <div className="mt-2 text-sm text-gray-400">
            Общий баланс: <span className="font-medium text-cyan-400">${totalValue.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Таблица токенов */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700 bg-opacity-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Токен</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Баланс</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Цена</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Стоимость</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 bg-opacity-30 divide-y divide-gray-700">
            {tokens.length > 0 ? tokens.map((token) => (
              <tr key={token.address} className="hover:bg-gray-700 hover:bg-opacity-30 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {token.symbol.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-white">{token.symbol}</div>
                      <div className="text-sm text-gray-400">{token.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {parseFloat(token.balance).toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${token.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyan-400">${token.value}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSwap(token)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition text-xs"
                      title="Обменять"
                      aria-label={`Обменять ${token.symbol}`}
                    >
                      Обмен
                    </button>
                    <button
                      onClick={() => handleBurn(token)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition text-xs"
                      title="Сжечь"
                      aria-label={`Сжечь ${token.symbol}`}
                    >
                      Сжечь
                    </button>
                    <button
                      onClick={() => copyToClipboard(token.address)}
                      className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                      title="Копировать адрес"
                      aria-label={`Копировать адрес ${token.symbol}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openInPolygonscan(token.address)}
                      className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                      title="Посмотреть на Polygonscan"
                      aria-label={`Открыть ${token.symbol} в Polygonscan`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openInBlockscan(token.address)}
                      className="p-1 rounded hover:bg-gray-600 transition text-gray-400 hover:text-white"
                      title="Посмотреть на Blockscan"
                      aria-label={`Открыть ${token.symbol} в Blockscan`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  Токены не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WalletTokens;