import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useWeb3 } from './Web3Context';
import { ethers } from 'ethers';

// Карта адресов токенов Polygon в CoinGecko ID (скопировано из WalletTokens)
const TOKEN_ADDRESS_TO_COINGECKO_ID = {
  '0x0000000000000000000000000000000000000000': 'matic-network', // POL (ранее MATIC)
  // Добавьте сюда другие токены по необходимости
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'weth', // WETH
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'usd-coin', // USDC
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'tether', // USDT
};

// Карта адресов токенов Polygon в CoinMarketCap ID (скопировано из WalletTokens)
const TOKEN_ADDRESS_TO_CMC_ID = {
  '0x0000000000000000000000000000000000000000': 3890, // POL (ранее MATIC)
  // Добавьте сюда другие токены по необходимости
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 2396, // WETH
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 3408, // USDC
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 825, // USDT
};

// ABI для ERC20 токенов (минимальный набор функций для получения метаданных)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)"
];

// --- Функции для получения цен ---
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

const fetchTokenPriceFromCoinMarketCap = async (tokenId) => {
  // Предполагается, что CMC API ключ хранится в переменных окружения VITE_CMC_API_KEY
  const cmcApiKey = import.meta.env.VITE_CMC_API_KEY;
  if (!cmcApiKey) {
    console.warn('VITE_CMC_API_KEY не задан в переменных окружения для CoinMarketCap');
    return null;
  }
  try {
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

const fetchTokenPriceWithFallback = async (tokenId, cmcId) => {
  let price = await fetchTokenPriceFromCoinGecko(tokenId);
  if (price === null && cmcId) {
    price = await fetchTokenPriceFromCoinMarketCap(cmcId);
  }
  return price || 0;
};

const fetchMultipleTokenPricesWithFallback = async (tokenMap) => {
  const tokenIds = Object.keys(tokenMap);
  const prices = {};
  for (const address of tokenIds) {
    const { coingeckoId, cmcId } = tokenMap[address];
    prices[address] = await fetchTokenPriceWithFallback(coingeckoId, cmcId);
  }
  return prices;
};
// --- Конец функций для получения цен ---

// --- Функции для получения токенов ---
const fetchTokensFromEtherscanV2 = async (account, provider) => {
  try {
    const etherscanApiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      throw new Error('VITE_ETHERSCAN_API_KEY не задан в переменных окружения');
    }
    const polygonChainId = 137; // Chain ID для Polygon Mainnet

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

    const uniqueTokens = new Set();
    const tokenSampleData = {};
    data.result.forEach(tx => {
      const contractAddress = tx.contractAddress.toLowerCase();
      uniqueTokens.add(contractAddress);
      if (!tokenSampleData[contractAddress]) {
        tokenSampleData[contractAddress] = {
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimal: parseInt(tx.tokenDecimal)
        };
      }
    });

    console.log(`Найдено ${uniqueTokens.size} уникальных токенов через Etherscan`);

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
        let tokenInfo = tokenSampleData[tokenAddress];
        let contract;

        if (!tokenInfo) {
          // Fallback: если данные не получены из транзакций, запрашиваем напрямую
          contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const [name, symbol, decimals] = await Promise.all([
            contract.name().catch(() => 'Unknown Token'),
            contract.symbol().catch(() => '???'),
            contract.decimals().catch(() => 18)
          ]);
          tokenInfo = { tokenName: name, tokenSymbol: symbol, tokenDecimal: decimals };
        }

        const balance = await (contract ? contract.balanceOf(account) : new ethers.Contract(tokenAddress, ERC20_ABI, provider).balanceOf(account));

        if (ethers.BigNumber.from(balance).gt(0)) {
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
      }
    }

    return tokenDetails;
  } catch (error) {
    console.warn('Не удалось получить токены через Etherscan V2:', error);
    throw error;
  }
};

const fetchTokensDirectBalance = async (account, provider) => {
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
    return tokens;
  } catch (error) {
    console.warn('Не удалось получить токены через резервный метод:', error);
    throw error;
  }
};
// --- Конец функций для получения токенов ---

