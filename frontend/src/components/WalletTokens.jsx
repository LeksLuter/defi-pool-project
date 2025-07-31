import React, { useEffect, useState, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { getNetworkConfig } from '../config/supportedChains';

// ABI для ERC20 токенов (минимальный набор функций для получения метаданных)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];

// Сопоставление адресов токенов с их ID для CoinGecko и CoinMarketCap
// Это позволяет получать цены для известных токенов
const KNOWN_TOKENS_MAP = {
  // Native tokens
  '1_0x0000000000000000000000000000000000000000': { // Ethereum
    coingeckoId: 'ethereum',
    cmcId: '1027'
  },
  '137_0x0000000000000000000000000000000000000000': { // Polygon
    coingeckoId: 'matic-network',
    cmcId: '3890'
  },
  '56_0x0000000000000000000000000000000000000000': { // BSC
    coingeckoId: 'binancecoin',
    cmcId: '1839'
  },
  '10_0x0000000000000000000000000000000000000000': { // Optimism
    coingeckoId: 'ethereum',
    cmcId: '1027'
  },
  '42161_0x0000000000000000000000000000000000000000': { // Arbitrum
    coingeckoId: 'ethereum',
    cmcId: '1027'
  },
  '43114_0x0000000000000000000000000000000000000000': { // Avalanche
    coingeckoId: 'avalanche-2',
    cmcId: '5805'
  },
  '8453_0x0000000000000000000000000000000000000000': { // Base
    coingeckoId: 'ethereum',
    cmcId: '1027'
  },
  // Common ERC20 tokens on Polygon
  '137_0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { // USDC (Polygon)
    coingeckoId: 'usd-coin',
    cmcId: '3408'
  },
  '137_0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { // USDT (Polygon)
    coingeckoId: 'tether',
    cmcId: '825'
  },
  '137_0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': { // WETH (Polygon)
    coingeckoId: 'weth',
    cmcId: '2396'
  },
  // Common ERC20 tokens on Ethereum
  '1_0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { // USDC (Ethereum)
    coingeckoId: 'usd-coin',
    cmcId: '3408'
  },
  '1_0xdac17f958d2ee523a2206206994597c13d831ec7': { // USDT (Ethereum)
    coingeckoId: 'tether',
    cmcId: '825'
  },
  '1_0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { // WETH (Ethereum)
    coingeckoId: 'weth',
    cmcId: '2396'
  },
  // Common ERC20 tokens on BSC
  '56_0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { // USDC (BSC)
    coingeckoId: 'usd-coin',
    cmcId: '3408'
  },
  '56_0x55d398326f99059ff775485246999027b3197955': { // USDT (BSC)
    coingeckoId: 'tether',
    cmcId: '825'
  },
  '56_0x2170ed0880ac9a755fd29b2688956bd959f933f8': { // ETH (BSC)
    coingeckoId: 'ethereum',
    cmcId: '1027'
  }
};

// Вспомогательная функция для получения ключа кэша
const getCacheKey = (account, chainId) => `walletTokens_${account}_${chainId}`;

// Вспомогательная функция для получения ключа времени последнего обновления
const getLastUpdateKey = (account, chainId) => `walletTokens_lastUpdate_${account}_${chainId}`;

// Функция для проверки, устарели ли кэшированные данные
const isCacheExpired = (timestamp, maxAgeMinutes = 10) => {
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  return (now - timestamp) > maxAgeMs;
};

// Функция для получения токенов из кэша
const getCachedTokens = (account, chainId) => {
  if (!account || !chainId) return null;
  try {
    const cacheKey = getCacheKey(account, chainId);
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const { tokens, timestamp } = JSON.parse(cachedData);
      // Проверяем, не устарели ли данные
      if (!isCacheExpired(timestamp)) {
        console.log(`Загружены токены из кэша для ${account} в сети ${chainId}`);
        return tokens;
      } else {
        console.log(`Кэш устарел для ${account} в сети ${chainId}, будет выполнен запрос к API`);
      }
    }
  } catch (error) {
    console.error('Ошибка при чтении кэша токенов:', error);
  }
  return null;
};

