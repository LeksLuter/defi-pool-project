import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  },
  // DAI (Dai Stablecoin)
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': {
    coingeckoId: 'dai',
    cmcId: '4943'
  },
  // WBTC (Wrapped Bitcoin)
  '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': {
    coingeckoId: 'wrapped-bitcoin',
    cmcId: '3717'
  },
  // AAVE
  '0xd6df932a45c0f255f85145f286ea0b292b21c90b': {
    coingeckoId: 'aave',
    cmcId: '7278'
  },
  // CRV
  '0x172370d5cd63279efa6d502dab29171933a610af': {
    coingeckoId: 'curve-dao-token',
    cmcId: '6538'
  }
  // Добавьте другие известные токены по необходимости
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
    const cachedData = localStorage.getItem(getCacheKey(account));
    const lastUpdateStr = localStorage.getItem(getLastUpdateKey(account));
    if (cachedData && lastUpdateStr) {
      const lastUpdate = parseInt(lastUpdateStr, 10);
      if (!isNaN(lastUpdate) && !isCacheExpired(lastUpdate, 10)) { // Используем тот же интервал
        return JSON.parse(cachedData);
      } else {
        // Кэш устарел, удаляем
        localStorage.removeItem(getCacheKey(account));
        localStorage.removeItem(getLastUpdateKey(account));
      }
    }
  } catch (err) {
    console.error('Ошибка при получении токенов из кэша:', err);
    // Очищаем кэш в случае ошибки
    localStorage.removeItem(getCacheKey(account));
    localStorage.removeItem(getLastUpdateKey(account));
  }
  return null;
};

// Функция для сохранения токенов в кэш
const setCachedTokens = (account, tokens) => {
  if (!account) return;
  try {
    localStorage.setItem(getCacheKey(account), JSON.stringify(tokens));
    localStorage.setItem(getLastUpdateKey(account), Date.now().toString());
  } catch (err) {
    console.error('Ошибка при сохранении токенов в кэш:', err);
    // Очищаем кэш в случае ошибки (например, переполнения)
    localStorage.removeItem(getCacheKey(account));
    localStorage.removeItem(getLastUpdateKey(account));
  }
};

// Функция для получения цен токенов (резервная реализация)
const fetchMultipleTokenPricesWithFallback = async (tokenPriceMap) => {
  // В упрощенном виде, возвращаем фиксированные цены или 0
  // Замените на реальный вызов API, например, CoinGecko
  console.warn(`Функция fetchMultipleTokenPricesWithFallback не реализована. Возвращаю 0 для всех токенов.`);
  const prices = {};
  Object.keys(tokenPriceMap).forEach(address => {
    prices[address] = 0; // ИЛИ какая-то логика получения цены
  });
  return prices;
};