// --- Reducer для управления состоянием токенов ---
const tokenReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, tokens: action.payload, lastUpdated: Date.now() };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_PRICES':
      // Предполагаем, что action.payload - это объект { адрес_токена: цена }
      const updatedTokens = state.tokens.map(token => {
        const newPrice = action.payload[token.address.toLowerCase()];
        if (newPrice !== undefined) {
          return { ...token, price: newPrice, value: (parseFloat(token.balance) * newPrice).toFixed(2) };
        }
        return token;
      });
      return { ...state, tokens: updatedTokens };
    case 'RESET':
      return { loading: false, error: null, tokens: [], lastUpdated: 0 };
    default:
      return state;
  }
};
// --- Конец Reducer ---

const TokenContext = createContext();

export const useTokens = () => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useTokens must be used within a TokenProvider');
  }
  return context;
};

export const TokenProvider = ({ children }) => {
  const { provider, account } = useWeb3();
  const [state, dispatch] = useReducer(tokenReducer, {
    loading: false,
    error: null,
    tokens: [],
    lastUpdated: 0
  });

  const fetchTokens = async (forceRefresh = false) => {
    // Не обновляем, если нет аккаунта или провайдера
    if (!provider || !account) {
      if (state.tokens.length > 0) { // Если токены были, сбросим их
        dispatch({ type: 'RESET' });
      }
      return;
    }

    // Не обновляем слишком часто (например, если прошло менее 30 секунд)
    const now = Date.now();
    const timeSinceLastUpdate = now - state.lastUpdated;
    const refreshInterval = 30000; // 30 секунд

    if (!forceRefresh && state.lastUpdated > 0 && timeSinceLastUpdate < refreshInterval) {
      console.log(`Слишком рано для обновления токенов. Последнее обновление было ${Math.floor(timeSinceLastUpdate / 1000)} секунд назад.`);
      return;
    }

    dispatch({ type: 'FETCH_START' });

    try {
      let tokenList = [];
      try {
        console.log('Попытка получения токенов через Etherscan V2 API...');
        tokenList = await fetchTokensFromEtherscanV2(account, provider);
        console.log('Токены получены через Etherscan V2:', tokenList);
      } catch (etherscanError) {
        console.error('Etherscan V2 API недоступен, пробуем резервный метод...', etherscanError);
        try {
          tokenList = await fetchTokensDirectBalance(account, provider);
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
            const balanceBN = ethers.BigNumber.from(tokenInfo.balance);
            const formattedBalance = ethers.utils.formatUnits(balanceBN, tokenInfo.tokenDecimal);
            return {
              address: tokenInfo.contractAddress,
              symbol: tokenInfo.tokenSymbol,
              name: tokenInfo.tokenName,
              balance: formattedBalance,
              rawBalance: balanceBN.toString(),
              decimals: tokenInfo.tokenDecimal,
              price: 0, // Цена будет добавлена позже
              value: '0.00' // Стоимость будет добавлена позже
            };
          } catch (formatError) {
            console.warn(`Ошибка при форматировании баланса токена ${tokenInfo.contractAddress}:`, formatError);
            return null;
          }
        })
        .filter(token => token !== null && parseFloat(token.balance) > 0);

      dispatch({ type: 'FETCH_SUCCESS', payload: processedTokens });

      // Получаем цены для токенов
      if (processedTokens.length > 0) {
        const tokenPriceMap = {};
        processedTokens.forEach(token => {
          const lowerAddress = token.address.toLowerCase();
          tokenPriceMap[lowerAddress] = {
            coingeckoId: TOKEN_ADDRESS_TO_COINGECKO_ID[lowerAddress] || token.symbol.toLowerCase(),
            cmcId: TOKEN_ADDRESS_TO_CMC_ID[lowerAddress]
          };
        });

        const addressToPrice = await fetchMultipleTokenPricesWithFallback(tokenPriceMap);
        dispatch({ type: 'UPDATE_PRICES', payload: addressToPrice });
      }

    } catch (err) {
      console.error("Ошибка при получении токенов:", err);
      dispatch({ type: 'FETCH_ERROR', payload: err.message });
    }
  };

  // Вызываем fetchTokens при изменении account или provider
  useEffect(() => {
    fetchTokens();
  }, [provider, account]); // Зависимости: перезагружаем при смене аккаунта или провайдера

  // Функция для ручного обновления
  const refreshTokens = () => {
    fetchTokens(true); // forceRefresh = true
  };

  return (
    <TokenContext.Provider value={{ ...state, refreshTokens }}>
      {children}
    </TokenContext.Provider>
  );
};