// Функция для сохранения токенов в кэш
const saveTokensToCache = (account, chainId, tokens) => {
  if (!account || !chainId || !tokens) return;
  try {
    const cacheKey = getCacheKey(account, chainId);
    const dataToCache = {
      tokens,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
    console.log(`Токены сохранены в кэш для ${account} в сети ${chainId}`);
  } catch (error) {
    console.error('Ошибка при сохранении токенов в кэш:', error);
  }
};

// Функция для сохранения времени последнего обновления
const saveLastUpdateTime = (account, chainId) => {
  if (!account || !chainId) return;
  try {
    const lastUpdateKey = getLastUpdateKey(account, chainId);
    localStorage.setItem(lastUpdateKey, Date.now().toString());
  } catch (error) {
    console.error('Ошибка при сохранении времени последнего обновления:', error);
  }
};

// Функция для проверки, можно ли выполнить фоновое обновление
// (прошло ли достаточно времени с последнего обновления)
const canPerformBackgroundUpdate = (account, chainId, minIntervalMinutes = 5) => {
  if (!account || !chainId) return false;
  try {
    const lastUpdateKey = getLastUpdateKey(account, chainId);
    const lastUpdateStr = localStorage.getItem(lastUpdateKey);
    if (!lastUpdateStr) return true; // Нет записи - можно обновлять
    const lastUpdate = parseInt(lastUpdateStr, 10);
    if (isNaN(lastUpdate)) return true; // Некорректная запись - можно обновлять
    return isCacheExpired(lastUpdate, minIntervalMinutes);
  } catch (error) {
    console.error('Ошибка при проверке возможности фонового обновления:', error);
    return true; // В случае ошибки разрешаем обновление
  }
};

// Функция для получения цены токена через CoinGecko API
const fetchTokenPriceFromCoinGecko = async (coingeckoId) => {
  if (!coingeckoId) return 0;
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`CoinGecko API error (${response.status}): ${errorText}`);
      return 0;
    }
    const data = await response.json();
    return data[coingeckoId]?.usd || 0;
  } catch (error) {
    console.warn(`Ошибка при получении цены из CoinGecko для ${coingeckoId}:`, error.message);
    return 0;
  }
};

// Функция для получения цены токена через CoinMarketCap API
const fetchTokenPriceFromCoinMarketCap = async (cmcId) => {
  if (!cmcId) return 0;
  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${cmcId}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': import.meta.env.VITE_CMC_API_KEY || '' // Убедитесь, что ключ API установлен
        }
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`CoinMarketCap API error (${response.status}): ${errorText}`);
      return 0;
    }
    const data = await response.json();
    if (data.status.error_code !== 0) {
      console.warn(`CoinMarketCap API returned error: ${data.status.error_message}`);
      return 0;
    }
    return data.data[cmcId]?.quote?.USD?.price || 0;
  } catch (error) {
    console.warn(`Ошибка при получении цены из CoinMarketCap для ${cmcId}:`, error.message);
    return 0;
  }
};

