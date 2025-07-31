import React, { useEffect, useState, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
// Импортируем конфигурацию сетей
import { SUPPORTED_CHAINS, getNetworkConfig } from '../config/supportedChains';

// ABI для ERC20 токенов (минимальный набор функций для получения метаданных)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];

// Карта токенов по умолчанию (включая нативные токены)
const DEFAULT_TOKENS = {
  // Ethereum Mainnet
  1: [
    {
      address: '0x0000000000000000000000000000000000000000', // Нативный токен ETH
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png?v=024',
      coingeckoId: 'ethereum',
      cmcId: '1027'
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=024',
      coingeckoId: 'tether',
      cmcId: '825'
    }
  ],
  // Polygon
  137: [
    {
      address: '0x0000000000000000000000000000000000000000', // Нативный токен MATIC
      name: 'Matic Token',
      symbol: 'MATIC',
      decimals: 18,
      logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png?v=024',
      coingeckoId: 'matic-network',
      cmcId: '3890'
    },
    {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=024',
      coingeckoId: 'tether',
      cmcId: '825'
    }
  ],
  // Binance Smart Chain
  56: [
    {
      address: '0x0000000000000000000000000000000000000000', // Нативный токен BNB
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
      logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png?v=024',
      coingeckoId: 'binancecoin',
      cmcId: '1839'
    },
    {
      address: '0x55d398326f99059fF775485246999027B3197955',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 18,
      logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=024',
      coingeckoId: 'tether',
      cmcId: '825'
    }
  ]
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
  } catch (error) {
    console.error('Ошибка при сохранении кэша токенов:', error);
  }
};

// Функция для получения цены токена с CoinGecko
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

// Функция для получения цены токена с CoinMarketCap
const fetchTokenPriceFromCoinMarketCap = async (cmcId) => {
  if (!cmcId) return 0;
  // В реальной реализации здесь должен быть ваш API ключ
  const API_KEY = 'YOUR_CMC_API_KEY'; // Замените на ваш API ключ
  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${cmcId}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': API_KEY
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
    const price = await fetchTokenPriceWithFallback(coingeckoId, cmcId);
    addressToPrice[address] = price;
  }

  return addressToPrice;
};

// Функция для получения баланса токена
const fetchTokenBalance = async (provider, tokenAddress, account, decimals) => {
  try {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      // Для нативного токена
      const balance = await provider.getBalance(account);
      return ethers.utils.formatUnits(balance, decimals);
    } else {
      // Для ERC20 токенов
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await contract.balanceOf(account);
      return ethers.utils.formatUnits(balance, decimals);
    }
  } catch (error) {
    console.error(`Ошибка при получении баланса для токена ${tokenAddress}:`, error);
    return "0";
  }
};

// Функция для получения данных токенов с балансами
const fetchTokensWithBalances = async (provider, account, chainId) => {
  if (!account || !provider) return [];

  try {
    // Получаем список токенов для текущей сети
    const tokens = DEFAULT_TOKENS[chainId] || [];

    // Создаем массив промисов для получения балансов
    const balancePromises = tokens.map(token =>
      fetchTokenBalance(provider, token.address, account, token.decimals)
    );

    // Ждем завершения всех запросов балансов
    const balances = await Promise.all(balancePromises);

    // Создаем карту токенов для получения цен
    const tokenPriceMap = {};
    tokens.forEach(token => {
      tokenPriceMap[token.address] = {
        coingeckoId: token.coingeckoId,
        cmcId: token.cmcId
      };
    });

    // Получаем цены токенов
    const prices = await fetchMultipleTokenPricesWithFallback(tokenPriceMap);

    // Комбинируем данные
    const tokensWithBalances = tokens.map((token, index) => {
      const balance = parseFloat(balances[index]);
      const price = prices[token.address] || 0;
      const value = isNaN(balance) ? 0 : balance * price;

      return {
        ...token,
        balance: isNaN(balance) ? "0" : balance.toFixed(token.decimals),
        price: price,
        value: value.toFixed(2),
        chainId: chainId
      };
    });

    return tokensWithBalances;
  } catch (err) {
    console.error("Ошибка при получении балансов токенов:", err);
    throw err;
  }
};

