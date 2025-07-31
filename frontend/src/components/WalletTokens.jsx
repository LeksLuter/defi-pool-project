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
    cmcId: '3890' // CoinMarketCap ID для POL
  },
  // WETH (Wrapped Ether)
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': {
    coingeckoId: 'weth',
    cmcId: '2396'
  },
  // USDC (USD Coin)
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': {
    coingeckoId: 'usd-coin',
    cmcId: '3408'
  },
  // USDT (Tether USD)
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': {
    coingeckoId: 'tether',
    cmcId: '825'
  }
};

// Вспомогательная функция для получения ключа кэша
const getCacheKey = (account) => `walletTokens_${account}`;

// Вспомогательная функция для получения ключа времени последнего обновления
const getLastUpdateKey = (account) => `walletTokens_lastUpdate_${account}`;

// Функция для проверки, устарели ли кэшированные данные
const isCacheExpired = (timestamp, maxAgeMinutes = 10) => {
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

// Функция для сохранения времени последнего обновления
const saveLastUpdateTime = (account) => {
  if (!account) return;
  try {
    const lastUpdateKey = getLastUpdateKey(account);
    localStorage.setItem(lastUpdateKey, Date.now().toString());
  } catch (error) {
    console.error('Ошибка при сохранении времени последнего обновления:', error);
  }
};

// Функция для проверки, можно ли выполнить фоновое обновление
// (прошло ли достаточно времени с последнего обновления)
const canPerformBackgroundUpdate = (account, minIntervalMinutes = 5) => {
  if (!account) return false;
  try {
    const lastUpdateKey = getLastUpdateKey(account);
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
const fetchTokensFromEtherscanV2 = async (accountAddress, ethProvider) => {
  if (!ethProvider || !accountAddress) return [];
  try {
    console.log('Попытка получения токенов через Etherscan V2 API...');
    // Используем API ключ из переменных окружения
    const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
    const url = `https://api.polygonscan.com/api?module=account&action=tokenlist&address=${accountAddress}&apikey=${apiKey}`;
    // Установим таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Etherscan API error (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    if (data.status !== "1") {
      console.warn("Etherscan API вернул статус 0 или ошибку:", data.message);
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
    // Обрабатываем ERC-20 токены
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
const updateTokensAndCache = async (accountAddress, ethProvider, setTokens, setLoading, setError, updateIntervalMinutes = 0) => {
  // Определяем минимальный интервал обновления (5 минут по умолчанию или значение из админки)
  const minInterval = updateIntervalMinutes <= 0 ? 5 : updateIntervalMinutes;
  if (!canPerformBackgroundUpdate(accountAddress, minInterval)) {
    console.log(`Фоновое обновление пропущено: последнее обновление было менее ${minInterval} минут назад.`);
    // Даже если фоновое обновление пропущено, мы всё равно можем показать кэш
    // и завершить состояние загрузки, если оно ещё активно
    // if (loading && setTokens.length === 0) { // Исправлена опечатка: было setTokens.length, должно быть tokens.length из состояния
    //   setLoading(false); // Это будет вызвано в useEffect
    // }
    return;
  }
  console.log('Начинаем фоновое обновление токенов...');
  setError(null); // Сбрасываем ошибку перед новой попыткой
  let tokenList = [];
  try {
    // Попытка получить токены через Etherscan V2 API
    try {
      tokenList = await fetchTokensFromEtherscanV2(accountAddress, ethProvider);
      if (tokenList.length === 0) {
        console.log("Etherscan V2 API не вернул токенов, пробуем резервный метод...");
        tokenList = await fetchTokensDirectBalance(accountAddress, ethProvider);
      }
    } catch (apiError) {
      console.warn("Ошибка при вызове Etherscan V2 API, пробуем резервный метод:", apiError.message);
      tokenList = await fetchTokensDirectBalance(accountAddress, ethProvider);
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
    // Сохраняем в состояние и кэш
    setTokens(processedTokens);
    saveTokensToCache(accountAddress, processedTokens);
    saveLastUpdateTime(accountAddress);
  } catch (err) {
    console.error("Критическая ошибка при получении балансов токенов:", err);
    // Не устанавливаем ошибку в состояние, если у нас есть кэш, чтобы не перезаписывать отображаемые данные
    // if (tokens.length === 0) { // Это будет проверено в компоненте
    //   setError(`Не удалось получить балансы токенов: ${err.message || 'Неизвестная ошибка'}`);
    // }
    // В случае ошибки обновления, можно попробовать загрузить из кэша
    // (хотя кэш уже должен быть загружен в useEffect)
    // const cachedTokens = getCachedTokens(accountAddress);
    // if (cachedTokens) {
    //   setTokens(cachedTokens);
    // }
  } finally {
    // if (loading) { // Это будет проверено в компоненте
    //   setLoading(false);
    // }
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
    await updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes);
    setLoading(false); // Убираем состояние загрузки после обновления
  };

  // Эффект для инициализации: сначала из кэша, потом обновление
  useEffect(() => {
    let isMounted = true;
    const initializeTokens = async () => {
      if (!account || !provider) {
        if (isMounted) {
          setTokens([]);
          setLoading(false);
        }
        return;
      }
      // 1. Попробуем загрузить из кэша
      const cachedTokens = getCachedTokens(account);
      if (cachedTokens && isMounted) {
        setTokens(cachedTokens);
        setLoading(false); // Показываем кэшированные данные сразу
      }
      // 2. Запускаем обновление в фоне
      await updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes);
    };
    // Очищаем предыдущий интервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    initializeTokens();
    // Устанавливаем новый интервал, если updateIntervalMinutes > 0
    if (updateIntervalMinutes > 0) {
      intervalRef.current = setInterval(() => {
        updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes);
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
  }, [provider, account, signer, updateIntervalMinutes]); // Добавлены signer и updateIntervalMinutes в зависимости

  // Функция для открытия адреса токена в Polygonscan
  const openInPolygonscan = (address) => {
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      const url = `https://polygonscan.com/token/${address}`;
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
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Токены в кошельке</h2>
            {account && (
              <p className="text-sm text-gray-400 mt-1">
                Адрес: <span className="font-mono">{formatAddress(account)}</span>
              </p>
            )}
          </div>
          <div className="mt-2 sm:mt-0">
            <span className="text-lg font-semibold text-cyan-400">{totalPortfolioValue.toFixed(2)} $</span>
          </div>
        </div>
      </div>
      
      {/* Блок фильтра сетей - теперь всегда отображается */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex flex-wrap gap-2">
          {/* Всегда отображаем активную сеть */}
          {chainId && SUPPORTED_CHAINS[chainId] && (
            <button
              key={chainId}
              // Активная сеть всегда "активна" визуально, но не переключается
              // onClick={() => {}} // Можно оставить пустым или убрать onClick
              className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm bg-gray-700 border border-cyan-500/30`}
              disabled // Делаем её неактивной для кликов, так как это текущая сеть
            >
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
              <div className="text-left">
                <div className="font-medium text-white">{SUPPORTED_CHAINS[chainId].name}</div>
                <div className="text-xs text-gray-400">
                  ${chainBalances[chainId]?.toFixed(2) || '0.00'} (100%)
                </div>
              </div>
            </button>
          )}

          {/* Отображаем/скрываем НЕактивные сети по кнопке */}
          {showMoreChains && Object.entries(SUPPORTED_CHAINS)
            .filter(([idStr]) => parseInt(idStr) !== chainId) // Исключаем активную сеть
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
                  className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm bg-gray-800 border border-gray-600 opacity-70`}
                  title="Сеть не активна. Переключите сеть в кошельке."
                >
                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  <div className="text-left">
                    <div className="font-medium text-gray-400">{config.name}</div>
                    <div className="text-xs text-gray-500">
                      ${balance.toFixed(2)} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                </button>
              );
            })}
          
          {/* Кнопка "Показать/Скрыть другие сети" */}
          {Object.keys(SUPPORTED_CHAINS).length > 1 && (
            <button 
              onClick={() => setShowMoreChains(!showMoreChains)}
              className="px-3 py-2 rounded-md bg-gray-800 border border-gray-600 text-sm text-gray-400 hover:text-white transition"
            >
              {showMoreChains ? 'Скрыть другие сети' : `Показать другие сети (${Object.keys(SUPPORTED_CHAINS).length - 1})`}
            </button>
          )}
        </div>
      </div>

      {/* Список токенов */}
      <div className="overflow-x-auto">
        {filteredTokens.length === 0 ? (
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
              {filteredTokens.map((token, index) => (
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
                        onClick={() => openInPolygonscan(token.contractAddress)}
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