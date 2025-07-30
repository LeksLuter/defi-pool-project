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
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 'dai', // DAI
  '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7': 'binance-usd', // BUSD
};

// Карта адресов токенов Polygon в CoinMarketCap ID
const TOKEN_ADDRESS_TO_CMC_ID = {
  '0x0000000000000000000000000000000000000000': '8936', // POL
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': '1027', // WETH
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': '3408', // USDC
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': '825', // USDT
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': '4943', // DAI
  '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7': '4687', // BUSD
};

// Функция для форматирования адреса
const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Функция для получения токенов через Etherscan V2 API (основной метод)
const fetchTokensFromEtherscanV2 = async (accountAddress, ethProvider) => {
  if (!ethProvider || !accountAddress) return [];

  try {
    // Пример данных для демонстрации (в реальной реализации будет API-запрос)
    const sampleTokenData = [
      {
        contractAddress: '0x0000000000000000000000000000000000000000',
        tokenName: 'Polygon Ecosystem Token',
        tokenSymbol: 'POL',
        tokenDecimal: '18'
      },
      {
        contractAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        tokenName: 'Wrapped Ether',
        tokenSymbol: 'WETH',
        tokenDecimal: '18'
      }
    ];

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

    // Обрабатываем каждый ERC-20 токен
    for (const token of sampleTokenData) {
      if (token.contractAddress === '0x0000000000000000000000000000000000000000') continue;

      try {
        // Используем Contract из ethers v5
        const tokenContract = new ethers.Contract(token.contractAddress, ERC20_ABI, ethProvider);
        const balance = await tokenContract.balanceOf(accountAddress);

        // Используем BigNumber из ethers v5 для сравнения
        if (balance.gt(0)) {
          let tokenInfo = {
            contractAddress: token.contractAddress,
            tokenName: token.tokenName,
            tokenSymbol: token.tokenSymbol,
            tokenDecimal: parseInt(token.tokenDecimal, 10),
            balance: balance.toString()
          };

          // Если у нас нет полной информации о токене, пытаемся получить её
          if (!tokenInfo.tokenName || !tokenInfo.tokenSymbol || !tokenInfo.tokenDecimal) {
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
            const decimalsValue = decimalsResult.status === 'fulfilled' ? decimalsResult.value : 18;

            tokenInfo.tokenSymbol = symbolValue;
            tokenInfo.tokenName = nameValue;
            tokenInfo.tokenDecimal = decimalsValue;
          }

          tokenDetails.push(tokenInfo);
        }
      } catch (error) {
        console.warn(`Ошибка при обработке токена ${token.contractAddress}:`, error.message);
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
      // Получаем баланс POL
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
      {
        address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6
      },
      {
        address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6
      }
    ];

    for (const token of knownTokens) {
      try {
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

// Функция для получения цены токена с резервными вариантами
const fetchTokenPriceWithFallback = async (coingeckoId, cmcId) => {
  // В демонстрационных целях возвращаем фиктивные цены
  const mockPrices = {
    'polygon-ecosystem-token': 0.75,
    'weth': 3500,
    'usd-coin': 1.0,
    'tether': 1.0,
    'dai': 1.0,
    'binance-usd': 1.0
  };

  return mockPrices[coingeckoId] || 0;
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

const WalletTokens = () => {
  const { provider, account } = useWeb3();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Функция для получения балансов токенов
  const fetchTokenBalances = async () => {
    if (!provider || !account) {
      setTokens([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let tokenList = [];

    try {
      // Используем provider напрямую, как в контексте
      const ethProvider = provider;

      // Попытка получить токены через Etherscan V2 API
      try {
        console.log('Попытка получения токенов через Etherscan V2 API...');
        tokenList = await fetchTokensFromEtherscanV2(account, ethProvider);
        console.log('Токены получены через Etherscan V2:', tokenList.length);
      } catch (etherscanError) {
        console.error('Etherscan V2 API недоступен, пробуем резервный метод...', etherscanError.message);
        try {
          tokenList = await fetchTokensDirectBalance(account, ethProvider);
          console.log('Токены получены через резервный метод:', tokenList.length);
        } catch (directError) {
          console.error('Резервный метод также недоступен:', directError.message);
          // Не блокируем UI критической ошибкой, просто показываем пустой список
          tokenList = [];
        }
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
          const decimals = parseInt(tokenInfo.tokenDecimal, 10);

          // Форматируем баланс с использованием ethers.utils.formatUnits
          const formattedBalance = ethers.utils.formatUnits(balanceBN, decimals);

          return {
            ...tokenInfo,
            balance: formattedBalance,
            address: tokenInfo.contractAddress
          };
        } catch (e) {
          console.warn("Ошибка при форматировании баланса:", e.message);
          return {
            ...tokenInfo,
            balance: "0",
            address: tokenInfo.contractAddress
          };
        }
      });

      // Фильтруем токены с нулевым балансом (на случай ошибок форматирования)
      const nonZeroTokens = processedTokens.filter(token =>
        token.balance !== "0" && parseFloat(token.balance) > 0
      );

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
      const tokensWithPrices = nonZeroTokens.map(token => {
        const price = addressToPrice[token.address.toLowerCase()] || 0;
        const value = price * parseFloat(token.balance);
        return {
          ...token,
          price: price.toFixed(4),
          value: value.toFixed(2)
        };
      });

      setTokens(tokensWithPrices);
    } catch (err) {
      console.error("Критическая ошибка при получении балансов токенов:", err);
      setError(`Не удалось получить балансы токенов: ${err.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      await fetchTokenBalances();
      if (!isMounted) return;
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [provider, account]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Ошибка! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Заголовок с адресом кошелька */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold">Токены кошелька</h2>
        {account && (
          <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-sm font-mono text-gray-700">{formatAddress(account)}</span>
            <div className="flex gap-1">
              <button
                onClick={() => copyToClipboard(account)}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                title="Скопировать адрес"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => openInPolygonscan(account)}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                title="Просмотр в Polygonscan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Токен</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Баланс</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Стоимость</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tokens.length > 0 ? tokens.map((token) => (
              <tr key={token.address} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {token.tokenSymbol?.charAt(0) || '?'}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{token.tokenSymbol || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{token.tokenName || token.address}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{token.balance}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${token.price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${token.value}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(token.address)}
                      className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                      title="Скопировать адрес токена"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openInPolygonscan(token.address)}
                      className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                      title="Просмотр в Polygonscan"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openInBlockscan(token.address)}
                      className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                      title="Просмотр в Blockscan"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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