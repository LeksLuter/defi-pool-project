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
// ВАЖНО: Импортируем функцию, которая теперь загружает ГЛОБАЛЬНУЮ конфигурацию
import { getUpdateIntervalMinutes } from '../config/appConfig';
// === КОНЕЦ ИМПОРТОВ ИЗ НОВОГО ФАЙЛА КОНФИГУРАЦИИ ===

// === КОНСТАНТЫ ===
const MIN_TOKEN_VALUE_USD = 0.1; // Константа для минимальной стоимости отображения
const MIN_UPDATE_INTERVAL_MS = 30000; // 30 секунд, минимальный интервал для фонового обновления
// === КОНЕЦ КОНСТАНТ ===

const WalletTokens = () => {
  const { provider, account, signer, chainId, switchNetwork } = useWeb3();
  const [tokens, setTokens] = useState([]); // Содержит все токены, полученные из сервиса
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // === СОСТОЯНИЕ ДЛЯ ИНТЕРВАЛА ===
  const [effectiveUpdateIntervalMinutes, setEffectiveUpdateIntervalMinutes] = useState(10); // Значение по умолчанию
  // === КОНЕЦ СОСТОЯНИЯ ===

  const intervalRef = useRef(null);
  const hasFetchedTokens = useRef(false);
  // === useRef ДЛЯ ОТСЛЕЖИВАНИЯ МОНТИРОВАНИЯ ===
  // Это ключевое изменение для предотвращения обновления состояния в размонтированном компоненте
  const isMountedRef = useRef(true);
  // === КОНЕЦ useRef ДЛЯ ОТСЛЕЖИВАНИЯ МОНТИРОВАНИЯ ===
  const loadedNetworks = useRef(new Set()); // Ref для отслеживания уже загруженных сетей

  // === СОСТОЯНИЯ ДЛЯ ФИЛЬТРОВ ОТОБРАЖЕНИЯ ===
  // По умолчанию фильтры ВЫКЛЮЧЕНЫ (показываются все токены)
  // false = фильтр НЕ активен = показываем всё
  const [showZeroBalance, setShowZeroBalance] = useState(false); // false = показывать нулевые балансы
  const [showLowValue, setShowLowValue] = useState(false); // false = показывать низкостоймостные токены
  // === КОНЕЦ СОСТОЯНИЙ ДЛЯ ФИЛЬТРОВ ===

  // Состояние для фильтра сетей
  const [selectedChains, setSelectedChains] = useState(new Set()); // Множество выбранных сетей
  const [showInactiveNetworks, setShowInactiveNetworks] = useState(false); // Показывать неактивные сети

  // Инициализация выбранных сетей только текущей сетью
  useEffect(() => {
    console.log("[WalletTokens] chainId changed или компонент смонтирован:", chainId);
    if (chainId) {
      console.log(`[WalletTokens] Установка selectedChains в [${chainId}]`);
      setSelectedChains(new Set([chainId]));
      // Добавляем текущую сеть в загруженные
      loadedNetworks.current.add(chainId);
    } else {
      console.log("[WalletTokens] chainId пустой, очищаем selectedChains");
      setSelectedChains(new Set());
    }
  }, [chainId]);

  // === ЭФФЕКТ ДЛЯ ЗАГРУЗКИ ИНТЕРВАЛА ИЗ adminConfig ===
  useEffect(() => {
    const loadUpdateInterval = async () => {
      try {
        // ВАЖНО: Теперь getUpdateIntervalMinutes() загружает ГЛОБАЛЬНУЮ конфигурацию
        // Она сама обрабатывает загрузку из API или localStorage
        const intervalMinutes = await getUpdateIntervalMinutes();
        console.log(`[WalletTokens] Загружен интервал обновления: ${intervalMinutes} минут`);
        setEffectiveUpdateIntervalMinutes(intervalMinutes);
      } catch (error) {
        console.error('[WalletTokens] Ошибка при загрузке интервала обновления:', error);
        setEffectiveUpdateIntervalMinutes(10); // Значение по умолчанию
      }
    };

    loadUpdateInterval();
  }, []);
  // === КОНЕЦ ЭФФЕКТА ===

  // Функция для обновления токенов конкретной сети
  const fetchTokensForNetwork = async (networkChainId) => {
    if (!account || !provider || !networkChainId) {
      console.log("[WalletTokens] fetchTokensForNetwork: Недостаточно данных для обновления", { account, provider, networkChainId });
      return [];
    }
    
    console.log(`[WalletTokens] Начинаем обновление токенов для сети ${networkChainId}...`);
    // Устанавливаем loading только если компонент смонтирован
    if (isMountedRef.current) {
        setLoading(true);
    }
    // Устанавливаем setError только если компонент смонтирован
    if (isMountedRef.current) {
        setError(null);
    }
    
    try {
      // Создаем локальное состояние для этой операции
      let networkTokens = [];
      let networkLoading = true;
      let networkError = null;

      // Локальные функции setState, которые проверяют isMountedRef
      const setNetworkTokens = (newTokens) => {
        networkTokens = newTokens;
      };

      const setNetworkLoading = (isLoading) => {
        networkLoading = isLoading;
        // Устанавливаем loading только если компонент смонтирован
        if (isMountedRef.current) {
            setLoading(isLoading);
        }
      };

      const setNetworkError = (err) => {
        networkError = err;
        // Устанавливаем error только если компонент смонтирован
        if (isMountedRef.current) {
            setError(err);
        }
      };

      // Вызываем updateTokens для конкретной сети, передавая isMountedRef
      await updateTokens(account, provider, setNetworkTokens, setNetworkLoading, setNetworkError, networkChainId, isMountedRef);

      if (networkError) {
        console.error(`[WalletTokens] Ошибка при получении токенов для сети ${networkChainId}:`, networkError);
        return [];
      }

      console.log(`[WalletTokens] Успешно получено ${networkTokens.length} токенов для сети ${networkChainId}`);
      
      // Помечаем сеть как загруженную
      loadedNetworks.current.add(networkChainId);
      
      return networkTokens || [];
    } catch (error) {
      console.error(`[WalletTokens] Критическая ошибка при получении токенов для сети ${networkChainId}:`, error);
      // Устанавливаем error только если компонент смонтирован
      if (isMountedRef.current) {
          setError(error.message || 'Неизвестная ошибка при загрузке токенов');
      }
      return [];
    } finally {
      // Устанавливаем loading в false только если компонент смонтирован
      if (isMountedRef.current) {
          setLoading(false);
      }
    }
  };

  // Функция для обновления токенов
  const handleRefresh = useCallback(async () => {
    if (!account || !provider || !chainId) {
        console.log("[WalletTokens] handleRefresh: Недостаточно данных для обновления", { account, provider, chainId });
        return;
    }
    console.log("[WalletTokens] Начинаем обновление токенов для текущей сети...");
    // Устанавливаем loading только если компонент смонтирован
    if (isMountedRef.current) {
        setLoading(true);
    }
    // Устанавливаем setError только если компонент смонтирован
    if (isMountedRef.current) {
        setError(null);
    }
    // Передаем isMountedRef в updateTokens
    await updateTokens(account, provider, setTokens, setLoading, setError, chainId, isMountedRef);
  }, [account, provider, chainId]);

  // Основная функция обновления токенов (делегирует всю логику сервису)
  useEffect(() => {
    // Устанавливаем флаг монтирования в true при монтировании
    isMountedRef.current = true;
    const initializeTokens = async () => {
      // Проверяем, что у нас есть все необходимые данные
      if (!account || !provider || !chainId) {
        console.log("[WalletTokens] Пропуск инициализации токенов: нет данных", { account, provider, chainId });
        // Если данных нет, но токены уже были загружены, убираем loading
        // Устанавливаем loading только если компонент смонтирован
        if (isMountedRef.current && tokens.length > 0) {
          setLoading(false);
        }
        return;
      }
      
      // Проверяем, не загружали ли мы уже токены для этой сети
      if (loadedNetworks.current.has(chainId)) {
        console.log(`[WalletTokens] Токены для сети ${chainId} уже были загружены ранее, пропуск инициализации`);
        // Устанавливаем loading только если компонент смонтирован
        if (isMountedRef.current) {
            setLoading(false); // Убедимся, что loading сброшен
        }
        return;
      }
      
      loadedNetworks.current.add(chainId);
      console.log("[WalletTokens] Начальное получение токенов для текущей сети...");
      
      // Получаем токены только для текущей сети
      try {
        // Передаем isMountedRef в updateTokens
        await updateTokens(account, provider, setTokens, setLoading, setError, chainId, isMountedRef);
      } catch (err) {
        console.error("[WalletTokens] Ошибка в initializeTokens:", err);
        // Устанавливаем error только если компонент смонтирован
        if (isMountedRef.current) {
            setError(err.message || 'Ошибка при инициализации токенов');
        }
        // Если ошибка, пытаемся получить только для текущей сети
        // Передаем isMountedRef в updateTokens
        updateTokens(account, provider, setTokens, setLoading, setError, chainId, isMountedRef);
      }
    };

    initializeTokens();

    return () => {
      // Устанавливаем флаг монтирования в false при размонтировании
      isMountedRef.current = false;
      // hasFetchedTokens.current = false; // Не сбрасываем, чтобы не запрашивать снова при размонтировании
    };
  }, [account, provider, chainId, tokens.length]); // Добавляем tokens.length для корректного сброса loading если данные есть

  // === ЭФФЕКТ ДЛЯ УПРАВЛЕНИЯ ИНТЕРВАЛОМ АВТООБНОВЛЕНИЯ ===
  useEffect(() => {
    if (!account || !provider || !chainId || effectiveUpdateIntervalMinutes <= 0) {
      if (intervalRef.current) {
        console.log('[WalletTokens] Очистка интервала обновления токенов');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    console.log(`[WalletTokens] Установка интервала обновления токенов: ${effectiveUpdateIntervalMinutes} минут`);
    const intervalMs = effectiveUpdateIntervalMinutes * 60 * 1000;
    const clampedIntervalMs = Math.max(intervalMs, MIN_UPDATE_INTERVAL_MS);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      // Проверяем, что компонент смонтирован перед выполнением
      if (!isMountedRef.current) {
        console.log("[WalletTokens] Компонент размонтирован, отмена фонового обновления");
        return;
      }
      console.log(`[WalletTokens] Автоматическое обновление токенов (интервал: ${effectiveUpdateIntervalMinutes} минут) для сети ${chainId}`);
      try {
        // Не показываем UI загрузки для фонового обновления
        // Передаем isMountedRef в updateTokens, но setLoading и setError будут null
        await updateTokens(account, provider, setTokens, null, null, chainId, isMountedRef);
      } catch (err) {
        // Логируем ошибку, но не отображаем пользователю для фонового обновления
        console.error("[WalletTokens] Ошибка при фоновом обновлении токенов:", err);
        // Ошибки фонового обновления не отображаем пользователю
      }
    }, clampedIntervalMs);

    return () => {
      if (intervalRef.current) {
        console.log('[WalletTokens] Очистка интервала обновления токенов');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [account, provider, chainId, effectiveUpdateIntervalMinutes]);
  // === КОНЕЦ ЭФФЕКТА ===

  // === ЛОГИКА ФИЛЬТРАЦИИ ТОКЕНОВ ДЛЯ ОТОБРАЖЕНИЯ ===
  const filteredTokens = useMemo(() => {
    console.log("[WalletTokens] Применение фильтров. Входные данные:", {
      tokensLength: tokens.length,
      showZeroBalance,
      showLowValue,
      selectedChains: Array.from(selectedChains),
      chainId
    });

    if (!Array.isArray(tokens) || tokens.length === 0) {
      console.log("[WalletTokens] Нет токенов для фильтрации");
      return [];
    }

    let result = [...tokens];
    console.log(`[WalletTokens] Начальное количество токенов: ${result.length}`);

    // Фильтр по сетям
    // Если selectedChains не пустой, фильтруем по выбранным сетям
    if (selectedChains.size > 0) {
      const initialCount = result.length;
      result = result.filter(token => {
        // Проверяем, что у токена есть chainId и он в списке выбранных
        if (token.chainId !== undefined && selectedChains.has(token.chainId)) {
          console.log(`[WalletTokens] Токен ${token.symbol} (${token.chainId}) в selectedChains: true`);
          return true;
        } else {
          console.log(`[WalletTokens] Токен ${token.symbol} (${token.chainId}) в selectedChains: false`);
          return false;
        }
      });
      console.log(`[WalletTokens] После фильтра по сетям: ${result.length} (отфильтровано ${initialCount - result.length})`);
    } else {
      console.log(`[WalletTokens] selectedChains пустой, фильтр по сетям не применяется`);
    }

    // Фильтр по балансу
    // showZeroBalance: false -> фильтр НЕ активен -> показываем ВСЕ (включая нулевые)
    // showZeroBalance: true -> фильтр активен -> скрываем нулевые
    if (showZeroBalance) {
      const initialCount = result.length;
      result = result.filter(token => {
        try {
          const balance = parseFloat(ethers.utils.formatUnits(token.balance, token.decimals));
          const shouldShow = balance > 0;
          console.log(`[WalletTokens] Токен ${token.symbol} баланс: ${balance}, показать: ${shouldShow}`);
          return shouldShow;
        } catch (err) {
          console.error(`[WalletTokens] Ошибка при парсинге баланса токена ${token.symbol}:`, err);
          return true; // Если ошибка, показываем токен
        }
      });
      console.log(`[WalletTokens] После фильтра по балансу: ${result.length} (отфильтровано ${initialCount - result.length})`);
    }

    // Фильтр по стоимости
    // showLowValue: false -> фильтр НЕ активен -> показываем ВСЕ (включая низкостоймостные)
    // showLowValue: true -> фильтр активен -> скрываем < $0.10
    if (showLowValue) {
      const initialCount = result.length;
      result = result.filter(token => {
        try {
          const balanceFormatted = parseFloat(ethers.utils.formatUnits(token.balance, token.decimals));
          const priceUSD = parseFloat(token.priceUSD);
          if (isNaN(priceUSD)) {
            console.log(`[WalletTokens] Токен ${token.symbol} цена не определена, показываем`);
            return true; // Если цена не определена, показываем токен
          }
          const totalValueUSD = balanceFormatted * priceUSD;
          const shouldShow = totalValueUSD >= MIN_TOKEN_VALUE_USD;
          console.log(`[WalletTokens] Токен ${token.symbol} стоимость: $${totalValueUSD.toFixed(2)}, показать: ${shouldShow}`);
          return shouldShow;
        } catch (err) {
          console.error(`[WalletTokens] Ошибка при расчете стоимости токена ${token.symbol}:`, err);
          return true; // Если ошибка, показываем токен
        }
      });
      console.log(`[WalletTokens] После фильтра по стоимости: ${result.length} (отфильтровано ${initialCount - result.length})`);
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
        console.error("[WalletTokens] Ошибка при сортировке токенов:", err);
        return 0; // Не меняем порядок в случае ошибки
      }
    });

    console.log(`[WalletTokens] Финальное количество токенов после фильтрации: ${result.length}`);
    return result;
  }, [tokens, showZeroBalance, showLowValue, selectedChains, chainId]); // Добавлен chainId как зависимость
  // === КОНЕЦ ЛОГИКИ ФИЛЬТРАЦИИ ТОКЕНОВ ===

  // === ОБРАБОТЧИКИ ФИЛЬТРОВ ===
  const toggleZeroBalanceFilter = () => {
    console.log("[WalletTokens] Переключение фильтра нулевых балансов");
    setShowZeroBalance(prev => !prev);
  };
  
  const toggleLowValueFilter = () => {
    console.log("[WalletTokens] Переключение фильтра низкой стоимости");
    setShowLowValue(prev => !prev);
  };
  
  const toggleInactiveNetworksVisibility = () => {
    console.log("[WalletTokens] Переключение видимости неактивных сетей");
    setShowInactiveNetworks(prev => !prev);
  };
  
  // Обработчик для выбора/отмены выбора сети
  const toggleChainSelection = async (chainIdToToggle) => {
    console.log(`[WalletTokens] Переключение выбора сети ${chainIdToToggle}`);
    
    const newSelectedChains = new Set(selectedChains);
    const wasSelected = newSelectedChains.has(chainIdToToggle);
    
    if (wasSelected) {
      newSelectedChains.delete(chainIdToToggle);
      console.log(`[WalletTokens] Сеть ${chainIdToToggle} удалена из selectedChains`);
    } else {
      newSelectedChains.add(chainIdToToggle);
      console.log(`[WalletTokens] Сеть ${chainIdToToggle} добавлена в selectedChains`);
      
      // Если сеть еще не загружалась, загружаем токены для нее
      if (!loadedNetworks.current.has(chainIdToToggle)) {
        console.log(`[WalletTokens] Сеть ${chainIdToToggle} еще не загружалась, начинаем загрузку...`);
        // Устанавливаем loading только если компонент смонтирован
        if (isMountedRef.current) {
            setLoading(true);
        }
        // Устанавливаем setError только если компонент смонтирован
        if (isMountedRef.current) {
            setError(null);
        }
        
        try {
          const networkTokens = await fetchTokensForNetwork(chainIdToToggle);
          
          // Проверяем, что компонент смонтирован перед обновлением состояния
          if (isMountedRef.current) {
            // Объединяем новые токены с существующими
            setTokens(prevTokens => {
              // Удаляем старые токены этой сети (на случай, если они были)
              const filteredTokens = prevTokens.filter(token => token.chainId !== chainIdToToggle);
              // Добавляем новые токены этой сети
              return [...filteredTokens, ...networkTokens];
            });
            // setLoading(false); // Уже устанавливается в finally fetchTokensForNetwork
            console.log(`[WalletTokens] Установлено ${networkTokens.length} токенов для сети ${chainIdToToggle}`);
            // Помечаем сеть как загруженную
            loadedNetworks.current.add(chainIdToToggle);
          }
        } catch (err) {
          console.error(`[WalletTokens] Ошибка при загрузке токенов для сети ${chainIdToToggle}:`, err);
          // Устанавливаем error только если компонент смонтирован
          if (isMountedRef.current) {
              setError(`Не удалось загрузить токены для сети ${chainIdToToggle}: ${err.message || 'Неизвестная ошибка'}`);
          }
          // Устанавливаем loading в false только если компонент смонтирован
          if (isMountedRef.current) {
              setLoading(false);
          }
        }
      }
    }
    
    setSelectedChains(newSelectedChains);
  };
  // === КОНЕЦ ОБРАБОТЧИКОВ ФИЛЬТРОВ ===

  // === ОБРАБОТЧИК КОПИРОВАНИЯ АДРЕСА ===
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log("[WalletTokens] Адрес скопирован в буфер обмена");
    } catch (err) {
      console.error('[WalletTokens] Ошибка при копировании: ', err);
    }
  };
  // === КОНЕЦ ОБРАБОТЧИКА КОПИРОВАНИЯ ===

  // === ОБРАБОТЧИК ОТКРЫТИЯ В ЭКСПЛОРЕРЕ ===
  const openInExplorer = (address, tokenChainId) => {
    if (address && tokenChainId) {
      const networkConfig = SUPPORTED_CHAINS[tokenChainId];
      const explorerUrl = networkConfig?.explorerUrl;
      if (explorerUrl) {
        let url = '';
        if (address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' || 
            address === '0x0000000000000000000000000000000000000000') {
          url = `${explorerUrl}/address/${account}`;
        } else {
          url = `${explorerUrl}/token/${address}`;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };
  // === КОНЕЦ ОБРАБОТЧИКА ОТКРЫТИЯ В ЭКСПЛОРЕРЕ ===

  // === РЕНДЕР СОСТОЯНИЙ ЗАГРУЗКИ И ОШИБКИ ВНУТРИ ТАБЛИЦЫ ===
  const renderTableContent = () => {
    console.log("[WalletTokens] Рендер содержимого таблицы:", { 
      loading, 
      error, 
      tokensLength: tokens.length, 
      filteredTokensLength: filteredTokens.length,
      hasFetchedTokens: hasFetchedTokens.current
    });
    
    if (loading) {
      return (
        <tr>
          <td colSpan="6" className="px-6 py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="text-gray-400">Загрузка токенов...</p>
            </div>
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan="6" className="px-6 py-8">
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
          </td>
        </tr>
      );
    }

    // Если токены загружены
    if (tokens.length > 0) {
      if (filteredTokens.length === 0) {
        return (
          <tr>
            <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
              Все токены отфильтрованы
            </td>
          </tr>
        );
      }
      
      return filteredTokens.map((token) => {
        // Проверяем наличие всех необходимых данных
        const tokenSymbol = token.symbol || 'Unknown';
        const tokenName = token.name || 'Unknown Token';
        const tokenAddress = token.contractAddress || '0x0000...';
        const tokenChainId = token.chainId;
        
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
        const chainInfo = SUPPORTED_CHAINS[tokenChainId];
        const chainName = chainInfo ? chainInfo.shortName : `Chain ${tokenChainId || 'unknown'}`;

        return (
          <tr key={`${token.contractAddress}-${token.chainId}`} className="hover:bg-gray-750 transition">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-300">{tokenSymbol.substring(0, 3)}</span>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium">{tokenName}</div>
                  <div className="text-xs text-gray-400">{tokenSymbol}</div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm">{chainName}</div>
              <div className="text-xs text-gray-400">
                {tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? 'Нативный' : tokenAddress.substring(0, 6) + '...' + tokenAddress.substring(tokenAddress.length - 4)}
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
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 10-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
              </button>
            </td>
          </tr>
        );
      });
    } else {
      // Нет токенов
      return (
        <tr>
          <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
            Токены не найдены
          </td>
        </tr>
      );
    }
  };
  // === КОНЕЦ РЕНДЕРА СОСТОЯНИЙ ===

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto max-w-6xl">
        
        {/* === 1. БЛОК КОШЕЛЬКА === */}
        <div className="mb-6 p-6 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Мои токены</h1>
              {account && (
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-400 mr-2">Адрес кошелька:</span>
                  <span className="text-sm font-mono bg-gray-700 px-3 py-1 rounded">{account.substring(0, 6)}...{account.substring(account.length - 4)}</span>
                  <button
                    onClick={() => copyToClipboard(account)}
                    className="ml-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    title="Копировать адрес"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center text-sm text-gray-400">
                <span>Интервал:</span>
                <span className="ml-1 font-medium">{effectiveUpdateIntervalMinutes} мин</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 flex items-center text-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Обновление...
                  </>
                ) : 'Обновить'}
              </button>
            </div>
          </div>
        </div>
        {/* === КОНЕЦ БЛОКА КОШЕЛЬКА === */}

        {/* === 2. БЛОК ФИЛЬТРА СЕТЕЙ === */}
        <div className="mb-6 p-6 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Фильтр сетей</h2>
            <button
              onClick={toggleInactiveNetworksVisibility}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-full transition"
            >
              {showInactiveNetworks ? 'Скрыть неактивные' : 'Показать неактивные'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(SUPPORTED_CHAINS).map(([id, chainData]) => {
              const chainIdNum = parseInt(id);
              const isSelected = selectedChains.has(chainIdNum);
              const isCurrent = chainIdNum === chainId;
              const isLoaded = loadedNetworks.current.has(chainIdNum);
              
              // Если не показываем неактивные и сеть не текущая и не выбрана, скрываем
              if (!showInactiveNetworks && !isSelected && !isCurrent) {
                return null;
              }
              
              return (
                <button
                  key={id}
                  onClick={() => toggleChainSelection(chainIdNum)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 relative ${
                    isSelected 
                      ? 'bg-indigo-900 bg-opacity-70 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                      : isCurrent 
                        ? 'bg-gray-700 border-gray-500 text-gray-200 hover:border-indigo-400' 
                        : 'bg-gray-800 bg-opacity-50 border-gray-600 text-gray-400 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-bold truncate">{chainData.shortName.toUpperCase()}</div>
                  <div className="text-xs mt-1 truncate">{chainData.name}</div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full border border-gray-800"></div>
                  )}
                  {isCurrent && !isSelected && (
                    <div className="absolute top-1 right-1 w-3 h-3 bg-yellow-400 rounded-full border border-gray-800"></div>
                  )}
                  {isLoaded && !isSelected && !isCurrent && (
                    <div className="absolute top-1 right-1 w-3 h-3 bg-blue-400 rounded-full border border-gray-800"></div>
                  )}
                </button>
              );
            })}
            {/* Кнопка показать/скрыть неактивные сети */}
            <button
              onClick={toggleInactiveNetworksVisibility}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                showInactiveNetworks
                  ? 'bg-gray-700 border-gray-500 text-gray-300'
                  : 'bg-gray-800 bg-opacity-50 border-gray-600 text-gray-400 hover:border-gray-400'
              }`}
            >
              <div className="text-sm font-bold">{showInactiveNetworks ? 'Скрыть неактивные' : 'Показать неактивные'}</div>
              <div className="text-xs mt-1">сети</div>
            </button>
          </div>
          
          {selectedChains.size > 0 && (
            <div className="mt-4 text-sm text-gray-400">
              Выбрано сетей: {selectedChains.size}
            </div>
          )}
        </div>
        {/* === КОНЕЦ БЛОКА ФИЛЬТРА СЕТЕЙ === */}

        {/* === 3. БЛОК ФИЛЬТРОВ ТОКЕНОВ === */}
        <div className="mb-6 p-6 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">Фильтры токенов</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleZeroBalanceFilter}
              className={`px-4 py-2 text-sm rounded-full transition ${
                showZeroBalance 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {showZeroBalance ? 'Скрыть нулевые балансы' : 'Показывать нулевые'}
            </button>
            
            <button
              onClick={toggleLowValueFilter}
              className={`px-4 py-2 text-sm rounded-full transition ${
                showLowValue 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {showLowValue ? `Скрыть < $${MIN_TOKEN_VALUE_USD.toFixed(2)}` : `Показывать < $${MIN_TOKEN_VALUE_USD.toFixed(2)}`}
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-400">
            Всего токенов: {tokens.length} | Отображается: {filteredTokens.length}
          </div>
        </div>
        {/* === КОНЕЦ БЛОКА ФИЛЬТРОВ ТОКЕНОВ === */}

        {/* === 4. БЛОК ТАБЛИЦЫ === */}
        <div className="rounded-xl border border-gray-700 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
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
                {renderTableContent()}
              </tbody>
            </table>
          </div>
        </div>
        {/* === КОНЕЦ БЛОКА ТАБЛИЦЫ === */}
        
      </div>
    </div>
  );
};

export default WalletTokens;