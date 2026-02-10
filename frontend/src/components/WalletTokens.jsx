import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
// Импортируем конфигурацию сетей
import { SUPPORTED_CHAINS } from '../config/supportedChains';
// === ИМПОРТЫ СЕРВИСОВ ===
import { updateTokens } from '../services/tokenService'; // Основной импорт для получения данных
import { getCachedTokens, canPerformBackgroundUpdate, setLastUpdateTime } from '../services/cacheService'; // Импортируем setLastUpdateTime
// === ИМПОРТЫ ИЗ НОВОГО ФАЙЛА КОНФИГУРАЦИИ ===
import { getUpdateIntervalMinutes, CACHE_DURATION_MS as DEFAULT_CACHE_DURATION_MS } from '../config/appConfig'; // Импортируем дефолтный CACHE_DURATION_MS
// === КОНЕЦ ИМПОРТОВ ===
// === КОНСТАНТЫ ===
const MIN_TOKEN_VALUE_USD = 0.1;
const MIN_UPDATE_INTERVAL_MS = 30000; // 30 секунд
const SELECTED_CHAINS_STORAGE_KEY = 'defiPool_selectedChains'; // Ключ для localStorage
// === КОНЕЦ КОНСТАНТ ===

const WalletTokens = () => {
  const { provider, account, signer, chainId, switchNetwork } = useWeb3();
  const [tokens, setTokens] = useState([]); // Содержит все токены
  const [loading, setLoading] = useState(true); // Изначально true
  const [error, setError] = useState(null);
  // === СОСТОЯНИЕ ДЛЯ ИНТЕРВАЛА ===
  const [effectiveUpdateIntervalMinutes, setEffectiveUpdateIntervalMinutes] = useState(5); // Начальное значение
  const [intervalLoading, setIntervalLoading] = useState(true); // Состояние загрузки интервала
  // === КОНЕЦ СОСТОЯНИЯ ===
  // === СОСТОЯНИЕ ДЛЯ ОБРАТНОГО ОТСЧЕТА ===
  const [timeUntilNextUpdate, setTimeUntilNextUpdate] = useState(0); // В миллисекундах
  const [lastUpdateTime, setLastUpdateTimeState] = useState(null); // Время последнего обновления (состояние компонента)
  const countdownIntervalRef = useRef(null);
  // === КОНЕЦ СОСТОЯНИЯ ДЛЯ ОБРАТНОГО ОТСЧЕТА ===
  const intervalRef = useRef(null);
  // === useRef ДЛЯ ОТСЛЕЖИВАНИЯ МОНТИРОВАНИЯ ===
  const isMountedRef = useRef(true);
  // === КОНЕЦ useRef ДЛЯ ОТСЛЕЖИВАНИЯ МОНТИРОВАНИЯ ===
  const loadedNetworks = useRef(new Set()); // Ref для отслеживания уже загруженных сетей
  // === СОСТОЯНИЯ ДЛЯ ФИЛЬТРОВ ОТОБРАЖЕНИЯ ===
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [showLowValue, setShowLowValue] = useState(false);
  // === КОНЕЦ СОСТОЯНИЯ ДЛЯ ФИЛЬТРОВ ===
  // Состояние для фильтра сетей
  const [selectedChains, setSelectedChains] = useState(new Set());
  const [showInactiveNetworks, setShowInactiveNetworks] = useState(false); // По умолчанию скрыть неактивные сети

  // === НОВОЕ СОСТОЯНИЕ ДЛЯ СУММАРНОГО БАЛАНСА ===
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalBalanceLoading, setTotalBalanceLoading] = useState(true);
  // === КОНЕЦ НОВОГО СОСТОЯНИЯ ===

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
      console.log("[WalletTokens] Нет токенов для фильтрации (массив пустой)");
      return [];
    }
    let result = [...tokens];
    console.log(`[WalletTokens] Начальное количество токенов для фильтрации: ${result.length}`);

    if (selectedChains.size > 0) {
      const initialCount = result.length;
      result = result.filter(token =>
        token.chainId !== undefined && selectedChains.has(token.chainId)
      );
      console.log(`[WalletTokens] После фильтра по сетям: ${result.length} (отфильтровано ${initialCount - result.length})`);
    }

    if (showZeroBalance) {
      const initialCount = result.length;
      result = result.filter(token => {
        try {
          const balance = parseFloat(ethers.utils.formatUnits(token.balance, token.decimals));
          return balance > 0;
        } catch (err) {
          console.error(`[WalletTokens] Ошибка при парсинге баланса токена ${token.symbol}:`, err);
          return true;
        }
      });
      console.log(`[WalletTokens] После фильтра по балансу: ${result.length} (отфильтровано ${initialCount - result.length})`);
    }

    if (showLowValue) {
      const initialCount = result.length;
      result = result.filter(token => {
        try {
          const balanceFormatted = parseFloat(ethers.utils.formatUnits(token.balance, token.decimals));
          // Исправлено: явная проверка на null и NaN
          const priceUSD = token.priceUSD;
          if (priceUSD === null || priceUSD === undefined || isNaN(parseFloat(priceUSD))) return true;
          const priceNum = parseFloat(priceUSD);
          const totalValueUSD = balanceFormatted * priceNum;
          return totalValueUSD >= MIN_TOKEN_VALUE_USD;
        } catch (err) {
          console.error(`[WalletTokens] Ошибка при расчете стоимости токена ${token.symbol}:`, err);
          return true;
        }
      });
      console.log(`[WalletTokens] После фильтра по стоимости: ${result.length} (отфильтровано ${initialCount - result.length})`);
    }

    result.sort((a, b) => {
      try {
        const aBalanceFormatted = parseFloat(ethers.utils.formatUnits(a.balance, a.decimals));
        const bBalanceFormatted = parseFloat(ethers.utils.formatUnits(b.balance, b.decimals));
        // Исправлено: явная проверка на null и NaN
        const aPriceUSD = a.priceUSD;
        const bPriceUSD = b.priceUSD;
        // Проверяем, являются ли цены валидными числами
        const aPriceNum = (typeof aPriceUSD === 'number' && !isNaN(aPriceUSD)) ? aPriceUSD : 0;
        const bPriceNum = (typeof bPriceUSD === 'number' && !isNaN(bPriceUSD)) ? bPriceUSD : 0;
        const aValueUSD = aBalanceFormatted * aPriceNum;
        const bValueUSD = bBalanceFormatted * bPriceNum;
        if (bValueUSD !== aValueUSD) {
          return bValueUSD - aValueUSD;
        }
        return a.symbol.localeCompare(b.symbol);
      } catch (err) {
        console.error("[WalletTokens] Ошибка при сортировке токенов:", err);
        return 0;
      }
    });

    console.log(`[WalletTokens] Финальное количество токенов после фильтрации: ${result.length}`);
    return result;
  }, [tokens, showZeroBalance, showLowValue, selectedChains, chainId]);

  // === ОБРАБОТЧИКИ ФИЛЬТРОВ ===
  const toggleZeroBalanceFilter = useCallback(() => {
    console.log("[WalletTokens] Переключение фильтра нулевых балансов");
    setShowZeroBalance(prev => !prev);
  }, []);

  const toggleLowValueFilter = useCallback(() => {
    console.log("[WalletTokens] Переключение фильтра низкой стоимости");
    setShowLowValue(prev => !prev);
  }, []);

  const toggleInactiveNetworksVisibility = useCallback(() => {
    console.log("[WalletTokens] Переключение видимости неактивных сетей");
    setShowInactiveNetworks(prev => !prev);
  }, []);

  const toggleChainSelection = useCallback((chainIdToToggle) => {
    console.log(`[WalletTokens] Переключение выбора сети ${chainIdToToggle}`);
    setSelectedChains(prevSelectedChains => {
      const newSelectedChains = new Set(prevSelectedChains);
      if (newSelectedChains.has(chainIdToToggle)) {
        newSelectedChains.delete(chainIdToToggle);
        console.log(`[WalletTokens] Сеть ${chainIdToToggle} удалена из selectedChains`);
      } else {
        newSelectedChains.add(chainIdToToggle);
        console.log(`[WalletTokens] Сеть ${chainIdToToggle} добавлена в selectedChains`);
      }
      return newSelectedChains;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!account || !provider || !chainId) {
      console.log("[WalletTokens] handleRefresh: Недостаточно данных для обновления", { account, provider, chainId });
      return;
    }
    console.log("[WalletTokens] Начинаем обновление токенов для текущей сети...");
    // Очищаем список загруженных сетей только для основной сети
    loadedNetworks.current.delete(chainId);
    try {
      await updateTokens(account, provider, (newTokens) => {
        if (isMountedRef.current) {
          setTokens(prevTokens => {
            const tokensWithoutCurrentChain = prevTokens.filter(token => token.chainId !== chainId);
            return [...tokensWithoutCurrentChain, ...newTokens];
          });
        }
      }, setLoading, setError, chainId, isMountedRef);
      loadedNetworks.current.add(chainId);

      // ИСПРАВЛЕНО: Правильное сохранение времени
      const now = Date.now();
      setLastUpdateTimeState(now); // Обновляем состояние компонента
      setLastUpdateTime(account, chainId, now); // Сохраняем в localStorage

      // Сбрасываем счетчик после обновления
      const intervalMs = effectiveUpdateIntervalMinutes * 60 * 1000;
      const clampedIntervalMs = Math.max(intervalMs, MIN_UPDATE_INTERVAL_MS);
      setTimeUntilNextUpdate(clampedIntervalMs);
    } catch (err) {
      console.error("[WalletTokens] Ошибка при ручном обновлении токенов:", err);
      if (isMountedRef.current) {
        setError(err.message || 'Ошибка при обновлении токенов');
      }
    }
  }, [account, provider, chainId, effectiveUpdateIntervalMinutes]);

  // === ОБРАБОТЧИКИ ДЛЯ ТОКЕНОВ ===
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log("[WalletTokens] Адрес скопирован в буфер обмена");
    } catch (err) {
      console.error('[WalletTokens] Ошибка при копировании: ', err);
    }
  }, []);

  const openInExplorer = useCallback((address, tokenChainId) => {
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
  }, [account]);

  // === ФОРМАТИРОВАНИЕ ВРЕМЕНИ ОБРАТНОГО ОТСЧЕТА ===
  const formatTimeLeft = useCallback((milliseconds) => {
    if (milliseconds <= 0) return 'Скоро';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);
  // === КОНЕЦ ФОРМАТИРОВАНИЯ ===

  // --- ИНИЦИАЛИЗАЦИЯ selectedChains ---
  useEffect(() => {
    console.log("[WalletTokens] Инициализация selectedChains...");
    let initialChains = new Set();
    try {
      const savedChainsStr = localStorage.getItem(SELECTED_CHAINS_STORAGE_KEY);
      if (savedChainsStr) {
        const savedChainsArray = JSON.parse(savedChainsStr);
        if (Array.isArray(savedChainsArray)) {
          initialChains = new Set(savedChainsArray);
          console.log(`[WalletTokens] Загружены сохранённые сети из localStorage:`, Array.from(initialChains));
        }
      }
    } catch (e) {
      console.warn("[WalletTokens] Не удалось загрузить selectedChains из localStorage:", e);
    }

    if (initialChains.size === 0 && chainId) {
      initialChains.add(chainId);
      console.log(`[WalletTokens] Установка начального selectedChains в [${chainId}]`);
    } else if (initialChains.size === 0) {
      console.log("[WalletTokens] Нет сохранённых сетей и chainId пустой, selectedChains остаётся пустым");
    }

    setSelectedChains(initialChains);
  }, [chainId]);

  // --- СОХРАНЕНИЕ selectedChains ---
  useEffect(() => {
    try {
      if (selectedChains.size > 0) {
        localStorage.setItem(SELECTED_CHAINS_STORAGE_KEY, JSON.stringify(Array.from(selectedChains)));
        console.log(`[WalletTokens] selectedChains сохранены в localStorage:`, Array.from(selectedChains));
      }
    } catch (e) {
      console.warn("[WalletTokens] Не удалось сохранить selectedChains в localStorage:", e);
    }
  }, [selectedChains]);

  // --- УПРАВЛЕНИЕ effectiveUpdateIntervalMinutes и обратным отсчетом ---
  useEffect(() => {
    let isCancelled = false;
    const loadUpdateInterval = async () => {
      try {
        console.log(`[WalletTokens] Попытка загрузки интервала обновления для пользователя: ${account}`);
        setIntervalLoading(true);
        const intervalMinutes = await getUpdateIntervalMinutes(account);
        console.log(`[WalletTokens] Загружен интервал обновления: ${intervalMinutes} минут`);
        if (!isCancelled && isMountedRef.current) {
          setEffectiveUpdateIntervalMinutes(intervalMinutes);
          setIntervalLoading(false);
        }
      } catch (error) {
        console.error('[WalletTokens] Ошибка при загрузке интервала обновления:', error);
        if (!isCancelled && isMountedRef.current) {
          setEffectiveUpdateIntervalMinutes(5);
          setIntervalLoading(false);
        }
      }
    };

    if (account) {
      loadUpdateInterval();
    }

    return () => {
      isCancelled = true;
    };
  }, [account]);

  // === ИСПРАВЛЕННЫЙ ЭФФЕКТ ДЛЯ УПРАВЛЕНИЯ ОБРАТНЫМ ОТСЧЁТОМ ===
  useEffect(() => {
    // Очищаем предыдущий интервал отсчета
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    if (!account || !chainId) {
      setTimeUntilNextUpdate(0);
      setLastUpdateTimeState(null);
      return;
    }

    // Функция получения времени последнего обновления из localStorage
    const getLastUpdateFromStorage = () => {
      try {
        const lastUpdateKey = `defiPool_lastUpdate_${account}_${chainId}`;
        const lastUpdateStr = localStorage.getItem(lastUpdateKey);
        if (lastUpdateStr) {
          const lastUpdate = parseInt(lastUpdateStr, 10);
          if (!isNaN(lastUpdate)) {
            return lastUpdate;
          }
        }
      } catch (e) {
        console.error("[WalletTokens] Ошибка при получении времени последнего обновления:", e);
      }
      return null;
    };

    // Функция обновления счетчика
    const updateCountdown = () => {
      try {
        const lastUpdate = getLastUpdateFromStorage();
        setLastUpdateTimeState(lastUpdate);

        if (!lastUpdate) {
          setTimeUntilNextUpdate(0);
          return;
        }

        const intervalMs = effectiveUpdateIntervalMinutes * 60 * 1000;
        const clampedIntervalMs = Math.max(intervalMs, MIN_UPDATE_INTERVAL_MS);
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdate;
        const timeLeft = clampedIntervalMs - timeSinceLastUpdate;

        if (timeLeft <= 0) {
          setTimeUntilNextUpdate(0);
        } else {
          setTimeUntilNextUpdate(timeLeft);
        }
      } catch (e) {
        console.error("[WalletTokens] Ошибка при расчете обратного отсчета:", e);
        setTimeUntilNextUpdate(0);
      }
    };

    // Обновляем счетчик сразу и затем каждую секунду
    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [account, chainId, effectiveUpdateIntervalMinutes]); // Убрали intervalLoading из зависимостей
  // === КОНЕЦ ИСПРАВЛЕННОГО ЭФФЕКТА ===

  // === ДОБАВЛЕННЫЙ ЭФФЕКТ ДЛЯ СИНХРОНИЗАЦИИ КОНФИГУРАЦИИ ===
  useEffect(() => {
    const handleConfigUpdate = (event) => {
      const newConfig = event.detail;
      if (newConfig && typeof newConfig.updateIntervalMinutes === 'number' && newConfig.updateIntervalMinutes > 0) {
        console.log(`[WalletTokens] Обновление интервала через событие: ${newConfig.updateIntervalMinutes} минут`);
        setEffectiveUpdateIntervalMinutes(newConfig.updateIntervalMinutes);
      }
    };

    window.addEventListener('appConfigUpdated', handleConfigUpdate);
    return () => {
      window.removeEventListener('appConfigUpdated', handleConfigUpdate);
    };
  }, []);
  // === КОНЕЦ ДОБАВЛЕННОГО ЭФФЕКТА ===

  // --- ОСНОВНОЙ ЭФФЕКТ ДЛЯ ЗАГРУЗКИ ТОКЕНОВ ОСНОВНОЙ СЕТИ ---
  useEffect(() => {
    isMountedRef.current = true;

    const initializeTokens = async () => {
      if (!account || !provider || !chainId) {
        console.log("[WalletTokens] Пропуск инициализации токенов основной сети: нет данных", { account, provider, chainId });
        if (isMountedRef.current) {
          setLoading(false);
          setTotalBalanceLoading(false);
        }
        return;
      }

      if (loadedNetworks.current.has(chainId)) {
        console.log(`[WalletTokens] Токены для основной сети ${chainId} уже были загружены ранее, пропуск инициализации`);
        if (isMountedRef.current) {
          setLoading(false);
          setTotalBalanceLoading(false);
        }
        return;
      }

      console.log("[WalletTokens] Начальное получение токенов для основной сети...");

      try {
        const cachedTokens = getCachedTokens(account, chainId);
        if (cachedTokens && Array.isArray(cachedTokens) && cachedTokens.length > 0) {
          console.log(`[WalletTokens] Найдены закэшированные токены для основной сети (${cachedTokens.length} шт.)`);
          if (isMountedRef.current) {
            setTokens(prevTokens => {
              const tokensWithoutCurrentChain = prevTokens.filter(token => token.chainId !== chainId);
              return [...tokensWithoutCurrentChain, ...cachedTokens];
            });
            setLoading(false);
          }
          loadedNetworks.current.add(chainId);
        }

        await updateTokens(account, provider, (newTokens) => {
          if (isMountedRef.current) {
            setTokens(prevTokens => {
              const tokensWithoutCurrentChain = prevTokens.filter(token => token.chainId !== chainId);
              return [...tokensWithoutCurrentChain, ...newTokens];
            });
          }
        }, null, null, chainId, isMountedRef);

        loadedNetworks.current.add(chainId);

        // Сохраняем время последнего обновления
        const now = Date.now();
        setLastUpdateTimeState(now);
        setLastUpdateTime(account, chainId, now);

        // Сбросим счетчик после обновления
        const intervalMs = effectiveUpdateIntervalMinutes * 60 * 1000;
        const clampedIntervalMs = Math.max(intervalMs, MIN_UPDATE_INTERVAL_MS);
        setTimeUntilNextUpdate(clampedIntervalMs);

        if (isMountedRef.current) {
          setLoading(false);
        }
      } catch (err) {
        console.error("[WalletTokens] Ошибка в initializeTokens для основной сети:", err);
        if (isMountedRef.current) {
          setError(err.message || 'Ошибка при инициализации токенов основной сети');
          setLoading(false);
        }
      }
    };

    initializeTokens();

    return () => {
      isMountedRef.current = false;
    };
  }, [account, provider, chainId]);

  // --- ЭФФЕКТ ДЛЯ ЗАГРУЗКИ ТОКЕНОВ ДОПОЛНИТЕЛЬНЫХ СЕТЕЙ ---
  useEffect(() => {
    const loadTokensForSelectedChains = async () => {
      if (!account || !provider) return;

      const chainsToLoad = Array.from(selectedChains).filter(chainIdToLoad =>
        chainIdToLoad !== chainId && !loadedNetworks.current.has(chainIdToLoad)
      );

      if (chainsToLoad.length === 0) {
        console.log("[WalletTokens] Нет новых сетей для загрузки токенов");
        return;
      }

      console.log(`[WalletTokens] Начинаем загрузку токенов для дополнительных сетей:`, chainsToLoad);

      for (const chainIdToLoad of chainsToLoad) {
        try {
          console.log(`[WalletTokens] Загрузка токенов для сети ${chainIdToLoad}...`);

          const cachedTokens = getCachedTokens(account, chainIdToLoad);
          if (cachedTokens && Array.isArray(cachedTokens) && cachedTokens.length > 0) {
            console.log(`[WalletTokens] Найдены закэшированные токены для сети ${chainIdToLoad} (${cachedTokens.length} шт.)`);
            if (isMountedRef.current) {
              setTokens(prevTokens => {
                const tokensWithoutCurrentChain = prevTokens.filter(token => token.chainId !== chainIdToLoad);
                return [...tokensWithoutCurrentChain, ...cachedTokens];
              });
            }
            loadedNetworks.current.add(chainIdToLoad);
            continue;
          }

          await updateTokens(account, provider, (newTokens) => {
            if (isMountedRef.current) {
              setTokens(prevTokens => {
                const tokensWithoutCurrentChain = prevTokens.filter(token => token.chainId !== chainIdToLoad);
                return [...tokensWithoutCurrentChain, ...newTokens];
              });
            }
          }, null, null, chainIdToLoad, isMountedRef);

          loadedNetworks.current.add(chainIdToLoad);
          console.log(`[WalletTokens] Токены для сети ${chainIdToLoad} успешно загружены`);
        } catch (err) {
          console.error(`[WalletTokens] Ошибка при загрузке токенов для сети ${chainIdToLoad}:`, err);
        }
      }
    };

    loadTokensForSelectedChains();
  }, [selectedChains, account, provider, chainId]);

  // --- ЭФФЕКТ ДЛЯ УПРАВЛЕНИЯ ИНТЕРВАЛОМ АВТООБНОВЛЕНИЯ ---
  useEffect(() => {
    if (intervalRef.current) {
      console.log('[WalletTokens] Очистка предыдущего интервала обновления токенов');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!account || !provider || !chainId || effectiveUpdateIntervalMinutes <= 0) {
      console.log('[WalletTokens] Недостаточно данных для установки интервала обновления');
      return;
    }

    console.log(`[WalletTokens] Установка интервала обновления токенов: ${effectiveUpdateIntervalMinutes} минут`);

    const intervalMs = effectiveUpdateIntervalMinutes * 60 * 1000;
    const clampedIntervalMs = Math.max(intervalMs, MIN_UPDATE_INTERVAL_MS);

    intervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) {
        console.log("[WalletTokens] Компонент размонтирован, отмена фонового обновления");
        return;
      }

      // Проверяем, можно ли выполнить обновление
      const canUpdate = canPerformBackgroundUpdate(account, chainId, clampedIntervalMs);
      console.log(`[WalletTokens] Проверка возможности фонового обновления для сети ${chainId}:`, canUpdate);

      if (canUpdate) {
        console.log(`[WalletTokens] Автоматическое обновление токенов для основной сети ${chainId}`);
        try {
          await updateTokens(account, provider, (newTokens) => {
            if (isMountedRef.current) {
              setTokens(prevTokens => {
                const tokensWithoutCurrentChain = prevTokens.filter(token => token.chainId !== chainId);
                return [...tokensWithoutCurrentChain, ...newTokens];
              });
            }
          }, null, null, chainId, isMountedRef);

          // Сохраняем время последнего обновления
          const now = Date.now();
          setLastUpdateTimeState(now);
          setLastUpdateTime(account, chainId, now);

          // После обновления сбросим счетчик до следующего обновления
          setTimeUntilNextUpdate(clampedIntervalMs);
        } catch (err) {
          console.error("[WalletTokens] Ошибка при фоновом обновлении токенов основной сети:", err);
        }
      } else {
        console.log(`[WalletTokens] Фоновое обновление для сети ${chainId} отложено согласно политике кэширования.`);
      }
    }, clampedIntervalMs); // Интервал срабатывает каждые clampedIntervalMs

    return () => {
      if (intervalRef.current) {
        console.log('[WalletTokens] Очистка интервала обновления токенов при размонтировании/изменении зависимостей');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [account, provider, chainId, effectiveUpdateIntervalMinutes]); // Зависимость от effectiveUpdateIntervalMinutes

  // === ЭФФЕКТ ДЛЯ РАСЧЕТА СУММАРНОГО БАЛАНСА ===
  useEffect(() => {
    if (filteredTokens.length === 0) {
      setTotalBalance(0);
      setTotalBalanceLoading(false);
      return;
    }

    let total = 0;
    for (const token of filteredTokens) {
      try {
        const balanceFormatted = parseFloat(ethers.utils.formatUnits(token.balance, token.decimals));
        if (token.priceUSD && !isNaN(token.priceUSD) && token.priceUSD > 0) {
          total += balanceFormatted * token.priceUSD;
        }
      } catch (err) {
        console.error("Ошибка при расчете стоимости токена:", err);
      }
    }

    setTotalBalance(total);
    setTotalBalanceLoading(false);
  }, [filteredTokens]);
  // === КОНЕЦ ЭФФЕКТА ДЛЯ РАСЧЕТА СУММАРНОГО БАЛАНСА ===

  // === РЕНДЕР СОДЕРЖИМОГО ТАБЛИЦЫ ===
  const renderTableContent = () => {
    console.log("[WalletTokens] Рендер содержимого таблицы:", {
      loading,
      error,
      tokensLength: tokens.length,
      filteredTokensLength: filteredTokens.length
    });

    if (loading && tokens.length === 0) {
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
        // === ИСПРАВЛЕНИЕ 1: Используем данные из объекта токена ===
        const displaySymbol = token.symbol || 'Unknown';
        const displayName = token.name || 'Unknown Token';
        // === КОНЕЦ ИСПРАВЛЕНИЯ 1 ===

        const tokenAddress = token.contractAddress || '0x0000...';
        const tokenChainId = token.chainId;

        let balanceFormatted = '0.00000000';
        try {
          balanceFormatted = parseFloat(ethers.utils.formatUnits(token.balance, token.decimals)).toFixed(8);
        } catch (err) {
          console.error(`[WalletTokens] Ошибка при форматировании баланса для токена ${displaySymbol}:`, err);
          balanceFormatted = '0.00000000';
        }

        // === ИСПРАВЛЕНИЕ 2: Улучшенное и упрощенное отображение цены ===
        let priceFormatted = 'N/A';
        let totalValueFormatted = 'N/A';
        let isLowValue = false;

        const rawPriceUSD = token.priceUSD;
        if (typeof rawPriceUSD === 'number' && !isNaN(rawPriceUSD)) {
          if (rawPriceUSD >= 1) {
            priceFormatted = `$${rawPriceUSD.toFixed(2)}`;
          } else {
            priceFormatted = `$${rawPriceUSD.toPrecision(3)}`;
          }

          const balanceNum = parseFloat(balanceFormatted);
          const totalValueNum = balanceNum * rawPriceUSD;
          totalValueFormatted = `$${totalValueNum.toFixed(2)}`;

          if (totalValueNum < MIN_TOKEN_VALUE_USD) {
            isLowValue = true;
          }
        } else {
          priceFormatted = 'N/A';
          totalValueFormatted = 'N/A';
        }
        // === КОНЕЦ ИСПРАВЛЕНИЯ 2 ===

        const chainInfo = SUPPORTED_CHAINS[tokenChainId];
        const chainName = chainInfo ? chainInfo.shortName : `Chain ${tokenChainId || 'unknown'}`;

        return (
          <tr key={`${token.contractAddress}-${token.chainId}`} className="hover:bg-gray-750 transition">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-300">{displaySymbol.substring(0, 3)}</span>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium">{displayName}</div>
                  <div className="text-xs text-gray-400">{displaySymbol}</div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm">{chainName}</div>
              <div className="text-xs text-gray-400">
                {tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ||
                  tokenAddress === '0x0000000000000000000000000000000000000000' ? 'Нативный' :
                  tokenAddress.substring(0, 6) + '...' + tokenAddress.substring(tokenAddress.length - 4)}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
              {balanceFormatted}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
              {priceFormatted}
            </td>
            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${isLowValue ? 'text-yellow-500' : ''}`}>
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
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 10-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3-3a4 4 0 00-5.656 5.656l1.5 1.5a1 1 0 10-1.414 1.414l-1.5-1.5z" clipRule="evenodd" />
                </svg>
              </button>
            </td>
          </tr>
        );
      });
    } else {
      return (
        <tr>
          <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
            Токены не найдены
          </td>
        </tr>
      );
    }
  };

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

              {/* === НОВЫЙ БЛОК С СУММАРНЫМ БАЛАНСОМ === */}
              {account && (
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-400 mr-2">Общий баланс:</span>
                  <span className="text-sm font-medium text-white">
                    {totalBalanceLoading ? 'Загрузка...' : `$${totalBalance.toFixed(2)}`}
                  </span>
                </div>
              )}
              {/* === КОНЕЦ НОВОГО БЛОКА === */}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center text-sm text-gray-400">
                <span>Интервал:</span>
                <span className="ml-1 font-medium">{effectiveUpdateIntervalMinutes} мин</span>
                <span className="mx-2">|</span>
                <span>След. обновление:</span>
                <span className={`ml-1 font-medium ${timeUntilNextUpdate < 60000 ? 'text-yellow-400' : ''}`}>
                  {formatTimeLeft(timeUntilNextUpdate)}
                </span>
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

        {/* === 2. БЛОК ФИЛЬТРА СЕТЕЙ === */}
        <div className="mb-6 p-6 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Фильтр сетей</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(SUPPORTED_CHAINS).map(([id, chainData]) => {
              const chainIdNum = parseInt(id);
              const isSelected = selectedChains.has(chainIdNum);
              const isCurrent = chainIdNum === chainId;
              const isLoaded = loadedNetworks.current.has(chainIdNum);

              if (!showInactiveNetworks && !isSelected && !isCurrent) {
                return null;
              }

              return (
                <button
                  key={id}
                  onClick={() => toggleChainSelection(chainIdNum)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 relative ${isSelected
                    ? 'bg-indigo-900 bg-opacity-70 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : isCurrent
                      ? 'bg-gray-700 border-gray-500 text-gray-200 hover:border-indigo-400'
                      : 'bg-gray-800 bg-opacity-50 border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                >
                  <div className="text-sm font-bold truncate">{chainData.shortName.toUpperCase()}</div>
                  <div className="text-xs mt-1 truncate">{chainData.name}</div>
                  <div className="text-xs mt-1 text-gray-400">{chainIdNum}</div>
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
            <button
              onClick={toggleInactiveNetworksVisibility}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${showInactiveNetworks
                ? 'bg-gray-700 border-gray-500 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-800 bg-opacity-50 border-gray-600 text-gray-400 hover:border-gray-400'
                }`}
            >
              <div className="text-sm font-bold text-center">
                {showInactiveNetworks ? 'Скрыть неактивные' : 'Показать неактивные'}
              </div>
              <div className="text-xs mt-1 text-center">сети</div>
            </button>
          </div>
          {selectedChains.size > 0 && (
            <div className="mt-4 text-sm text-gray-400">
              Выбрано сетей: {selectedChains.size}
            </div>
          )}
        </div>

        {/* === 3. БЛОК ФИЛЬТРОВ ТОКЕНОВ === */}
        <div className="mb-6 p-6 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">Фильтры токенов</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleZeroBalanceFilter}
              className={`px-4 py-2 text-sm rounded-full transition ${showZeroBalance
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
            >
              {showZeroBalance ? 'Скрыть нулевые балансы' : 'Показывать нулевые'}
            </button>
            <button
              onClick={toggleLowValueFilter}
              className={`px-4 py-2 text-sm rounded-full transition ${showLowValue
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
      </div>
    </div>
  );
};

export default WalletTokens;