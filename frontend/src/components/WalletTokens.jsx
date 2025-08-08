// frontend/src/components/WalletTokens.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
// Импортируем конфигурацию сетей
import { SUPPORTED_CHAINS } from '../config/supportedChains';
// === ИМПОРТЫ СЕРВИСОВ ===
import { updateTokens } from '../services/tokenService'; // Основной импорт для получения данных
import { saveTokensToCache, getCachedTokens, isCacheExpired } from '../services/cacheService';
import { setLastUpdateTime, canPerformBackgroundUpdate } from '../services/cacheService';
// === ИМПОРТЫ ИЗ НОВОГО ФАЙЛА КОНФИГУРАЦИИ ===
import { getUpdateIntervalMinutes } from '../config/adminConfig';
// === КОНЕЦ ИМПОРТОВ ИЗ НОВОГО ФАЙЛА КОНФИГУРАЦИИ ===

// === КОНСТАНТЫ ===
const MIN_TOKEN_VALUE_USD = 0.1; // Константа для минимальной стоимости отображения
const MIN_UPDATE_INTERVAL_MS = 30000; // 30 секунд, минимальный интервал для фонового обновления
// === КОНЕЦ КОНСТАНТ ===

const WalletTokens = () => {
  const { provider, account, signer, chainId, switchNetwork } = useWeb3();
  const [tokens, setTokens] = useState([]); // Содержит все токены, полученные из сервиса (включая отфильтрованные на UI)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // === НОВОЕ СОСТОЯНИЕ ДЛЯ ИНТЕРВАЛА ===
  const [effectiveUpdateIntervalMinutes, setEffectiveUpdateIntervalMinutes] = useState(10); // Значение по умолчанию
  // === КОНЕЦ НОВОГО СОСТОЯНИЯ ===

  const intervalRef = useRef(null);
  const hasFetchedTokens = useRef(false);
  const isMountedRef = useRef(true); // Ref для отслеживания монтирования

  // === СОСТОЯНИЯ ДЛЯ ФИЛЬТРОВ ОТОБРАЖЕНИЯ ===
  // По умолчанию фильтры выключены (показываются все токены)
  // Эти фильтры применяются ТОЛЬКО к отображению в таблице
  const [showZeroBalance, setShowZeroBalance] = useState(false); // false = скрывать нулевые балансы (фильтр активен)
  const [showLowValue, setShowLowValue] = useState(false); // false = скрывать < $0.10 (фильтр активен)
  // === КОНЕЦ СОСТОЯНИЙ ДЛЯ ФИЛЬТРОВ ===

  // Состояние для фильтра сетей
  const [showMoreChains, setShowMoreChains] = useState(false);

  // === ЭФФЕКТ ДЛЯ ЗАГРУЗКИ ИНТЕРВАЛА ИЗ adminConfig ===
  useEffect(() => {
    const loadUpdateInterval = async () => {
      try {
        const intervalMinutes = await getUpdateIntervalMinutes();
        console.log(`[WalletTokens] Загружен интервал обновления из localStorage: ${intervalMinutes} минут`);
        setEffectiveUpdateIntervalMinutes(intervalMinutes);
      } catch (error) {
        console.error('[WalletTokens] Ошибка при загрузке интервала обновления из localStorage:', error);
        setEffectiveUpdateIntervalMinutes(10); // Значение по умолчанию
      }
    };

    loadUpdateInterval();

    // Обработчик события storage для синхронизации интервала между вкладками
    const handleStorageChange = (e) => {
      if (e.key === 'defiPool_adminConfig' && e.newValue) {
        try {
           const newConfig = JSON.parse(e.newValue);
           if (newConfig.updateIntervalMinutes !== undefined && newConfig.updateIntervalMinutes !== effectiveUpdateIntervalMinutes) {
               console.log(`[WalletTokens] Интервал обновления синхронизирован с другой вкладкой: ${newConfig.updateIntervalMinutes} минут`);
               setEffectiveUpdateIntervalMinutes(newConfig.updateIntervalMinutes);
           }
        } catch (err) {
          console.error("Ошибка при парсинге adminConfig из storage event (WalletTokens):", err);
        }
      }
    };

    // Обработка кастомного события adminConfigUpdated (внутри одной вкладки)
    const handleCustomEvent = (e) => {
         try {
            const newConfig = e.detail;
            if (newConfig.updateIntervalMinutes !== undefined && newConfig.updateIntervalMinutes !== effectiveUpdateIntervalMinutes) {
                console.log(`[WalletTokens] Интервал обновления обновлён через кастомное событие: ${newConfig.updateIntervalMinutes} минут`);
                setEffectiveUpdateIntervalMinutes(newConfig.updateIntervalMinutes);
            }
        } catch (err) {
            console.error("Ошибка при обработке кастомного события adminConfigUpdated (WalletTokens):", err);
        }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('adminConfigUpdated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('adminConfigUpdated', handleCustomEvent);
    };
  }, [effectiveUpdateIntervalMinutes]); // Зависимость от effectiveUpdateIntervalMinutes нужна, чтобы правильно сравнить значения
  // === КОНЕЦ ЭФФЕКТА ===

  // Функция для обновления токенов
  const handleRefresh = useCallback(async () => {
    if (!account || !provider || !chainId) return;
    setLoading(true);
    setError(null);
    await updateTokens(account, provider, setTokens, setLoading, setError, chainId, isMountedRef);
  }, [account, provider, chainId]);

  // Основная функция обновления токенов (делегирует всю логику сервису)
  useEffect(() => {
    isMountedRef.current = true;
    const initializeTokens = async () => {
      if (!account || !provider || !chainId || hasFetchedTokens.current) return;
      hasFetchedTokens.current = true;
      console.log("Начальное получение токенов...");
      await updateTokens(account, provider, setTokens, setLoading, setError, chainId, isMountedRef);
    };

    initializeTokens();

    return () => {
      isMountedRef.current = false;
      hasFetchedTokens.current = false;
    };
  }, [account, provider, chainId]); // Убран effectiveUpdateIntervalMinutes из зависимостей, так как интервал обрабатывается отдельно

  // === ЭФФЕКТ ДЛЯ УПРАВЛЕНИЯ ИНТЕРВАЛОМ АВТООБНОВЛЕНИЯ ===
  useEffect(() => {
    if (!account || !provider || !chainId || effectiveUpdateIntervalMinutes <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("[WalletTokens] Интервал автообновления остановлен (некорректный интервал или отсутствуют данные).");
      }
      return;
    }

    const intervalMs = effectiveUpdateIntervalMinutes * 60 * 1000;
    const clampedIntervalMs = Math.max(intervalMs, MIN_UPDATE_INTERVAL_MS); // Убедимся, что интервал не меньше минимального

    // Очищаем предыдущий интервал, если он был
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Устанавливаем новый интервал
    intervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;
      console.log(`[WalletTokens] Автообновление токенов запущено (интервал: ${effectiveUpdateIntervalMinutes} минут)...`);
      // Выполняем фоновое обновление
      try {
        await updateTokens(account, provider, setTokens, null, null, chainId, { current: true }); // Не устанавливаем setLoading и setError для фонового обновления
      } catch (err) {
        console.error("[WalletTokens] Ошибка при фоновом обновлении токенов:", err);
        // Ошибки фонового обновления не отображаются пользователю, но логируются
      }
    }, clampedIntervalMs);

    console.log(`[WalletTokens] Интервал автообновления установлен на ${clampedIntervalMs / 1000 / 60} минут (${clampedIntervalMs} мс).`);

    // Очистка интервала при размонтировании или изменении зависимостей
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("[WalletTokens] Интервал автообновления очищен.");
      }
    };
  }, [account, provider, chainId, effectiveUpdateIntervalMinutes]); // Зависимость от effectiveUpdateIntervalMinutes
  // === КОНЕЦ ЭФФЕКТА ===

  // === ЛОГИКА ФИЛЬТРА СЕТЕЙ ===
  const visibleChains = useMemo(() => {
    const allChains = Object.entries(SUPPORTED_CHAINS);
    if (showMoreChains) {
      return allChains;
    }
    // Показываем только основные сети
    return allChains.filter(([id]) => [1, 137, 56, 43114, 250].includes(parseInt(id)));
  }, [showMoreChains]);
  // === КОНЕЦ ЛОГИКИ ФИЛЬТРА СЕТЕЙ ===

  // === ЛОГИКА ФИЛЬТРАЦИИ ТОКЕНОВ ДЛЯ ОТОБРАЖЕНИЯ ===
  const filteredTokens = useMemo(() => {
    // Проверяем, что tokens - это массив
    if (!Array.isArray(tokens)) {
      console.warn("[WalletTokens] tokens не является массивом:", tokens);
      return [];
    }

    let result = [...tokens];

    // Фильтр по балансу (если showZeroBalance false, скрываем нулевые балансы)
    if (!showZeroBalance) {
      result = result.filter(token => {
        try {
          // Проверяем, что баланс не равен 0
          return parseFloat(ethers.utils.formatUnits(token.balance, token.decimals)) > 0;
        } catch (err) {
          console.error(`Ошибка при парсинге баланса токена ${token.symbol}:`, err);
          // В случае ошибки парсинга показываем токен
          return true;
        }
      });
    }

    // Фильтр по стоимости (если showLowValue false, скрываем токены < $0.10)
    if (!showLowValue) {
      result = result.filter(token => {
        try {
          const balanceFormatted = parseFloat(ethers.utils.formatUnits(token.balance, token.decimals));
          const priceUSD = parseFloat(token.priceUSD);
          // Если цена не определена, показываем токен
          if (isNaN(priceUSD)) return true;
          const totalValueUSD = balanceFormatted * priceUSD;
          return totalValueUSD >= MIN_TOKEN_VALUE_USD;
        } catch (err) {
          console.error(`Ошибка при расчете стоимости токена ${token.symbol}:`, err);
          // В случае ошибки расчета показываем токен
          return true;
        }
      });
    }

    // Сортировка: сначала по стоимости (убывание), затем по символу (возрастание)
    result.sort((a, b) => {
      try {
        const aBalanceFormatted = parseFloat(ethers.utils.formatUnits(a.balance, a.decimals));
        const bBalanceFormatted = parseFloat(ethers.utils.formatUnits(b.balance, b.decimals));
        const aPriceUSD = parseFloat(a.priceUSD) || 0;
        const bPriceUSD = parseFloat(b.priceUSD) || 0;

        const aValueUSD = aBalanceFormatted * aPriceUSD;
        const bValueUSD = bBalanceFormatted * bPriceUSD;

        // Сортировка по стоимости (убывание)
        if (bValueUSD !== aValueUSD) {
          return bValueUSD - aValueUSD;
        }

        // Если стоимость одинаковая, сортируем по символу (возрастание)
        return a.symbol.localeCompare(b.symbol);
      } catch (err) {
        console.error("Ошибка при сортировке токенов:", err);
        return 0; // Не меняем порядок в случае ошибки
      }
    });

    return result;
  }, [tokens, showZeroBalance, showLowValue]);
  // === КОНЕЦ ЛОГИКИ ФИЛЬТРАЦИИ ТОКЕНОВ ===

  // === ОБРАБОТЧИКИ ФИЛЬТРОВ ===
  const toggleZeroBalanceFilter = () => setShowZeroBalance(prev => !prev);
  const toggleLowValueFilter = () => setShowLowValue(prev => !prev);
  const toggleChainsFilter = () => setShowMoreChains(prev => !prev);
  // === КОНЕЦ ОБРАБОТЧИКОВ ФИЛЬТРОВ ===

  // === ОБРАБОТЧИК КОПИРОВАНИЯ АДРЕСА ===
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Ошибка при копировании: ', err);
    }
  };
  // === КОНЕЦ ОБРАБОТЧИКА КОПИРОВАНИЯ ===

  // === ОБРАБОТЧИК ОТКРЫТИЯ В ЭКСПЛОРЕРЕ ===
  const openInExplorer = (address, tokenChainId) => {
    if (address && tokenChainId) {
      const networkConfig = SUPPORTED_CHAINS[tokenChainId];
      const explorerUrl = networkConfig?.explorerUrl; // Используем explorerUrl из конфигурации
      if (explorerUrl) {
        let url = '';
        // Проверяем, является ли адрес нативным токеном или специальным адресом
        if (address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
          // Для нативных токенов используем адрес аккаунта
          url = `${explorerUrl}/address/${account}`;
        } else {
          // Для ERC-20 токенов
          url = `${explorerUrl}/token/${address}`;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };
  // === КОНЕЦ ОБРАБОТЧИКА ОТКРЫТИЯ В ЭКСПЛОРЕРЕ ===

  // === РЕНДЕР СОСТОЯНИЙ ЗАГРУЗКИ И ОШИБКИ ===
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
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              <p>Загрузка токенов...</p>
            </div>
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
          <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-xl mb-4">Ошибка загрузки токенов</p>
            <p className="text-gray-300 mb-4">{error.message || error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition"
            >
              Повторить попытку
            </button>
          </div>
        </div>
      </div>
    );
  }
  // === КОНЕЦ РЕНДЕРА СОСТОЯНИЙ ===

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto max-w-6xl">
        {/* === ЗАГОЛОВОК И КНОПКИ === */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <h1 className="text-3xl font-bold">Мои токены</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap">Интервал: {effectiveUpdateIntervalMinutes} мин</span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50 text-sm"
            >
              {loading ? 'Обновление...' : 'Обновить'}
            </button>
          </div>
        </div>
        {/* === КОНЕЦ ЗАГОЛОВКА === */}

        {/* === ФИЛЬТРЫ === */}
        <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-gray-800 bg-opacity-30 border border-gray-700 rounded-xl">
          <button
            onClick={toggleZeroBalanceFilter}
            className={`px-3 py-1 text-sm rounded-full transition ${showZeroBalance ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {showZeroBalance ? 'Показать все' : 'Скрыть нулевые'}
          </button>
          <button
            onClick={toggleLowValueFilter}
            className={`px-3 py-1 text-sm rounded-full transition ${showLowValue ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {showLowValue ? 'Показать все' : 'Скрыть <$0.10'}
          </button>
          <button
            onClick={toggleChainsFilter}
            className={`px-3 py-1 text-sm rounded-full transition ${showMoreChains ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {showMoreChains ? 'Меньше сетей' : 'Больше сетей'}
          </button>
        </div>
        {/* === КОНЕЦ ФИЛЬТРОВ === */}

        {/* === ТАБЛИЦА ТОКЕНОВ === */}
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Токен</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Сеть</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Баланс</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Цена</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Стоимость</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 bg-opacity-50 divide-y divide-gray-700">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => {
                  const balanceFormatted = parseFloat(ethers.utils.formatUnits(token.balance, token.decimals)).toFixed(4);
                  const priceUSD = parseFloat(token.priceUSD);
                  const priceFormatted = !isNaN(priceUSD) ? `$${priceUSD.toFixed(4)}` : 'N/A';
                  let totalValueUSD = 'N/A';
                  let totalValueFormatted = 'N/A';
                  if (!isNaN(priceUSD)) {
                    const totalValueNum = parseFloat(balanceFormatted) * priceUSD;
                    totalValueUSD = totalValueNum;
                    totalValueFormatted = `$${totalValueNum.toFixed(2)}`;
                  }

                  // Получаем информацию о сети
                  const chainInfo = SUPPORTED_CHAINS[token.chainId];
                  const chainName = chainInfo ? chainInfo.shortName : `Chain ${token.chainId}`;

                  return (
                    <tr key={`${token.contractAddress}-${token.chainId}`} className="hover:bg-gray-750 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-300">{token.symbol ? token.symbol.substring(0, 3) : '?'}</span>
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
                          {token.contractAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? 'Нативный' : token.contractAddress.substring(0, 6) + '...' + token.contractAddress.substring(token.contractAddress.length - 4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {balanceFormatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {priceFormatted}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${totalValueUSD !== 'N/A' && totalValueUSD < MIN_TOKEN_VALUE_USD ? 'text-yellow-500' : ''}`}>
                        {totalValueFormatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => copyToClipboard(token.contractAddress)}
                          className="text-indigo-400 hover:text-indigo-300 mr-3"
                          title="Копировать адрес"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openInExplorer(token.contractAddress, token.chainId)}
                          className="text-indigo-400 hover:text-indigo-300"
                          title="Открыть в эксплорере"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
                    Токены не найдены или отфильтрованы.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* === КОНЕЦ ТАБЛИЦЫ === */}

        {/* === СПИСОК СЕТЕЙ === */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Поддерживаемые сети</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {visibleChains.map(([chainId, chainData]) => (
              <button
                key={chainId}
                onClick={() => switchNetwork(parseInt(chainId))}
                disabled={chainId == chainId} // Сравнение с текущим chainId из контекста
                className={`p-4 rounded-xl border transition text-center ${chainId == chainId ? 'bg-indigo-900 bg-opacity-50 border-indigo-500' : 'bg-gray-800 bg-opacity-50 border-gray-700 hover:border-gray-500'}`}
              >
                <div className="text-lg font-medium">{chainData.name}</div>
                <div className="text-xs text-gray-400">ID: {chainId}</div>
              </button>
            ))}
          </div>
        </div>
        {/* === КОНЕЦ СПИСКА СЕТЕЙ === */}
      </div>
    </div>
  );
};

export default WalletTokens;