const WalletTokens = ({ updateIntervalMinutes, isAdmin }) => {
  const { provider, account, signer, chainId } = useWeb3(); // signer и chainId добавлены
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null); // useRef для хранения ID интервала

  // Состояние для фильтра сетей (по умолчанию активна только текущая сеть)
  const [activeChains, setActiveChains] = useState([chainId || 137]); // 137 как fallback для Polygon

  // Функция для обновления токенов с учетом кэширования
  const updateTokens = async (useCache = true) => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      setError(null);

      // Пытаемся получить данные из кэша
      let cachedTokens = null;
      if (useCache) {
        cachedTokens = getCachedTokens(account);
      }

      if (cachedTokens) {
        setTokens(cachedTokens);
        // Не прекращаем выполнение, все равно обновляем в фоне
      }

      // Получаем токены для активных сетей
      const tokensPromises = activeChains.map(chainId => {
        // Здесь должна быть логика для получения провайдера для разных сетей
        // Пока используем текущий провайдер для демонстрации
        return fetchTokensWithBalances(provider, account, chainId);
      });

      const tokensResults = await Promise.all(tokensPromises);
      const allTokens = tokensResults.flat();

      setTokens(allTokens);
      saveTokensToCache(account, allTokens);

    } catch (err) {
      console.error("Ошибка при обновлении токенов:", err);
      // Не устанавливаем ошибку в состояние, если у нас есть кэш, чтобы не перезаписывать отображаемые данные
      // if (tokens.length === 0) {
      //   Это будет проверено в компоненте
      //   setError(`Не удалось получить балансы токенов: ${err.message || 'Неизвестная ошибка'}`);
      // }

      // В случае ошибки обновления, можно попробовать загрузить из кэша
      // (хотя кэш уже должен быть загружен в useEffect)
      // const cachedTokens = getCachedTokens(account);
      // if (cachedTokens) {
      //   setTokens(cachedTokens);
      // }
    } finally {
      // if (loading) {
      //   Это будет проверено в компоненте
      //   setLoading(false);
      // }
    }
  };

  // Эффект для инициализации и обновления по интервалу
  useEffect(() => {
    if (!account || !provider) return;

    // Немедленное обновление при монтировании или изменении аккаунта/провайдера
    updateTokens();

    // Устанавливаем интервал для автоматического обновления
    const intervalMinutes = updateIntervalMinutes || 1; // По умолчанию 1 минута
    const intervalMs = intervalMinutes * 60 * 1000;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      updateTokens(false); // Не используем кэш при автоматическом обновлении
    }, intervalMs);

    // Очистка интервала при размонтировании или изменении зависимостей
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [account, provider, updateIntervalMinutes, activeChains]); // Добавлены зависимости

  // Эффект для обновления при изменении chainId
  useEffect(() => {
    if (chainId && !activeChains.includes(chainId)) {
      setActiveChains([chainId]);
    }
  }, [chainId]);

  // Функция для ручного обновления
  const handleRefresh = () => {
    updateTokens(false); // Не используем кэш при ручном обновлении
  };

  // Функция для переключения сети в фильтре
  const toggleChain = (chainId) => {
    if (activeChains.includes(chainId)) {
      setActiveChains(activeChains.filter(id => id !== chainId));
    } else {
      setActiveChains([...activeChains, chainId]);
    }
  };

  // Функция для копирования адреса токена
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

  // Фильтрация токенов по активным сетям
  const filteredTokens = tokens.filter(token =>
    activeChains.includes(token.chainId)
  );

  // Расчет баланса по сетям
  const chainBalances = {};
  activeChains.forEach(chainId => {
    chainBalances[chainId] = tokens
      .filter(token => token.chainId === chainId)
      .reduce((sum, token) => {
        const value = parseFloat(token.value);
        return isNaN(value) ? sum : sum + value;
      }, 0);
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
      <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Ошибка! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 bg-opacity-50 rounded-xl shadow-lg overflow-hidden border border-gray-700">
      {/* Заголовок с адресом кошелька и общим балансом */}
      <div className="px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-800 bg-opacity-80 z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Токены кошелька</h2>
            <p className="text-gray-400 text-sm mt-1">
              Адрес: {account ? formatAddress(account) : 'Не подключен'}
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <p className="text-gray-400 text-sm">Общий баланс</p>
            <p className="text-2xl font-bold text-cyan-400">${totalValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Фильтр сетей */}
      <div className="px-6 py-4 border-b border-gray-700 sticky top-[73px] bg-gray-800 bg-opacity-70 z-10">
        <div className="flex flex-wrap gap-2">
          {Object.values(SUPPORTED_CHAINS).map(network => (
            <button
              key={network.chainId}
              onClick={() => toggleChain(network.chainId)}
              className={`px-3 py-1 text-sm rounded-full transition ${activeChains.includes(network.chainId)
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              {network.shortName}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 mt-3">
          {activeChains.map(chainId => {
            const network = SUPPORTED_CHAINS[chainId];
            const balance = chainBalances[chainId] || 0;
            return (
              <div key={chainId} className="flex items-center">
                <span className="text-gray-400 text-sm mr-2">{network?.shortName}:</span>
                <span className="text-cyan-400 font-medium">${balance.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Таблица токенов */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-750 sticky top-[137px] z-10">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Токен</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Баланс</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Цена</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Сумма</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 bg-opacity-50 divide-y divide-gray-700">
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token, index) => (
                <tr key={`${token.address}-${token.chainId}`} className={index % 2 === 0 ? 'bg-gray-800 bg-opacity-30' : 'bg-gray-800 bg-opacity-20'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {token.logo ? (
                        <img className="h-10 w-10 rounded-full" src={token.logo} alt={token.symbol} />
                      ) : (
                        <div className="bg-gray-700 border-2 border-dashed rounded-xl w-10 h-10" />
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{token.symbol}</div>
                        <div className="text-sm text-gray-400">{token.name}</div>
                        <div className="text-xs text-gray-500">{formatAddress(token.address)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{parseFloat(token.balance).toFixed(4)}</div>
                    <div className="text-xs text-gray-400">{token.symbol}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${token.price ? parseFloat(token.price).toFixed(4) : '0.0000'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyan-400">
                    ${token.value}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleSwap(token)}
                      className="text-cyan-400 hover:text-cyan-300 mr-3"
                    >
                      Обмен
                    </button>
                    <button
                      onClick={() => handleBurn(token)}
                      className="text-rose-500 hover:text-rose-400 mr-3"
                    >
                      Сжечь
                    </button>
                    <button
                      onClick={() => copyTokenAddress(token.address, token.symbol)}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      Копировать
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-400">
                  Нет токенов для отображения
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Панель управления */}
      <div className="px-6 py-4 bg-gray-800 bg-opacity-60 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-400">
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