// Функция для получения токенов через Etherscan V2 API
const fetchTokensFromEtherscanV2 = async (accountAddress, ethProvider) => {
  if (!ethProvider || !accountAddress) return [];

  try {
    console.log('Получение токенов через Etherscan V2 API для адреса:', accountAddress);
    // Заглушка для Etherscan API
    // В реальном приложении здесь будет запрос к API Etherscan
    // const response = await fetch(`https://api.polygonscan.com/api?module=account&action=tokentx&address=${accountAddress}&startblock=0&endblock=99999999&sort=asc&apikey=YOUR_API_KEY`);
    // const data = await response.json();
    // if (data.status !== "1") throw new Error(data.message || "Ошибка Etherscan API");
    // return data.result;
    console.warn('Etherscan API не реализован в этой заглушке. Возвращаю пустой массив.');
    return []; // Заглушка
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

    // Пример списка токенов для проверки (можно загружать динамически)
    // В реальном приложении этот список должен быть более полным или получаться другим способом
    const tokenList = [
      { address: '0x0000000000000000000000000000000000000000', name: 'Polygon Ecosystem Token', symbol: 'POL', decimals: 18 },
      { address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', name: 'Wrapped Ether', symbol: 'WETH', decimals: 18 },
      { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', name: 'USD Coin', symbol: 'USDC', decimals: 6 },
      { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', name: 'Tether USD', symbol: 'USDT', decimals: 6 },
      { address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', name: 'Dai Stablecoin', symbol: 'DAI', decimals: 18 },
      { address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', name: 'Wrapped Bitcoin', symbol: 'WBTC', decimals: 8 },
      { address: '0xd6df932a45c0f255f85145f286ea0b292b21c90b', name: 'Aave Token', symbol: 'AAVE', decimals: 18 },
      { address: '0x172370d5cd63279efa6d502dab29171933a610af', name: 'Curve DAO Token', symbol: 'CRV', decimals: 18 },
      // Добавьте другие токены по необходимости
    ];

    // Проверяем баланс для каждого токена
    for (const token of tokenList) {
      try {
        if (token.address === '0x0000000000000000000000000000000000000000') {
          // Для нативного токена используем getBalance
          const balance = await ethProvider.getBalance(accountAddress);
          // Используем BigNumber из ethers v5 для сравнения
          if (balance.gt(0)) {
            tokens.push({
              contractAddress: token.address,
              tokenName: token.name,
              tokenSymbol: token.symbol,
              tokenDecimal: token.decimals,
              balance: balance.toString()
            });
          }
        } else {
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, ethProvider);
          const balance = await tokenContract.balanceOf(accountAddress);
          // Используем BigNumber из ethers v5 для сравнения
          if (balance.gt(0)) {
            tokens.push({
              contractAddress: token.address,
              tokenName: token.name,
              tokenSymbol: token.symbol,
              tokenDecimal: token.decimals,
              balance: balance.toString()
            });
          }
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
const updateTokensAndCache = async (
  accountAddress,
  ethProvider,
  setTokens,
  setLoading,
  setError,
  updateIntervalMinutes = 0
) => {
  if (!accountAddress || !ethProvider) {
    console.log("Нет адреса аккаунта или провайдера, пропускаем обновление");
    // Не устанавливаем setLoading(false) здесь, это будет проверено в компоненте
    return;
  }

  // Если это фоновое обновление (updateIntervalMinutes > 0), не показываем спиннер
  const isBackgroundUpdate = updateIntervalMinutes > 0;
  if (!isBackgroundUpdate) {
    setLoading(true);
  }

  try {
    // Пытаемся получить токены из кэша, если это не фоновое обновление
    if (!isBackgroundUpdate) {
      const cachedTokens = getCachedTokens(accountAddress);
      if (cachedTokens) {
        console.log("Загрузка токенов из кэша");
        setTokens(cachedTokens);
        // Не устанавливаем setLoading(false) здесь, так как мы продолжаем обновление
      }
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
      const processedTokens = tokenList.filter(token => {
        try {
          // Используем BigNumber из ethers v5 для проверки
          const balanceBN = ethers.BigNumber.from(token.balance);
          return balanceBN.gt(0);
        } catch (e) {
          console.warn("Ошибка при проверке баланса BN:", e.message);
          return false;
        }
      }).map(token => {
        const address = token.contractAddress.toLowerCase();
        return {
          contractAddress: token.contractAddress,
          tokenName: token.tokenName || 'Unknown Token',
          tokenSymbol: token.tokenSymbol || '???',
          tokenDecimal: token.tokenDecimal || 18,
          balance: token.balance,
          // Добавляем chainId для фильтрации (в данном случае всегда Polygon)
          chainId: 137, // Заглушка: все токены считаются принадлежащими Polygon
          // Инициализируем цену и общую стоимость
          price: 0,
          totalValue: "0.00"
        };
      }).filter(Boolean); // Убираем null значения

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
              try {
                const balanceFormatted = ethers.utils.formatUnits(token.balance, token.tokenDecimal);
                const value = parseFloat(balanceFormatted) * price;
                token.totalValue = value.toFixed(2);
              } catch (formatError) {
                console.warn(`Ошибка форматирования баланса для ${token.tokenSymbol}:`, formatError.message);
                token.totalValue = "0.00";
              }
            } else {
              token.totalValue = "0.00";
            }
          });
        } catch (priceError) {
          console.error("Ошибка при получении цен токенов:", priceError);
          // В случае ошибки с ценами, оставляем totalValue как "0.00"
        }
      }

      // Сохраняем в состояние
      setTokens(processedTokens);
      // Сохраняем в кэш
      setCachedTokens(accountAddress, processedTokens);

    } catch (err) {
      console.error("Критическая ошибка при получении балансов токенов:", err);
      // Не устанавливаем ошибку в состояние, если у нас есть кэш, чтобы не перезаписывать отображаемые данные
      // if (tokens.length === 0) { // Это будет проверено в компоненте
      // setError(`Не удалось получить балансы токенов: ${err.message || 'Неизвестная ошибка'}`);
      // }
      // В случае ошибки обновления, можно попробовать загрузить из кэша
      // (хотя кэш уже должен быть загружен в useEffect)
      // const cachedTokens = getCachedTokens(accountAddress);
      // if (cachedTokens) {
      // setTokens(cachedTokens);
      // }
    } finally {
      // if (loading) { // Это будет проверено в компоненте
      // setLoading(false);
      // }
    }
  } catch (err) {
    console.error("Ошибка в updateTokensAndCache:", err);
    setError(`Не удалось обновить список токенов: ${err.message || 'Неизвестная ошибка'}`);
  } finally {
    if (!isBackgroundUpdate) {
      setLoading(false);
    }
  }
};

// Функция для форматирования адреса
const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const WalletTokens = ({ updateIntervalMinutes, isAdmin }) => {
  const { provider, account, signer, chainId: contextChainId } = useWeb3(); // Получаем chainId из контекста
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null); // useRef для хранения ID интервала

  // Состояние для фильтра сетей
  // По умолчанию активна только сеть из контекста chainId
  const [activeChains, setActiveChains] = useState([]);
  const [showMoreChains, setShowMoreChains] = useState(false);

  // Вычисляем уникальные chainId из полученных токенов
  const uniqueChainIdsFromTokens = useMemo(() => {
    const chainIds = tokens.map(token => token.chainId).filter(id => id !== undefined);
    return [...new Set(chainIds)];
  }, [tokens]);

  // Инициализируем activeChains при изменении contextChainId или токенов
  useEffect(() => {
    if (contextChainId) {
      // Устанавливаем активную сеть из контекста, если она есть
      setActiveChains([contextChainId]);
    } else if (uniqueChainIdsFromTokens.length > 0) {
      // Если contextChainId не доступен, используем первую сеть из токенов
      setActiveChains([uniqueChainIdsFromTokens[0]]);
    } else {
      // Если нет ни контекста, ни токенов, активных сетей нет
      setActiveChains([]);
    }
  }, [contextChainId, uniqueChainIdsFromTokens]);

  // Функция для обновления токенов с учетом кэширования
  const handleRefresh = async () => {
    if (!account || !provider) return;
    setLoading(true);
    setError(null);
    await updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes);
    // setLoading(false); // Убираем здесь, так как setLoading(false) вызывается внутри updateTokensAndCache
  };

  // Эффект для инициализации: сначала из кэша, потом обновление
  useEffect(() => {
    let isMounted = true;
    const initializeTokens = async () => {
      if (!account || !provider) {
        if (isMounted) {
          setTokens([]); // Очищаем токены, если нет аккаунта или провайдера
          setLoading(false);
        }
        return;
      }

      // Пытаемся получить токены из кэша
      const cachedTokens = getCachedTokens(account);
      if (cachedTokens && isMounted) {
        console.log("Загрузка токенов из кэша");
        setTokens(cachedTokens);
        setLoading(false); // Показываем кэшированные данные, скрываем спиннер
      }

      // Обновляем токены из блокчейна
      await updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes);
    };

    initializeTokens();

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [account, provider, updateIntervalMinutes]); // Убраны signer и contextChainId из зависимостей, так как они обрабатываются отдельно

  // Эффект для установки интервала обновления
  useEffect(() => {
    if (!account || !provider || updateIntervalMinutes <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Очищаем предыдущий интервал, если он был
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      console.log("Автоматическое обновление токенов по интервалу");
      // Выполняем фоновое обновление без показа спиннера
      updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes);
    }, updateIntervalMinutes * 60 * 1000);

    // Очистка интервала при размонтировании или изменении зависимостей
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [account, provider, updateIntervalMinutes]);

  // Вычисляем общий баланс
  const totalPortfolioValue = tokens.reduce((sum, token) => {
    const value = parseFloat(token.totalValue);
    return isNaN(value) ? sum : sum + value;
  }, 0);

  // Функции-заглушки для обмена и сжигания
  const handleSwap = (token) => {
    console.log("Обмен токена:", token);
    alert(`Функция обмена для ${token.tokenSymbol} будет реализована`);
  };

  const handleBurn = (token) => {
    console.log("Сжечь токен:", token);
    alert(`Функция сжигания для ${token.tokenSymbol} будет реализована`);
  };

  // Фильтрация токенов по активным сетям
  const filteredTokens = tokens.filter(token => activeChains.includes(token.chainId));

  // Расчет баланса по сетям
  const chainBalances = {};
  activeChains.forEach(chainId => {
    const chainTokens = tokens.filter(token => token.chainId === chainId);
    const balance = chainTokens.reduce((sum, token) => {
      const value = parseFloat(token.totalValue);
      return isNaN(value) ? sum : sum + value;
    }, 0);
    chainBalances[chainId] = balance;
  });

  if (loading && tokens.length === 0) { // Показываем спиннер только если нет кэшированных данных
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error && tokens.length === 0) { // Показываем ошибку только если нет кэшированных данных
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Ошибка: {error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Шапка с заголовком, адресом и общей суммой */}
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
            <span className="text-lg font-semibold text-cyan-400">
              {totalPortfolioValue.toFixed(2)} $
            </span>
          </div>
        </div>
      </div>

      {/* Блок фильтра сетей - плиточный дизайн */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-300 mr-2">Сети:</span>
          {uniqueChainIdsFromTokens.length > 0 ? (
            uniqueChainIdsFromTokens.map(chainId => {
              const chain = SUPPORTED_CHAINS[chainId];
              const isActive = activeChains.includes(chainId);
              return (
                <button
                  key={chainId}
                  onClick={() => {
                    if (isActive) {
                      // Если сеть активна, убираем её из активных
                      setActiveChains(prev => prev.filter(id => id !== chainId));
                    } else {
                      // Если сеть не активна, добавляем её к активным
                      setActiveChains(prev => [...prev, chainId]);
                    }
                  }}
                  className={`px-3 py-1 text-sm rounded-full flex items-center ${
                    isActive ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } transition-colors`}
                  title={chain ? chain.name : `Chain ${chainId}`}
                >
                  {chain && chain.logo && (
                    <img
                      src={chain.logo}
                      alt={chain.name}
                      className="w-4 h-4 mr-1 rounded-full"
                    />
                  )}
                  {chain ? chain.name : `Chain ${chainId}`}
                </button>
              );
            })
          ) : (
            <span className="text-gray-500 text-sm">
              {contextChainId && SUPPORTED_CHAINS[contextChainId]
                ? `Нет токенов в ${SUPPORTED_CHAINS[contextChainId].name}`
                : 'Нет токенов для отображения'}
            </span>
          )}
          {/* Кнопка "Еще" */}
          <button
            onClick={() => setShowMoreChains(!showMoreChains)}
            className="ml-auto text-cyan-500 hover:text-cyan-400 text-sm flex items-center"
          >
            Еще
            <svg
              className={`w-4 h-4 ml-1 transform transition-transform ${
                showMoreChains ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>

        {/* Выпадающий список дополнительных сетей */}
        {showMoreChains && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(SUPPORTED_CHAINS)
              .filter(([idStr]) => {
                const id = parseInt(idStr);
                // Показываем сети, которые есть в SUPPORTED_CHAINS, но нет в uniqueChainIdsFromTokens
                return !uniqueChainIdsFromTokens.includes(id);
              })
              .map(([chainIdStr, chain]) => {
                const id = parseInt(chainIdStr);
                const isActive = activeChains.includes(id);
                // Все остальные сети считаются "неактивными" для фильтрации токенов
                // Но для отображения в UI они просто не выбраны
                const balance = 0; // Баланс для неактивных сетей 0
                const percentage = 0;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (isActive) {
                        // Если сеть активна, убираем её из активных
                        setActiveChains(prev => prev.filter(chainId => chainId !== id));
                      } else {
                        // Если сеть не активна, добавляем её к активным
                        setActiveChains(prev => [...prev, id]);
                      }
                      setShowMoreChains(false); // Закрываем список после выбора
                    }}
                    className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                      isActive
                        ? 'bg-gray-700 border border-cyan-500/30'
                        : 'bg-gray-800 border border-gray-600'
                    }`}
                    title={chain.name}
                  >
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    <div className="text-left">
                      <div className="font-medium text-white">{chain.name}</div>
                      <div className="text-xs text-gray-400">
                        ${balance.toFixed(2)} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* Список токенов */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-750">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Токен
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Баланс
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Стоимость
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token) => (
                <tr key={`${token.chainId}-${token.contractAddress}`} className="hover:bg-gray-750 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {/* Логотип токена (заглушка) */}
                      <div className="bg-gray-600 border-2 border-dashed rounded-xl w-10 h-10" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{token.tokenName}</div>
                        <div className="text-sm text-gray-400">{token.tokenSymbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">
                    {ethers.utils.formatUnits(token.balance, token.tokenDecimal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-cyan-400">
                    {token.totalValue} $
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleSwap(token)}
                      className="text-cyan-500 hover:text-cyan-400 mr-3"
                      title="Обменять"
                    >
                      Обмен
                    </button>
                    <button
                      onClick={() => handleBurn(token)}
                      className="text-red-500 hover:text-red-400"
                      title="Сжечь"
                    >
                      Сжечь
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  Нет токенов для отображения в выбранных сетях.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Блок с балансами по сетям */}
      {Object.keys(chainBalances).length > 0 && (
        <div className="px-6 py-4 bg-gray-750 border-t border-gray-700">
          <h3 className="text-md font-medium text-gray-300 mb-2">Баланс по сетям:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(chainBalances).map(([chainId, balance]) => {
              const chain = SUPPORTED_CHAINS[chainId];
              return (
                <div key={chainId} className="flex items-center text-sm">
                  {chain && chain.logo && (
                    <img
                      src={chain.logo}
                      alt={chain.name}
                      className="w-5 h-5 mr-2 rounded-full"
                    />
                  )}
                  <span className="text-gray-400">
                    {chain ? chain.name : `Chain ${chainId}`}:
                  </span>
                  <span className="ml-auto font-medium text-cyan-400">
                    {balance.toFixed(2)} $
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Кнопка обновления */}
      <div className="px-6 py-4 bg-gray-750 border-t border-gray-700 flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={`px-4 py-2 rounded flex items-center ${
            loading
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
          } transition-colors`}
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
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Обновить
            </>
          )}
        </button>
      </div>
    </div>
  );
};