// Функция для получения цены токена с резервными вариантами
const fetchTokenPriceWithFallback = async (coingeckoId, cmcId) => {
  let price = 0;
  // Сначала пробуем CoinGecko
  if (coingeckoId) {
    price = await fetchTokenPriceFromCoinGecko(coingeckoId);
  }
  // Если CoinGecko не дал результата, пробуем CoinMarketCap
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

// Функция для получения токенов через Etherscan V2 API
const fetchTokensFromEtherscanV2 = async (accountAddress, ethProvider, chainId) => {
  if (!ethProvider || !accountAddress || !chainId) return [];

  const networkConfig = getNetworkConfig(chainId);
  if (!networkConfig) {
    console.warn(`Сеть с chainId ${chainId} не поддерживается Etherscan V2 в этой конфигурации`);
    return [];
  }

  try {
    console.log(`Попытка получения токенов через Etherscan V2 API для сети ${networkConfig.name} (chainId: ${chainId})...`);

    // Используем API ключ из переменных окружения
    const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
    const apiUrl = networkConfig.apiUrl;

    // Формируем URL для получения ERC20 транзакций (токен трансферов)
    // Согласно документации: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
    const url = `${apiUrl}?chainid=${chainId}&module=account&action=tokentx&address=${accountAddress}&startblock=0&endblock=99999999&page=1&offset=100&sort=asc&apikey=${apiKey}`;

    // Установим таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Etherscan V2 API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Проверяем структуру ответа V2 API (JSON:API)
    if (data && data.status === "1" && Array.isArray(data.result)) {
      console.log(`Получено ${data.result.length} записей о транзакциях токенов из Etherscan V2 для сети ${networkConfig.name}`);
    } else {
      console.warn("Etherscan V2 API вернул статус 0 или ошибку:", data.message || data);
      // Не бросаем ошибку, а возвращаем пустой массив, чтобы продолжить с резервным методом
      return [];
    }

    // Создаем Map для уникальных адресов токенов и объект для хранения метаданных
    const uniqueTokens = new Map(); // Используем Map для хранения метаданных
    const tokenSampleData = {};

    // Обрабатываем транзакции токенов для извлечения уникальных токенов
    // Ограничиваем обработку для предотвращения перегрузки API
    const transactionsToProcess = data.result.slice(0, 100);
    transactionsToProcess.forEach(tx => {
      // В V2 API структура может отличаться, проверяем наличие полей
      if (tx.contractAddress && tx.tokenName && tx.tokenSymbol) {
        const contractAddress = tx.contractAddress.toLowerCase();
        // Сохраняем метаданные токена (берем из первой транзакции)
        if (!tokenSampleData[contractAddress]) {
          tokenSampleData[contractAddress] = {
            tokenName: tx.tokenName,
            tokenSymbol: tx.tokenSymbol,
            tokenDecimal: parseInt(tx.tokenDecimal, 10) || 18 // Убедимся, что это число
          };
        }
        // Добавляем адрес токена в Set
        uniqueTokens.set(contractAddress, {
          contractAddress,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimal: parseInt(tx.tokenDecimal, 10) || 18
        });
      }
    });

    console.log(`Найдено ${uniqueTokens.size} уникальных токенов через Etherscan V2 для сети ${networkConfig.name}`);

    const tokenDetails = [];

    // Обрабатываем нативный токен отдельно
    try {
      const nativeBalance = await ethProvider.getBalance(accountAddress);
      // Используем BigNumber из ethers v5 для сравнения
      if (nativeBalance.gt(0)) {
        tokenDetails.push({
          contractAddress: networkConfig.nativeTokenAddress, // Специальный адрес для нативного токена
          tokenName: networkConfig.nativeTokenName,
          tokenSymbol: networkConfig.nativeTokenSymbol,
          tokenDecimal: 18, // Обычно 18 для нативных токенов
          balance: nativeBalance.toString() // BigNumber в строку
        });
      }
    } catch (error) {
      console.warn(`Ошибка при получении баланса нативного токена для ${networkConfig.name}:`, error.message);
    }

    // Обрабатываем ERC-20 токены
    let tokenCount = 0;
    for (const [tokenAddress, tokenMetadata] of uniqueTokens.entries()) {
      // Пропускаем нативный токен, он уже обработан
      if (tokenAddress === networkConfig.nativeTokenAddress) continue;

      if (tokenCount >= 30) { // Увеличен лимит
        console.warn(`Достигнут лимит обработки токенов (${tokenCount}) для сети ${networkConfig.name}, остальные пропущены`);
        break;
      }

      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethProvider);
        const balance = await tokenContract.balanceOf(accountAddress);
        // Используем BigNumber из ethers v5 для сравнения
        if (balance.gt(0)) {
          tokenDetails.push({
            contractAddress: tokenAddress,
            tokenName: tokenMetadata.tokenName || 'Unknown Token',
            tokenSymbol: tokenMetadata.tokenSymbol || '???',
            tokenDecimal: tokenMetadata.tokenDecimal || 18,
            balance: balance.toString() // BigNumber в строку
          });
          tokenCount++;
        }
      } catch (error) {
        console.warn(`Ошибка при обработке токена ${tokenAddress} в сети ${networkConfig.name}:`, error.message);
      }
    }

    return tokenDetails;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(`Критическая ошибка Etherscan V2 для сети ${chainId}:`, error.message);
    } else {
      console.warn(`Таймаут Etherscan V2 для сети ${chainId}`);
    }
    return [];
  }
};

