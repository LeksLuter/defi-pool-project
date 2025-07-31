// frontend\src\components\WalletTokens.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
// Импортируем конфигурацию сетей
import { SUPPORTED_CHAINS } from '../config/supportedChains';

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
  // Native POL (Matic)
  '0x0000000000000000000000000000000000000000': {
    coingeckoId: 'matic-network', // CoinGecko ID для Polygon
    cmcId: '3890', // CoinMarketCap ID для POL
    name: 'Polygon Ecosystem Token',
    symbol: 'POL',
    decimals: 18
  },
  // WETH (Wrapped Ether)
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': {
    coingeckoId: 'weth',
    cmcId: '2396',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18
  },
  // USDC (USD Coin)
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': {
    coingeckoId: 'usd-coin',
    cmcId: '3408',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6
  },
  // USDT (Tether USD)
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': {
    coingeckoId: 'tether',
    cmcId: '825',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6
  },
  // DAI (Dai Stablecoin)
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': {
    coingeckoId: 'dai',
    cmcId: '4943',
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18
  }
  // Добавьте другие известные токены по необходимости
};

// Функция для получения токенов из Etherscan API (основной метод)
const fetchTokensFromEtherscan = async (accountAddress, ethProvider, chainId) => {
  const networkConfig = SUPPORTED_CHAINS[chainId];
  if (!networkConfig || !networkConfig.explorerApiKey) {
    console.warn(`Конфигурация сети ${chainId} не найдена или отсутствует API ключ`);
    return [];
  }
  const apiKey = networkConfig.explorerApiKey;

  // Определяем URL API в зависимости от сети
  let apiUrl;
  switch (chainId) {
    case 1: // Ethereum Mainnet
      apiUrl = `https://api.etherscan.io/api`;
      break;
    case 137: // Polygon Mainnet
      apiUrl = `https://api.polygonscan.com/api`;
      break;
    case 56: // BSC Mainnet
      apiUrl = `https://api.bscscan.com/api`;
      break;
    case 42161: // Arbitrum One
      apiUrl = `https://api.arbiscan.io/api`;
      break;
    case 10: // Optimism
      apiUrl = `https://api-optimistic.etherscan.io/api`;
      break;
    case 43114: // Avalanche
      apiUrl = `https://api.snowtrace.io/api`;
      break;
    case 250: // Fantom
      apiUrl = `https://api.ftmscan.com/api`;
      break;
    case 100: // Gnosis
      apiUrl = `https://api.gnosisscan.io/api`;
      break;
    default:
      console.warn(`Etherscan API не поддерживается для chainId: ${chainId}`);
      return [];
  }

  const url = `${apiUrl}?module=account&action=tokentx&address=${accountAddress}&sort=desc&page=1&offset=100&apikey=${apiKey}`;

  try {
    console.log("Попытка получения токенов через Etherscan V2 API...");

    // Установим таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    // Проверяем статус HTTP
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Etherscan API вернул HTTP статус: ${response.status}`, errorText);
      // Не бросаем ошибку, а возвращаем пустой массив, чтобы продолжить с резервным методом
      return [];
    }

    const data = await response.json();

    // Проверяем структуру и статус ответа от API
    if (!data || data.status === "0" || !data.result) {
      console.warn(`Etherscan API вернул статус 0 или ошибку: ${data?.message || 'NOTOK'}`);
      // Не бросаем ошибку, а возвращаем пустой массив, чтобы продолжить с резервным методом
      return [];
    }

    console.log(`Получено ${data.result.length} записей из Etherscan V2`);

    // Создаем Set для уникальных адресов токенов и объект для хранения метаданных
    const uniqueTokens = new Set();
    const tokenSampleData = {};

    // Обрабатываем только первые 50 токенов для ограничения API вызовов
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

    // Обрабатываем нативный токен отдельно
    try {
      const nativeBalance = await ethProvider.getBalance(accountAddress);
      // Используем BigNumber из ethers v5 для сравнения
      if (nativeBalance.gt(0)) {
        const nativeInfo = KNOWN_TOKENS_MAP['0x0000000000000000000000000000000000000000'] || { name: 'Native Token', symbol: 'NATIVE', decimals: 18 };
        tokenDetails.push({
          contractAddress: '0x0000000000000000000000000000000000000000',
          tokenName: nativeInfo.name,
          tokenSymbol: nativeInfo.symbol,
          tokenDecimal: nativeInfo.decimals,
          balance: nativeBalance.toString()
        });
      }
    } catch (error) {
      console.warn('Ошибка при получении баланса нативного токена:', error.message);
    }

    // Получаем детали токенов
    let tokenCount = 0;
    for (const tokenAddress of Array.from(uniqueTokens)) {
      if (tokenAddress === '0x0000000000000000000000000000000000000000') continue; // POL уже обработан
      if (tokenCount >= 20) {
        console.warn('Достигнут лимит обработки токенов (20), остальные пропущены');
        break;
      }
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethProvider);
        const balance = await tokenContract.balanceOf(accountAddress);

        // Используем BigNumber из ethers v5 для сравнения
        if (balance.gt(0)) {
          tokenDetails.push({
            contractAddress: tokenAddress,
            tokenName: tokenSampleData[tokenAddress]?.tokenName || 'Unknown Token',
            tokenSymbol: tokenSampleData[tokenAddress]?.tokenSymbol || '???',
            tokenDecimal: tokenSampleData[tokenAddress]?.tokenDecimal || 18,
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
    // Не бросаем ошибку, а возвращаем пустой массив, чтобы продолжить с резервным методом
    return [];
  }
};

// Функция для получения токенов через прямой вызов balanceOf (резервный метод)
const fetchTokensDirectBalance = async (accountAddress, ethProvider) => {
  if (!ethProvider || !accountAddress) return [];

  try {
    console.log('Используется резервный метод получения токенов');
    const tokens = [];

    // Проверка баланса нативного токена (POL, ETH и т.д.)
    try {
      const nativeBalance = await ethProvider.getBalance(accountAddress);
      // Используем BigNumber из ethers v5 для сравнения
      if (nativeBalance.gt(0)) {
        const nativeInfo = KNOWN_TOKENS_MAP['0x0000000000000000000000000000000000000000'] || { name: 'Native Token', symbol: 'NATIVE', decimals: 18 };
        tokens.push({
          contractAddress: '0x0000000000000000000000000000000000000000',
          tokenName: nativeInfo.name,
          tokenSymbol: nativeInfo.symbol,
          tokenDecimal: nativeInfo.decimals,
          balance: nativeBalance.toString()
        });
      }
    } catch (error) {
      console.warn('Ошибка при получении баланса нативного токена в резервном методе:', error.message);
    }

    // Проверка балансов известных токенов ERC20
    // Используем KNOWN_TOKENS_MAP для получения списка известных токенов
    const knownTokenAddresses = Object.keys(KNOWN_TOKENS_MAP);
    for (const tokenAddress of knownTokenAddresses) {
      // Пропускаем нативный токен, он уже обработан
      if (tokenAddress === '0x0000000000000000000000000000000000000000') continue;

      const tokenInfo = KNOWN_TOKENS_MAP[tokenAddress];
      if (!tokenInfo) continue;

      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethProvider);
        const balance = await tokenContract.balanceOf(accountAddress);

        if (balance.gt(0)) {
          tokens.push({
            contractAddress: tokenAddress,
            tokenName: tokenInfo.name || `Token ${tokenAddress.substring(0, 6)}`,
            tokenSymbol: tokenInfo.symbol || '???',
            tokenDecimal: tokenInfo.decimals || 18,
            balance: balance.toString()
          });
        }
      } catch (error) {
        console.warn(`Ошибка при получении баланса для ${tokenAddress}:`, error.message);
      }
    }

    return tokens;
  } catch (error) {
    console.warn('Не удалось получить токены через резервный метод:', error.message);
    return [];
  }
};

// Функция для получения цены токена с CoinGecko
const fetchTokenPriceFromCoinGecko = async (coingeckoId) => {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    const data = await response.json();
    return data[coingeckoId]?.usd || null;
  } catch (error) {
    console.warn(`Ошибка при получении цены с CoinGecko для ${coingeckoId}:`, error.message);
    return null;
  }
};

// Функция для получения цены токена с CoinMarketCap
const fetchTokenPriceFromCoinMarketCap = async (cmcId) => {
  // CoinMarketCap API требует ключ, который обычно хранится в .env
  const cmcApiKey = process.env.REACT_APP_CMC_API_KEY;
  if (!cmcApiKey) {
    console.warn('CoinMarketCap API ключ не найден в REACT_APP_CMC_API_KEY');
    return null;
  }

  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${cmcId}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`CoinMarketCap API error: ${response.status}`);
    }
    const data = await response.json();
    return data.data?.[cmcId]?.quote?.USD?.price || null;
  } catch (error) {
    console.warn(`Ошибка при получении цены с CoinMarketCap для ${cmcId}:`, error.message);
    return null;
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
    const price = await fetchTokenPriceWithFallback(coingeckoId, cmcId);
    addressToPrice[address] = price;
  }

  return addressToPrice;
};

// Вспомогательная функция для получения ключа кэша
const getCacheKey = (account, chainId) => `walletTokens_${chainId}_${account}`;

// Вспомогательная функция для получения ключа времени последнего обновления
const getLastUpdateKey = (account, chainId) => `walletTokens_lastUpdate_${chainId}_${account}`;

// Функция для проверки, устарели ли кэшированные данные
const isCacheExpired = (timestamp, maxAgeMinutes = 10) => {
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  return (now - timestamp) > maxAgeMs;
};

// Функция для получения токенов из кэша
const getCachedTokens = (account, chainId) => {
  if (!account) return null;
  try {
    const cacheKey = getCacheKey(account, chainId);
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
const saveTokensToCache = (account, chainId, tokens) => {
  if (!account || !tokens) return;
  try {
    const cacheKey = getCacheKey(account, chainId);
    const dataToCache = {
      tokens,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
    console.log("Токены сохранены в кэш");
  } catch (error) {
    console.error("Ошибка при сохранении токенов в кэш:", error);
  }
};

// Функция для установки времени последнего обновления
const setLastUpdateTime = (account, chainId) => {
  if (!account) return;
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
  if (!account) return false;
  try {
    const lastUpdateKey = getLastUpdateKey(account, chainId);
    const lastUpdateStr = localStorage.getItem(lastUpdateKey);
    if (!lastUpdateStr) return true; // Нет записи - можно обновлять

    const lastUpdate = parseInt(lastUpdateStr, 10);
    if (isNaN(lastUpdate)) return true; // Некорректная запись - можно обновлять

    // Используем ту же логику, что и для кэша
    return isCacheExpired(lastUpdate, minIntervalMinutes);
  } catch (error) {
    console.error('Ошибка при проверке возможности фонового обновления:', error);
    return true; // В случае ошибки разрешаем обновление
  }
};

// Основная функция обновления токенов и кэширования
const updateTokensAndCache = async (accountAddress, ethProvider, setTokens, setLoading, setError, updateIntervalMinutes = 0, chainId) => {
  if (!accountAddress || !ethProvider) {
    console.warn("Невозможно обновить токены: отсутствует адрес аккаунта или провайдер");
    if (setLoading) setLoading(false);
    return;
  }

  const networkConfig = SUPPORTED_CHAINS[chainId];
  if (!networkConfig || !networkConfig.explorerApiKey) {
    console.warn(`Конфигурация сети ${chainId} не найдена или отсутствует API ключ`);
    if (setError) setError(`Сеть ${chainId} не поддерживается или не настроена.`);
    if (setLoading) setLoading(false);
    return;
  }

  // Определяем минимальный интервал обновления (5 минут по умолчанию или значение из админки)
  const minInterval = updateIntervalMinutes <= 0 ? 5 : updateIntervalMinutes;

  // Проверяем кэш при первой загрузке
  const cachedTokens = getCachedTokens(accountAddress, chainId);
  if (cachedTokens) {
    setTokens(cachedTokens);
    if (setLoading) setLoading(false);

    // Планируем фоновое обновление, если кэш устарел и разрешено по интервалу
    if (isCacheExpired(cachedTokens.timestamp, updateIntervalMinutes) && canPerformBackgroundUpdate(accountAddress, chainId, minInterval)) {
      console.log('Начинаем фоновое обновление токенов...');
      if (setError) setError(null); // Сбрасываем ошибку перед новой попыткой
      let tokenList = [];

      try {
        // Попытка получить токены через Etherscan API
        try {
          console.log("Попытка получения токенов через Etherscan V2 API...");
          tokenList = await fetchTokensFromEtherscan(accountAddress, ethProvider, chainId);
          if (tokenList.length === 0) {
            console.log("Etherscan V2 API не вернул токенов, пробуем резервный метод...");
            tokenList = await fetchTokensDirectBalance(accountAddress, ethProvider);
          }
        } catch (apiError) {
          console.warn("Ошибка при вызове Etherscan V2 API, пробуем резервный метод:", apiError.message);
          tokenList = await fetchTokensDirectBalance(accountAddress, ethProvider);
        }

        // Преобразуем данные токенов в формат для отображения
        const processedTokens = tokenList.filter(token => {
          try {
            // Используем BigNumber из ethers v5 для проверки
            const balanceBN = ethers.BigNumber.from(token.balance);
            return balanceBN.gt(0);
          } catch (e) {
            console.warn("Ошибка при проверке баланса BN:", e.message);
            return false;
          }
        }).map(tokenInfo => {
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
        }).filter(Boolean); // Убираем null значения

        // Получаем цены для токенов, если есть обработанные токены
        if (processedTokens.length > 0) {
          try {
            // Создаем карту адресов токенов с их ID для API
            const tokenPriceMap = {};
            processedTokens.forEach(token => {
              const address = token.contractAddress.toLowerCase();
              if (KNOWN_TOKENS_MAP[address]) {
                tokenPriceMap[address] = KNOWN_TOKENS_MAP[address];
              }
            });

            // Получаем цены для известных токенов
            const addressToPrice = await fetchMultipleTokenPricesWithFallback(tokenPriceMap);

            // Обновляем цены и общую стоимость в processedTokens
            processedTokens.forEach(token => {
              const address = token.contractAddress.toLowerCase();
              const price = addressToPrice[address] || 0;
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

        // Сохраняем обновленный список в кэш и состояние
        saveTokensToCache(accountAddress, chainId, processedTokens);
        setTokens(processedTokens);
        setLastUpdateTime(accountAddress, chainId); // Обновляем время последнего обновления

      } catch (err) {
        console.error("Критическая ошибка при фоновом обновлении токенов:", err);
        // Ошибка фонового обновления не должна перезаписывать отображаемые данные из кэша
        // if (tokens.length === 0) {
        // setError(`Не удалось обновить балансы токенов: ${err.message || 'Неизвестная ошибка'}`);
        // }
      }
    }
    return; // Завершаем, так как данные уже загружены из кэша
  }

  // Если кэша нет
  console.log('Начальное получение токенов...');
  if (setLoading) setLoading(true);
  if (setError) setError(null);
  let tokenList = [];

  try {
    // Попытка получить токены через Etherscan API
    try {
       console.log("Попытка получения токенов через Etherscan V2 API...");
       tokenList = await fetchTokensFromEtherscan(accountAddress, ethProvider, chainId);
       if (tokenList.length === 0) {
          console.log("Etherscan V2 API не вернул токенов, пробуем резервный метод...");
          tokenList = await fetchTokensDirectBalance(accountAddress, ethProvider);
       }
    } catch (apiError) {
       console.warn("Ошибка при вызове Etherscan V2 API, пробуем резервный метод:", apiError.message);
       tokenList = await fetchTokensDirectBalance(accountAddress, ethProvider);
    }

    // Преобразуем данные токенов в формат для отображения
    const processedTokens = tokenList.filter(token => {
       try {
          const balanceBN = ethers.BigNumber.from(token.balance);
          return balanceBN.gt(0);
       } catch (e) {
          console.warn("Ошибка при проверке баланса BN:", e.message);
          return false;
       }
    }).map(tokenInfo => {
       try {
          const balanceBN = ethers.BigNumber.from(tokenInfo.balance);
          const formattedBalance = ethers.utils.formatUnits(balanceBN, tokenInfo.tokenDecimal);
          return {
             contractAddress: tokenInfo.contractAddress,
             name: tokenInfo.tokenName,
             symbol: tokenInfo.tokenSymbol,
             balance: formattedBalance,
             price: 0,
             totalValue: 0,
             decimals: tokenInfo.tokenDecimal
          };
       } catch (e) {
          console.error("Ошибка при обработке токена:", e.message);
          return null;
       }
    }).filter(Boolean);

    // Получаем цены для токенов, если есть обработанные токены
    if (processedTokens.length > 0) {
      try {
        // Создаем карту адресов токенов с их ID для API
        const tokenPriceMap = {};
        processedTokens.forEach(token => {
          const address = token.contractAddress.toLowerCase();
          if (KNOWN_TOKENS_MAP[address]) {
            tokenPriceMap[address] = KNOWN_TOKENS_MAP[address];
          }
        });

        // Получаем цены для известных токенов
        const addressToPrice = await fetchMultipleTokenPricesWithFallback(tokenPriceMap);

        // Обновляем цены и общую стоимость в processedTokens
        processedTokens.forEach(token => {
          const address = token.contractAddress.toLowerCase();
          const price = addressToPrice[address] || 0;
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

    saveTokensToCache(accountAddress, chainId, processedTokens);
    setTokens(processedTokens);
    setLastUpdateTime(accountAddress, chainId); // Обновляем время последнего обновления

  } catch (err) {
    console.error("Критическая ошибка при получении балансов токенов:", err);
    if (setError) {
       // Устанавливаем ошибку в состояние, если нет данных для отображения
       // if (tokens.length === 0) {
       setError(`Не удалось получить балансы токенов: ${err.message || 'Неизвестная ошибка'}`);
       // }
    }
  } finally {
    if (setLoading) setLoading(false);
  }
};

const WalletTokens = ({ updateIntervalMinutes, isAdmin }) => {
  const { provider, account, signer, chainId } = useWeb3(); // chainId добавлен
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null); // useRef для хранения ID интервала
  // Состояние для фильтра сетей
  // По умолчанию активна только сеть из контекста chainId
  // showMoreChains управляет отображением НЕактивных сетей
  const [showMoreChains, setShowMoreChains] = useState(false);

  // Функция для обновления токенов с учетом кэширования
  const handleRefresh = async () => {
    if (!account || !provider) return;
    setLoading(true);
    setError(null);
    await updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes, chainId);
    setLoading(false); // Убираем состояние загрузки после обновления
  };

  // Эффект для инициализации: сначала из кэша, потом обновление
  useEffect(() => {
    let isMounted = true;
    const initializeTokens = async () => {
      if (!account || !provider || !chainId) { // Добавлен chainId
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
      await updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes, chainId);
    };

    // Очищаем предыдущий интервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    initializeTokens();

    // Устанавливаем новый интервал, если updateIntervalMinutes > 0
    if (updateIntervalMinutes > 0) {
      intervalRef.current = setInterval(() => {
        updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes, chainId);
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
  }, [provider, account, signer, updateIntervalMinutes, chainId]); // Добавлены signer, updateIntervalMinutes и chainId в зависимости

  // Функция для открытия адреса токена в Polygonscan (или explorer соответствующей сети)
  const openInExplorer = (address) => {
    if (address && address !== '0x0000000000000000000000000000000000000000' && chainId) {
      const explorerUrl = SUPPORTED_CHAINS[chainId]?.explorerUrl;
      if (explorerUrl) {
        const url = `${explorerUrl}/token/${address}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Функция для копирования адреса токена в буфер обмена
  const copyTokenAddress = (address) => {
    if (address) {
      navigator.clipboard.writeText(address).then(() => {
        // Можно добавить уведомление об успешном копировании
        console.log('Адрес токена скопирован в буфер обмена');
      }).catch(err => {
        console.error('Ошибка при копировании адреса токена: ', err);
      });
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

  // Фильтрация токенов по активным сетям
  // В текущей реализации все токены считаются принадлежащими сети Polygon (chainId 137)
  // Поэтому фильтрация по chainId не применяется напрямую к токенам
  // Но для будущей мультичейн реализации это важно учитывать
  const filteredTokens = tokens.filter(token => {
    // Пока что фильтрация не применяется, так как все токены из Polygon
    // В будущем можно добавить проверку token.chainId === chainId
    return true;
  });

  // Расчет баланса по сетям (в данном случае только для Polygon)
  // Для текущей реализации мы предполагаем, что все токены принадлежат активной сети
  const chainBalances = {};
  if (chainId) {
    // Предполагаем, что все токены принадлежат активной сети
    // В реальной мультичейн реализации нужно группировать токены по их chainId
    chainBalances[chainId] = totalPortfolioValue;
  }

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
      <div className="px-6 py-4 bg-gray-750 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Мои токены</h2>
            {account && (
              <p className="text-sm text-gray-400 mt-1">
                Адрес кошелька: <span className="font-mono">{formatAddress(account)}</span>
              </p>
            )}
          </div>
          <div className="mt-2 sm:mt-0 text-sm text-gray-400">
            <p>Общий баланс: ${totalPortfolioValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Фильтры сетей */}
      <div className="px-6 py-3 bg-gray-750/50 border-b border-gray-700 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Сеть:</span>
        {/* Активная сеть */}
        {chainId && SUPPORTED_CHAINS[chainId] && (
          <button
            className="px-3 py-1 bg-cyan-600 text-white text-xs rounded-full flex items-center"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
            {SUPPORTED_CHAINS[chainId].name}
          </button>
        )}
        {/* Другие сети (если showMoreChains=true) */}
        {showMoreChains && Object.entries(SUPPORTED_CHAINS).filter(([idStr]) => parseInt(idStr) !== chainId) // Исключаем активную сеть
          .map(([chainIdStr, config]) => {
            const id = parseInt(chainIdStr);
            // Все остальные сети считаются "неактивными" для фильтрации токенов
            // Но для отображения в UI они просто не выбраны
            const balance = 0; // Баланс для неактивных сетей 0
            const percentage = 0;
            return (
              <button
                key={id}
                // Нажатие на неактивную сеть не переключает её, так как это фильтр
                // Если нужно сделать переключение сетей, нужно изменить логику
                // Сейчас это просто информационный список
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-full flex items-center opacity-70"
              >
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                {config.name}
                {balance > 0 && (
                  <span className="ml-1 text-gray-300">
                    ({percentage.toFixed(1)}%)
                  </span>
                )}
              </button>
            );
          })}
        <button
          onClick={() => setShowMoreChains(!showMoreChains)}
          className="ml-auto text-xs text-cyan-400 hover:text-cyan-300"
        >
          {showMoreChains ? 'Скрыть' : 'Показать все'}
        </button>
      </div>

      {/* Таблица токенов */}
      <div className="overflow-x-auto">
        {filteredTokens.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-2">У вас пока нет токенов или не удалось загрузить данные.</p>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Обновление...' : 'Обновить сейчас'}
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/30">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Токен</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Баланс</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Цена</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Сумма</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredTokens.map((token, index) => (
                <tr key={index} className="hover:bg-gray-750 transition duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                        {token.symbol.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{token.name}</div>
                        <div className="text-sm text-gray-400">{token.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">
                    {parseFloat(token.balance).toFixed(8)}
                    <div className="text-xs text-gray-500 font-mono">{formatAddress(token.contractAddress)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {token.price > 0 ? `$${token.price.toFixed(4)}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {token.totalValue > 0 ? `$${token.totalValue.toFixed(2)}` : '$0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {/* Иконка копирования адреса токена */}
                      <button
                        onClick={() => copyTokenAddress(token.contractAddress)}
                        className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-full transition"
                        title="Копировать адрес"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {/* Иконка просмотра на explorer */}
                      {token.contractAddress !== '0x0000000000000000000000000000000000000000' && (
                        <button
                          onClick={() => openInExplorer(token.contractAddress)}
                          className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-full transition"
                          title="Просмотр на explorer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      )}
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
          <div>Данные обновляются автоматически</div>
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