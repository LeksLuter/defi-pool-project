import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ethers } from 'ethers'; // Убедитесь, что установлен: npm install ethers
import { useWeb3 } from './Web3Context';

// --- Простая конфигурация токенов ---
const TOKEN_ADDRESS_TO_COINGECKO_ID = {
  '0x0000000000000000000000000000000000000000': 'matic-network', // POL
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'weth',
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'usd-coin',
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'tether',
};

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)"
];
// --- Конец конфигурации ---

// --- Простые функции для получения цен ---
const fetchTokenPriceFromCoinGecko = async (tokenId) => {
  if (!tokenId) return 0;
  try {
    // Используем промис с таймаутом для предотвращения зависания
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд

    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`CoinGecko API ошибка для ${tokenId}: ${response.status}`);
      return 0;
    }
    const data = await response.json();
    return data[tokenId]?.usd || 0;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`Таймаут при получении цены для ${tokenId} через CoinGecko`);
    } else {
      console.warn(`Не удалось получить цену для ${tokenId} через CoinGecko:`, error.message);
    }
    return 0;
  }
};
// --- Конец функций для получения цен ---

// --- Функции для получения токенов (упрощены) ---
const fetchTokensFromEtherscanV2 = async (account, provider) => {
  if (!account || !provider) return [];
  try {
    const etherscanApiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.warn('VITE_ETHERSCAN_API_KEY не задан');
      return [];
    }
    const polygonChainId = 137;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд

    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${polygonChainId}&module=account&action=tokentx&address=${account}&apikey=${etherscanApiKey}&page=1&offset=100&sort=desc`,
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
    data.result.slice(0, 50).forEach(tx => { // Ограничиваем для скорости
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

    // POL
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
      console.warn('Ошибка при получении баланса POL:', error.message);
    }

    // ERC-20 (ограничиваем количество для скорости)
    let tokenCount = 0;
    const MAX_TOKENS = 20;
    for (const tokenAddress of uniqueTokens) {
      if (tokenCount >= MAX_TOKENS) break;
      try {
        let tokenInfo = tokenSampleData[tokenAddress];
        let contract;

        if (!tokenInfo) {
          contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const [name, symbol, decimals] = await Promise.all([
            contract.name().catch(() => 'Unknown'),
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
          tokenCount++;
        }
      } catch (error) {
        console.warn(`Ошибка при обработке токена ${tokenAddress}:`, error.message);
        // Не останавливаем цикл из-за ошибки одного токена
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
// --- Конец функций для получения токенов ---

// --- Reducer ---
const tokenReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, tokens: action.payload, lastUpdated: Date.now() };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_PRICES':
      const updatedTokens = state.tokens.map(token => {
        const newPrice = action.payload[token.address?.toLowerCase()];
        if (newPrice !== undefined && newPrice > 0) {
          const balanceFloat = parseFloat(token.balance);
          if (!isNaN(balanceFloat) && balanceFloat > 0) {
            return { ...token, price: newPrice, value: (balanceFloat * newPrice).toFixed(2) };
          }
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
    // Вместо ошибки, возвращаем "безопасное" состояние по умолчанию
    console.warn('useTokens вызван вне TokenProvider. Возвращаю состояние по умолчанию.');
    return { tokens: [], loading: false, error: null, refreshTokens: () => { } };
    // throw new Error('useTokens must be used within a TokenProvider');
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
    console.log("TokenProvider fetchTokens: account =", account, "provider =", !!provider);

    // 1. Сброс, если нет аккаунта
    if (!account) {
      if (state.tokens.length > 0 || state.error || state.loading) {
        console.log("Нет аккаунта, сброс состояния.");
        dispatch({ type: 'RESET' });
      }
      return;
    }

    // 2. Проверка на частоту обновления
    const now = Date.now();
    const timeSinceLastUpdate = now - state.lastUpdated;
    const refreshInterval = 60000; // 1 минута

    if (!forceRefresh && state.lastUpdated > 0 && timeSinceLastUpdate < refreshInterval) {
      console.log(`Слишком рано для обновления. Последнее: ${Math.floor(timeSinceLastUpdate / 1000)}с назад.`);
      return;
    }

    // 3. Начало загрузки
    dispatch({ type: 'FETCH_START' });

    try {
      // 4. Получение токенов
      console.log('Начинаем получение токенов...');
      const tokenList = await fetchTokensFromEtherscanV2(account, provider);
      console.log('Получено токенов:', tokenList.length);

      // 5. Преобразование
      const processedTokens = tokenList
        .filter(token => ethers.BigNumber.from(token.balance).gt(0))
        .map(tokenInfo => {
          try {
            const balanceBN = ethers.BigNumber.from(tokenInfo.balance);
            const formattedBalance = ethers.utils.formatUnits(balanceBN, tokenInfo.tokenDecimal);
            return {
              address: tokenInfo.contractAddress,
              symbol: tokenInfo.tokenSymbol,
              name: tokenInfo.tokenName,
              balance: formattedBalance,
              price: 0,
              value: '0.00'
            };
          } catch (formatError) {
            console.warn(`Ошибка форматирования для ${tokenInfo.contractAddress}:`, formatError.message);
            return null;
          }
        })
        .filter(token => token && parseFloat(token.balance) > 0);

      console.log('Обработано токенов для отображения:', processedTokens.length);
      dispatch({ type: 'FETCH_SUCCESS', payload: processedTokens });

      // 6. Получение цен (асинхронно, не блокирует основной UI)
      if (processedTokens.length > 0) {
        console.log('Начинаем получение цен...');
        const tokenPriceMap = {};
        processedTokens.forEach(token => {
          const lowerAddress = token.address.toLowerCase();
          tokenPriceMap[lowerAddress] = TOKEN_ADDRESS_TO_COINGECKO_ID[lowerAddress] || token.symbol?.toLowerCase() || 'unknown';
        });

        const prices = {};
        // Последовательно, чтобы не перегружать CoinGecko
        for (const [addr, id] of Object.entries(tokenPriceMap)) {
          prices[addr] = await fetchTokenPriceFromCoinGecko(id);
        }
        console.log('Цены получены:', prices);
        dispatch({ type: 'UPDATE_PRICES', payload: prices });
      }

    } catch (err) {
      console.error("Критическая ошибка в fetchTokens:", err);
      dispatch({ type: 'FETCH_ERROR', payload: `Ошибка загрузки: ${err.message || 'Неизвестная ошибка'}` });
    }
  };

  // useEffect с защитой от лишних вызовов
  useEffect(() => {
    console.log("TokenProvider useEffect triggered");
    let isMounted = true; // Флаг для предотвращения обновления состояния после размонтирования

    // Отложенное выполнение, чтобы дать время инициализироваться всему остальному
    const timer = setTimeout(() => {
      if (isMounted) {
        console.log("Вызов fetchTokens из useEffect");
        fetchTokens();
      }
    }, 100); // Небольшая задержка

    // Очистка
    return () => {
      isMounted = false;
      clearTimeout(timer);
      console.log("TokenProvider useEffect cleanup");
    };
  }, [provider, account]); // Зависимости

  const refreshTokens = () => {
    console.log("Вызов refreshTokens");
    fetchTokens(true); // forceRefresh = true
  };

  console.log("TokenProvider рендерится со state:", state);
  return (
    <TokenContext.Provider value={{ ...state, refreshTokens }}>
      {children}
    </TokenContext.Provider>
  );
};