// Функция для получения токенов через прямой вызов balanceOf (резервный метод)
// Обновлена для работы с мультичейн
const fetchTokensDirectBalance = async (accountAddress, ethProvider, chainId) => {
  if (!ethProvider || !accountAddress || !chainId) return [];

  const networkConfig = getNetworkConfig(chainId);
  if (!networkConfig) {
    console.warn(`Сеть с chainId ${chainId} не поддерживается в резервном методе`);
    return [];
  }

  try {
    console.log(`Используется резервный метод получения токенов для сети ${networkConfig.name}`);
    const tokens = [];

    // Обрабатываем нативный токен
    try {
      const nativeBalance = await ethProvider.getBalance(accountAddress);
      // Используем BigNumber из ethers v5 для сравнения
      if (nativeBalance.gt(0)) {
        tokens.push({
          contractAddress: networkConfig.nativeTokenAddress,
          tokenName: networkConfig.nativeTokenName,
          tokenSymbol: networkConfig.nativeTokenSymbol,
          tokenDecimal: 18,
          balance: nativeBalance.toString()
        });
      }
    } catch (error) {
      console.warn(`Ошибка при получении баланса нативного токена в резервном методе для ${networkConfig.name}:`, error.message);
    }

    // Здесь можно добавить вызовы balanceOf для известных адресов токенов
    // Для демонстрации добавим несколько популярных токенов, адаптированных под сеть
    // В реальном приложении этот список должен быть динамическим или загружаться из внешнего источника
    const knownTokensMap = {
      137: [ // Polygon
        { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', name: 'USD Coin', symbol: 'USDC', decimals: 6 },
        { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', name: 'Tether USD', symbol: 'USDT', decimals: 6 },
        { address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', name: 'Wrapped Ether', symbol: 'WETH', decimals: 18 },
      ],
      1: [ // Ethereum
        { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', name: 'USD Coin', symbol: 'USDC', decimals: 6 },
        { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', name: 'Tether USD', symbol: 'USDT', decimals: 6 },
        { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', name: 'Wrapped Ether', symbol: 'WETH', decimals: 18 },
      ],
      56: [ // BSC
        { address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', name: 'USD Coin', symbol: 'USDC', decimals: 18 }, // USDC.e
        { address: '0x55d398326f99059ff775485246999027b3197955', name: 'Tether USD', symbol: 'USDT', decimals: 18 },
        { address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8', name: 'Ethereum Token', symbol: 'ETH', decimals: 18 },
      ],
      10: [ // Optimism
        { address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', name: 'USD Coin', symbol: 'USDC', decimals: 6 },
        { address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', name: 'Tether USD', symbol: 'USDT', decimals: 6 },
        { address: '0x4200000000000000000000000000000000000006', name: 'Wrapped Ether', symbol: 'WETH', decimals: 18 },
      ],
      42161: [ // Arbitrum
        { address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', name: 'USD Coin', symbol: 'USDC', decimals: 6 },
        { address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', name: 'Tether USD', symbol: 'USDT', decimals: 6 },
        { address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', name: 'Wrapped Ether', symbol: 'WETH', decimals: 18 },
      ]
      // Добавьте токены для других сетей по необходимости
    };

    const knownTokens = knownTokensMap[chainId] || [];

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
        console.warn(`Ошибка при получении баланса для ${token.symbol} в сети ${networkConfig.name}:`, error.message);
      }
    }

    return tokens;
  } catch (error) {
    console.warn(`Не удалось получить токены через резервный метод для сети ${networkConfig.name}:`, error.message);
    return [];
  }
};

// Основная функция обновления токенов и кэширования
// Обновлена для работы с chainId
const updateTokensAndCache = async (accountAddress, ethProvider, chainId, setTokens, setLoading, setError, updateIntervalMinutes = 0) => {
  // Определяем минимальный интервал обновления (5 минут по умолчанию или значение из админки)
  const minInterval = updateIntervalMinutes <= 0 ? 5 : updateIntervalMinutes;
  if (!canPerformBackgroundUpdate(accountAddress, chainId, minInterval)) {
    console.log(`Фоновое обновление пропущено для ${accountAddress} в сети ${chainId}: последнее обновление было менее ${minInterval} минут назад.`);
    return;
  }

  console.log(`Начинаем фоновое обновление токенов для ${accountAddress} в сети ${chainId}...`);
  setError(null); // Сбрасываем ошибку перед новой попыткой
  let tokenList = [];

  try {
    // Попытка получить токены через Etherscan V2 API
    try {
      tokenList = await fetchTokensFromEtherscanV2(accountAddress, ethProvider, chainId);
      if (tokenList.length === 0) {
        console.log("Etherscan V2 API не вернул токенов, пробуем резервный метод...");
        tokenList = await fetchTokensDirectBalance(accountAddress, ethProvider, chainId);
      }
    } catch (apiError) {
      console.warn("Ошибка при вызове Etherscan V2 API, пробуем резервный метод:", apiError.message);
      tokenList = await fetchTokensDirectBalance(accountAddress, ethProvider, chainId);
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
            contractAddress: tokenInfo.contractAddress,
            name: tokenInfo.tokenName,
            symbol: tokenInfo.tokenSymbol,
            balance: formattedBalance,
            price: 0, // Цена за единицу токена будет установлена позже
            totalValue: 0, // Общая стоимость будет рассчитана позже
            decimals: tokenInfo.tokenDecimal
          };
        } catch (e) {
          console.error("Ошибка при обработке токена:", e.message);
          return null;
        }
      })
      .filter(Boolean); // Убираем null значения

    // Получаем цены для токенов
    if (processedTokens.length > 0) {
      try {
        // Создаем карту адресов токенов с их ID для API
        // Добавляем префикс chainId для уникальной идентификации токенов в разных сетях
        const tokenPriceMap = {};
        processedTokens.forEach(token => {
          const prefixedAddress = `${chainId}_${token.contractAddress.toLowerCase()}`;
          if (KNOWN_TOKENS_MAP[prefixedAddress]) {
            tokenPriceMap[prefixedAddress] = KNOWN_TOKENS_MAP[prefixedAddress];
          }
        });

        // Получаем цены для известных токенов
        const prefixedAddressToPrice = await fetchMultipleTokenPricesWithFallback(tokenPriceMap);

        // Обновляем цены и общую стоимость в processedTokens
        processedTokens.forEach(token => {
          const prefixedAddress = `${chainId}_${token.contractAddress.toLowerCase()}`;
          const price = prefixedAddressToPrice[prefixedAddress] || 0;
          token.price = price;

          if (price > 0) {
            const balanceNum = parseFloat(token.balance);
            if (!isNaN(balanceNum)) {
              token.totalValue = (balanceNum * price);
            } else {
              token.totalValue = 0;
            }
          } else {
            token.totalValue = 0;
          }
        });
      } catch (priceError) {
        console.warn("Ошибка при получении цен токенов:", priceError.message);
        // Если не удалось получить цены, оставляем price = 0 и totalValue = 0
      }
    }

    // Сохраняем в состояние и кэш
    setTokens(processedTokens);
    saveTokensToCache(accountAddress, chainId, processedTokens);
    saveLastUpdateTime(accountAddress, chainId);
  } catch (err) {
    console.error("Критическая ошибка при получении балансов токенов:", err);
  }
};

const WalletTokens = ({ updateIntervalMinutes, isAdmin }) => {
  const { provider, account, signer, chainId } = useWeb3(); // Добавлен chainId
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null); // useRef для хранения ID интервала

  // Функция для обновления токенов с учетом кэширования
  const handleRefresh = async () => {
    if (!account || !provider || !chainId) return;
    setLoading(true);
    setError(null);
    await updateTokensAndCache(account, provider, chainId, setTokens, setLoading, setError, updateIntervalMinutes);
  };

  // Эффект для инициализации: сначала из кэша, потом обновление
  useEffect(() => {
    let isMounted = true;
    const initializeTokens = async () => {
      if (!account || !provider || !chainId) {
        if (isMounted) {
          setTokens([]);
          setLoading(false);
        }
        return;
      }

      // 1. Попробуем загрузить из кэша
      const cachedTokens = getCachedTokens(account, chainId);
      if (cachedTokens && isMounted) {
        setTokens(cachedTokens);
        setLoading(false); // Показываем кэшированные данные сразу
      }

      // 2. Запускаем обновление в фоне
      await updateTokensAndCache(account, provider, chainId, setTokens, setLoading, setError, updateIntervalMinutes);
    };

    // Очищаем предыдущий интервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    initializeTokens();

    // Устанавливаем новый интервал, если updateIntervalMinutes > 0
    if (updateIntervalMinutes > 0 && chainId) {
      intervalRef.current = setInterval(() => {
        updateTokensAndCache(account, provider, chainId, setTokens, setLoading, setError, updateIntervalMinutes);
      }, updateIntervalMinutes * 60 * 1000);
    }

    // Функция очистки
    return () => {
      isMounted = false;
      // Очищаем таймер при размонтировании, если он был установлен
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [provider, account, signer, chainId, updateIntervalMinutes]); // Добавлен chainId в зависимости

  // Функция для открытия адреса токена в explorer
  const openInExplorer = (address) => {
    if (!address || !chainId) return;

    const networkConfig = getNetworkConfig(chainId);
    if (!networkConfig) return;

    let url;
    if (address === networkConfig.nativeTokenAddress) {
      // Для нативного токена открываем адрес кошелька
      url = `${networkConfig.explorerUrl}/address/${address}`;
    } else {
      // Для токенов открываем адрес контракта
      url = `${networkConfig.explorerUrl}/token/${address}`;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Функция для копирования адреса токена в буфер обмена
  const copyTokenAddress = async (address, symbol) => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      // Здесь можно добавить уведомление пользователю об успешном копировании
      console.log(`Адрес токена ${symbol} скопирован в буфер обмена`);
    } catch (err) {
      console.error('Ошибка при копировании адреса токена: ', err);
    }
  };

  // Функция для форматирования адреса
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Вычисляем общий баланс
  const totalPortfolioValue = tokens.reduce((sum, token) => {
    const value = parseFloat(token.totalValue);
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Токены в кошельке</h2>
            {account && (
              <p className="text-sm text-gray-400 mt-1">
                Адрес: <span className="font-mono">{formatAddress(account)}</span>
              </p>
            )}
            {chainId && (
              <p className="text-xs text-gray-500 mt-1">
                Сеть: {getNetworkConfig(chainId)?.name || `Chain ID: ${chainId}`}
              </p>
            )}
          </div>
          <div className="mt-2 sm:mt-0">
            <span className="text-lg font-semibold text-cyan-400">{totalPortfolioValue.toFixed(2)} $</span>
          </div>
        </div>
      </div>
      {/* Список токенов */}
      <div className="overflow-x-auto">
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Токены не найдены
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-750">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Токен</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Баланс</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Цена</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Сумма</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {tokens.map((token, index) => (
                <tr key={index} className="hover:bg-gray-750 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {token.symbol ? token.symbol.charAt(0) : '?'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{token.name || 'Unknown Token'}</div>
                        <div className="text-sm text-gray-400">{token.symbol || '???'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{parseFloat(token.balance).toFixed(8)}</div>
                    <div className="text-xs text-gray-500 font-mono">{formatAddress(token.contractAddress)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {token.price > 0 ? token.price.toFixed(4) : 'N/A'} $
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {token.totalValue > 0 ? token.totalValue.toFixed(2) : '0.00'} $
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {/* Иконка обмена */}
                      <button
                        onClick={() => handleSwap(token)}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition"
                        title="Обменять"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>

                      {/* Иконка сжигания */}
                      <button
                        onClick={() => handleBurn(token)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition"
                        title="Сжечь"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* Иконка копирования */}
                      <button
                        onClick={() => copyTokenAddress(token.contractAddress, token.symbol)}
                        className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-full transition"
                        title="Копировать адрес"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>

                      {/* Иконка просмотра */}
                      <button
                        onClick={() => openInExplorer(token.contractAddress)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition"
                        title="Посмотреть в explorer"
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
        )}
      </div>
      {/* Футер с информацией об обновлении */}
      <div className="px-6 py-4 bg-gray-750 text-xs text-gray-500 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            Данные обновляются автоматически
          </div>
          <div className="mt-1 sm:mt-0">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded transition disabled:opacity-50"
            >
              {loading ? 'Обновление...' : 'Обновить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletTokens;