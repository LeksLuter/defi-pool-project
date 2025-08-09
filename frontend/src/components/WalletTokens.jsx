import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS } from '../config/supportedChains';
import { updateTokens } from '../services/tokenService';
import { saveTokensToCache, getCachedTokens, isCacheExpired } from '../services/cacheService';
import { setLastUpdateTime, canPerformBackgroundUpdate } from '../services/cacheService';
import { getUpdateIntervalMinutes } from '../config/adminConfig';

const MIN_TOKEN_VALUE_USD = 0.1;
const MIN_UPDATE_INTERVAL_MS = 30000;

const WalletTokens = () => {
  const { provider, account, signer, chainId, switchNetwork } = useWeb3();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [effectiveUpdateIntervalMinutes, setEffectiveUpdateIntervalMinutes] = useState(10);
  
  const intervalRef = useRef(null);
  const hasFetchedTokens = useRef(false);
  const isMountedRef = useRef(true);
  
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [showLowValue, setShowLowValue] = useState(false);
  const [showAllChains, setShowAllChains] = useState(false);

  // Загрузка интервала обновления
  useEffect(() => {
    const loadUpdateInterval = async () => {
      try {
        const intervalMinutes = await getUpdateIntervalMinutes();
        setEffectiveUpdateIntervalMinutes(intervalMinutes);
      } catch (error) {
        console.error('Ошибка при загрузке интервала обновления:', error);
        setEffectiveUpdateIntervalMinutes(10);
      }
    };
    loadUpdateInterval();

    const handleStorageChange = (e) => {
      if (e.key === 'defiPool_adminConfig' && e.newValue) {
        try {
          const newConfig = JSON.parse(e.newValue);
          if (newConfig.updateIntervalMinutes !== undefined) {
            setEffectiveUpdateIntervalMinutes(newConfig.updateIntervalMinutes);
          }
        } catch (err) {
          console.error("Ошибка при парсинге adminConfig из storage event:", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Обновление токенов
  const handleRefresh = useCallback(async () => {
    if (!account || !provider || !chainId) return;
    setLoading(true);
    setError(null);
    await updateTokens(account, provider, setTokens, setLoading, setError, chainId, isMountedRef);
  }, [account, provider, chainId]);

  // Инициализация токенов
  useEffect(() => {
    isMountedRef.current = true;
    const initializeTokens = async () => {
      if (!account || !provider || !chainId || hasFetchedTokens.current) return;
      hasFetchedTokens.current = true;
      await updateTokens(account, provider, setTokens, setLoading, setError, chainId, isMountedRef);
    };
    initializeTokens();
    
    return () => {
      isMountedRef.current = false;
      hasFetchedTokens.current = false;
    };
  }, [account, provider, chainId]);

  // Интервал автообновления
  useEffect(() => {
    if (!account || !provider || !chainId || effectiveUpdateIntervalMinutes <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const intervalMs = effectiveUpdateIntervalMinutes * 60 * 1000;
    const clampedIntervalMs = Math.max(intervalMs, MIN_UPDATE_INTERVAL_MS);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;
      try {
        await updateTokens(account, provider, setTokens, null, null, chainId, { current: true });
      } catch (err) {
        console.error("Ошибка при фоновом обновлении токенов:", err);
      }
    }, clampedIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [account, provider, chainId, effectiveUpdateIntervalMinutes]);

  // Фильтр сетей
  const visibleChains = useMemo(() => {
    const allChains = Object.entries(SUPPORTED_CHAINS);
    if (showAllChains) return allChains;
    return allChains.filter(([id]) => parseInt(id) === chainId);
  }, [showAllChains, chainId]);

  // Фильтрация токенов
  const filteredTokens = useMemo(() => {
    if (!Array.isArray(tokens)) return [];
    
    let result = [...tokens];
    
    if (!showZeroBalance) {
      result = result.filter(token => {
        try {
          return parseFloat(ethers.utils.formatUnits(token.balance, token.decimals)) > 0;
        } catch {
          return true;
        }
      });
    }
    
    if (!showLowValue) {
      result = result.filter(token => {
        try {
          const balanceFormatted = parseFloat(ethers.utils.formatUnits(token.balance, token.decimals));
          const priceUSD = parseFloat(token.priceUSD);
          if (isNaN(priceUSD)) return true;
          return balanceFormatted * priceUSD >= MIN_TOKEN_VALUE_USD;
        } catch {
          return true;
        }
      });
    }
    
    result.sort((a, b) => {
      try {
        const aBalance = parseFloat(ethers.utils.formatUnits(a.balance, a.decimals));
        const bBalance = parseFloat(ethers.utils.formatUnits(b.balance, b.decimals));
        const aPrice = parseFloat(a.priceUSD) || 0;
        const bPrice = parseFloat(b.priceUSD) || 0;
        const aValue = aBalance * aPrice;
        const bValue = bBalance * bPrice;
        
        if (bValue !== aValue) return bValue - aValue;
        return a.symbol.localeCompare(b.symbol);
      } catch {
        return 0;
      }
    });
    
    return result;
  }, [tokens, showZeroBalance, showLowValue]);

  // Обработчики
  const toggleZeroBalanceFilter = () => setShowZeroBalance(prev => !prev);
  const toggleLowValueFilter = () => setShowLowValue(prev => !prev);
  const toggleChainsFilter = () => setShowAllChains(prev => !prev);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Ошибка при копировании:', err);
    }
  };

  const openInExplorer = (address, tokenChainId) => {
    if (!address || !tokenChainId) return;
    
    const networkConfig = SUPPORTED_CHAINS[tokenChainId];
    const explorerUrl = networkConfig?.explorerUrl;
    
    if (explorerUrl) {
      const url = address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' 
        ? `${explorerUrl}/address/${account}` 
        : `${explorerUrl}/token/${address}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Рендер состояний
  if (loading && tokens.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Мои токены</h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Интервал: {effectiveUpdateIntervalMinutes} мин</span>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Обновление...' : 'Обновить'}
              </button>
            </div>
          </div>
          <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-4">Загрузка токенов...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Мои токены</h1>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition"
            >
              Повторить попытку
            </button>
          </div>
          <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-xl mb-4">Ошибка загрузки токенов</p>
            <p className="text-gray-300">{error.message || error}</p>
          </div>
        </div>
      </div>
    );
  }

  const chainInfo = SUPPORTED_CHAINS[chainId];
  const chainName = chainInfo ? chainInfo.name : `Chain ${chainId}`;

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <h1 className="text-3xl font-bold">Мои токены</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap">
              Интервал: {effectiveUpdateIntervalMinutes} мин
            </span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50 text-sm"
            >
              {loading ? 'Обновление...' : 'Обновить'}
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-800 bg-opacity-30 border border-gray-700 rounded-xl">
          <div className="flex items-center">
            <div className="mr-3">
              <div className="text-sm text-gray-400">Адрес кошелька</div>
              <div className="font-mono text-sm break-all">{account}</div>
            </div>
            <button
              onClick={() => copyToClipboard(account)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              title="Копировать адрес"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </div>
          <div className="mt-2">
            <div className="text-sm text-gray-400">Сеть</div>
            <div className="font-medium">{chainName}</div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-800 bg-opacity-30 border border-gray-700 rounded-xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {visibleChains.map(([id, chainData]) => (
              <button
                key={id}
                onClick={() => switchNetwork(parseInt(id))}
                disabled={parseInt(id) === chainId}
                className={`p-3 rounded-xl border transition text-center ${
                  parseInt(id) === chainId 
                    ? 'bg-indigo-900 bg-opacity-50 border-indigo-500' 
                    : 'bg-gray-800 bg-opacity-50 border-gray-700 hover:border-gray-500'
                } disabled:opacity-50`}
              >
                <div className="text-sm font-medium">{chainData.name}</div>
                <div className="text-xs text-gray-400">ID: {id}</div>
              </button>
            ))}
            <button
              onClick={toggleChainsFilter}
              className={`p-3 rounded-xl border transition text-center ${
                showAllChains 
                  ? 'bg-indigo-900 bg-opacity-50 border-indigo-500' 
                  : 'bg-gray-800 bg-opacity-50 border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-sm font-medium">
                {showAllChains ? 'Скрыть сети' : 'Показать все'}
              </div>
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-800 bg-opacity-30 border border-gray-700 rounded-xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-medium mr-2">Фильтры</h3>
            <button
              onClick={toggleZeroBalanceFilter}
              className={`px-3 py-1 text-sm rounded-full transition ${
                showZeroBalance ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showZeroBalance ? 'Показать все' : 'Скрыть нулевые'}
            </button>
            <button
              onClick={toggleLowValueFilter}
              className={`px-3 py-1 text-sm rounded-full transition ${
                showLowValue ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showLowValue ? 'Показать все' : 'Скрыть <$0.10'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Токен</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Сеть</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Баланс</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Цена</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Стоимость</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 bg-opacity-50 divide-y divide-gray-700">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => {
                  const balanceFormatted = parseFloat(
                    ethers.utils.formatUnits(token.balance, token.decimals)
                  ).toFixed(4);
                  const priceUSD = parseFloat(token.priceUSD);
                  const priceFormatted = !isNaN(priceUSD) ? `$${priceUSD.toFixed(4)}` : 'N/A';
                  
                  let totalValueFormatted = 'N/A';
                  if (!isNaN(priceUSD)) {
                    const totalValue = parseFloat(balanceFormatted) * priceUSD;
                    totalValueFormatted = `$${totalValue.toFixed(2)}`;
                  }

                  const chainInfo = SUPPORTED_CHAINS[token.chainId];
                  const chainName = chainInfo ? chainInfo.shortName : `Chain ${token.chainId}`;

                  return (
                    <tr key={`${token.contractAddress}-${token.chainId}`} className="hover:bg-gray-750 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-300">
                              {token.symbol ? token.symbol.substring(0, 3) : '?'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium">{token.name || 'Unknown Token'}</div>
                            <div className="text-xs text-gray-400">{token.symbol || '???'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{chainName}</div>
                        <div className="text-xs text-gray-400">
                          {token.contractAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' 
                            ? 'Нативный' 
                            : `${token.contractAddress.substring(0, 6)}...${token.contractAddress.substring(token.contractAddress.length - 4)}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {balanceFormatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {priceFormatted}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                        totalValueFormatted !== 'N/A' && parseFloat(totalValueFormatted.replace('$', '')) < MIN_TOKEN_VALUE_USD 
                          ? 'text-yellow-500' 
                          : ''
                      }`}>
                        {totalValueFormatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => copyToClipboard(token.contractAddress)}
                          className="text-indigo-400 hover:text-indigo-300 mr-3"
                          title="Копировать адрес"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openInExplorer(token.contractAddress, token.chainId)}
                          className="text-indigo-400 hover:text-indigo-300"
                          title="Открыть в эксплорере"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    {tokens.length === 0 ? 'Токены не найдены' : 'Все токены отфильтрованы'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WalletTokens;