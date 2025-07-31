import React, { useEffect, useState, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

// ABI для ERC20 токенов (минимальный набор функций для получения метаданных)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];

// Сопоставление адресов токенов с их ID для CoinGecko и CoinMarketCap
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
    const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
    const url = `https://api.polygonscan.com/api?module=account&action=tokenlist&address=${accountAddress}&apikey=${apiKey}`;
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
      return [];
    }
    console.log(`Получено ${data.result.length} записей из Etherscan V2`);
    const uniqueTokens = new Set();
    const tokenSampleData = {};
    data.result.slice(0, 50).forEach(tx => {
      const contractAddress = tx.contractAddress.toLowerCase();
      uniqueTokens.add(contractAddress);
      if (!tokenSampleData[contractAddress]) {
        tokenSampleData[contractAddress] = {
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimal: parseInt(tx.tokenDecimal, 10)
        };
      }
    });
    console.log(`Найдено ${uniqueTokens.size} уникальных токенов через Etherscan`);
    const tokenDetails = [];
    try {
      const polBalance = await ethProvider.getBalance(accountAddress);
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
      console.warn('Ошибка при получении баланса POL:', error.message);
    }
    let tokenCount = 0;
    for (const tokenAddress of Array.from(uniqueTokens)) {
      if (tokenAddress === '0x0000000000000000000000000000000000000000') continue;
      if (tokenCount >= 20) {
        console.warn('Достигнут лимит обработки токенов (20), остальные пропущены');
        break;
      }
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethProvider);
        const balance = await tokenContract.balanceOf(accountAddress);
        if (balance.gt(0)) {
          tokenDetails.push({
            contractAddress: tokenAddress,
            tokenName: tokenSampleData[tokenAddress]?.tokenName || 'Unknown Token',
            tokenSymbol: tokenSampleData[tokenAddress]?.tokenSymbol || '???',
            tokenDecimal: tokenSampleData[tokenAddress]?.tokenDecimal || 18,
            balance: balance.toString()
          });
          tokenCount++;
        }
      } catch (error) {
        console.warn(`Ошибка при обработке токена ${tokenAddress}:`, error.message);
      }
    }
    return tokenDetails;
  } catch (error) {
    console.error('Критическая ошибка Etherscan V2:', error.message);
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
    const knownTokens = [
      { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', name: 'USD Coin', symbol: 'USDC', decimals: 6 },
      { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', name: 'Tether USD', symbol: 'USDT', decimals: 6 },
      { address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', name: 'Wrapped Ether', symbol: 'WETH', decimals: 18 }
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
  const minInterval = updateIntervalMinutes <= 0 ? 5 : updateIntervalMinutes;
  if (!canPerformBackgroundUpdate(accountAddress, minInterval)) {
    console.log(`Фоновое обновление пропущено: последнее обновление было менее ${minInterval} минут назад.`);
    return;
  }
  console.log('Начинаем фоновое обновление токенов...');
  setError(null);
  let tokenList = [];
  try {
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
    const processedTokens = tokenList
      .filter(token => {
        try {
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
          const formattedBalance = ethers.utils.formatUnits(balanceBN, tokenInfo.tokenDecimal);
          return {
            contractAddress: tokenInfo.contractAddress,
            name: tokenInfo.tokenName,
            symbol: tokenInfo.tokenSymbol,
            balance: formattedBalance,
            value: '0.00',
            decimals: tokenInfo.tokenDecimal
          };
        } catch (e) {
          console.error("Ошибка при обработке токена:", e.message);
          return null;
        }
      })
      .filter(Boolean);
    if (processedTokens.length > 0) {
      try {
        const tokenPriceMap = {};
        processedTokens.forEach(token => {
          const address = token.contractAddress.toLowerCase();
          if (KNOWN_TOKENS_MAP[address]) {
            tokenPriceMap[address] = KNOWN_TOKENS_MAP[address];
          }
        });
        const addressToPrice = await fetchMultipleTokenPricesWithFallback(tokenPriceMap);
        processedTokens.forEach(token => {
          const address = token.contractAddress.toLowerCase();
          const price = addressToPrice[address] || 0;
          if (price > 0) {
            const balanceNum = parseFloat(token.balance);
            if (!isNaN(balanceNum)) {
              token.value = (balanceNum * price).toFixed(2);
            } else {
              token.value = '0.00';
            }
          } else {
            token.value = '0.00';
          }
        });
      } catch (priceError) {
        console.warn("Ошибка при получении цен токенов:", priceError.message);
      }
    }
    setTokens(processedTokens);
    saveTokensToCache(accountAddress, processedTokens);
    saveLastUpdateTime(accountAddress);
  } catch (err) {
    console.error("Критическая ошибка при получении балансов токенов:", err);
  }
};

const WalletTokens = ({ updateIntervalMinutes, isAdmin }) => {
  const { provider, account, signer } = useWeb3();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const handleRefresh = async () => {
    if (!account || !provider) return;
    setLoading(true);
    setError(null);
    await updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes);
  };

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
      const cachedTokens = getCachedTokens(account);
      if (cachedTokens && isMounted) {
        setTokens(cachedTokens);
        setLoading(false);
      }
      await updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes);
    };
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    initializeTokens();
    if (updateIntervalMinutes > 0) {
      intervalRef.current = setInterval(() => {
        updateTokensAndCache(account, provider, setTokens, setLoading, setError, updateIntervalMinutes);
      }, updateIntervalMinutes * 60 * 1000);
    }
    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [provider, account, signer, updateIntervalMinutes]);

  const openInPolygonscan = (address) => {
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      const url = `https://polygonscan.com/token/${address}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const copyTokenAddress = async (address, symbol) => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      console.log(`Адрес токена ${symbol} скопирован в буфер обмена`);
    } catch (err) {
      console.error('Ошибка при копировании адреса токена: ', err);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const totalValue = tokens.reduce((sum, token) => {
    const value = parseFloat(token.value);
    return isNaN(value) ? sum : sum + value;
  }, 0);

  const handleSwap = (token) => {
    console.log("Обмен токена:", token);
    alert(`Функция обмена для ${token.symbol} будет реализована`);
  };

  const handleBurn = (token) => {
    console.log("Сжечь токен:", token);
    alert(`Функция сжигания для ${token.symbol} будет реализована`);
  };

  if (loading && tokens.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error && tokens.length === 0) {
    return (
      <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Ошибка! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  // Группировка токенов по сетям
  const groupedTokensByChain = tokens.reduce((acc, token) => {
    const chainId = getNetworkConfig(token.chainId)?.chainId || 'unknown';
    if (!acc[chainId]) {
      acc[chainId] = [];
    }
    acc[chainId].push(token);
    return acc;
  }, {});

  // Расчет баланса по каждой сети
  const chainBalances = Object.entries(groupedTokensByChain).reduce((acc, [chainId, tokens]) => {
    const total = tokens.reduce((sum, token) => sum + parseFloat(token.value), 0);
    acc[chainId] = total;
    return acc;
  }, {});

  // Активные сети
  const [activeChains, setActiveChains] = useState(Object.keys(SUPPORTED_CHAINS));

  return (
    <div className="bg-gray-800 bg-opacity-50 rounded-xl shadow-lg overflow-hidden border border-gray-700">
      {/* Заголовок */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Мультичейн портфель | {Object.keys(SUPPORTED_CHAINS).length} сетей</h2>
            {account && (
              <p className="text-sm text-gray-400 mt-1">
                Адрес: <span className="font-mono">{formatAddress(account)}</span>
              </p>
            )}
          </div>
          <div className="mt-2 sm:mt-0">
            <span className="text-lg font-semibold text-cyan-400">{totalValue.toFixed(2)} $</span>
          </div>
        </div>
      </div>

      {/* Блок фильтра сетей */}
      <div className="px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUPPORTED_CHAINS).map(([chainId, config]) => {
            const isActive = activeChains.includes(chainId);
            const balance = chainBalances[chainId] || 0;
            const percentage = (balance / totalValue) * 100 || 0;

            return (
              <button
                key={chainId}
                onClick={() => {
                  if (isActive) {
                    setActiveChains(activeChains.filter(id => id !== chainId));
                  } else {
                    setActiveChains([...activeChains, chainId]);
                  }
                }}
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${isActive ? 'bg-gray-600' : 'bg-gray-700'
                  }`}
              >
                <img src={config.iconUrl} alt={config.name} className="h-5 w-5" />
                <div>
                  <div className="text-sm font-medium text-white">{config.name}</div>
                  <div className="text-xs text-gray-400">${balance.toFixed(2)} ({percentage.toFixed(1)}%)</div>
                </div>
              </button>
            );
          })}
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
                    {parseFloat(token.value).toFixed(2)} $
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleSwap(token)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition"
                      >
                        Обменять
                      </button>
                      <button
                        onClick={() => handleBurn(token)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition"
                      >
                        Сжечь
                      </button>
                      <button
                        onClick={() => copyTokenAddress(token.contractAddress, token.symbol)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded transition"
                      >
                        Копировать
                      </button>
                      <button
                        onClick={() => openInPolygonscan(token.contractAddress)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                      >
                        Посмотреть
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