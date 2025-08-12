// frontend/src/services/tokenService.js
import * as etherscanV2Service from './etherscanV2Service';
import * as coingeckoService from './coingeckoService';
import * as coinmarketcapService from './coinmarketcapService';
import * as alchemyService from './alchemyService';
import * as defillamaService from './defillamaService';
import { fetchMultipleTokenPricesWithFallback } from './priceAggregatorService';
import { getTokenServicesConfig } from '../config/adminConfig';
import { SUPPORTED_CHAINS } from '../config/supportedChains';
import { saveTokensToCache, getCachedTokens, isCacheExpired } from './cacheService';
import { setLastUpdateTime, canPerformBackgroundUpdate } from './cacheService';

// === КОНСТАНТЫ ===
const MIN_UPDATE_INTERVAL_MS = 30000;
const CACHE_PREFIX = 'defi_pool_tokens';
const DEFAULT_CACHE_EXPIRY_MINUTES = 5;
// === КОНЕЦ КОНСТАНТ ===

/**
 * Получает список токенов с балансами для указанного аккаунта
 * @param {string} accountAddress Адрес кошелька пользователя
 * @param {ethers.providers.Provider} ethProvider Провайдер ethers.js
 * @param {number} chainIdValue ID сети
 * @returns {Promise<Array>} Массив токенов с балансами
 */
export const fetchTokensWithFallback = async (accountAddress, ethProvider, chainIdValue) => {
  const networkConfig = SUPPORTED_CHAINS[chainIdValue];
  if (!networkConfig) {
    console.warn(`[Token Service] Конфигурация сети ${chainIdValue} не найдена`);
    return [];
  }

  // Проверяем, что chainId корректный
  if (!chainIdValue || isNaN(chainIdValue)) {
    console.warn('[Token Service] Некорректный chainId:', chainIdValue);
    return [];
  }

  // Получаем конфигурацию сервисов с проверкой на корректность
  let tokenServicesConfig = getTokenServicesConfig();
  
  // Логируем конфигурацию для отладки
  console.log('[Token Service] Конфигурация сервисов:', tokenServicesConfig);
  
  // Проверяем, что конфигурация существует и является объектом
  if (!tokenServicesConfig || typeof tokenServicesConfig !== 'object') {
    console.warn('[Token Service] getTokenServicesConfig вернул некорректные данные, используем дефолтные настройки');
    tokenServicesConfig = {
      tokenServices: {
        EtherscanV2: true,
        Alchemy: true,
        DefiLlama: true,
        CoinGecko: true,
        CoinMarketCap: true,
      }
    };
  }

  const ALL_SERVICES = [
    { name: 'EtherscanV2', service: etherscanV2Service },
    { name: 'Alchemy', service: alchemyService },
    { name: 'DefiLlama', service: defillamaService },
    { name: 'CoinGecko', service: coingeckoService },
    { name: 'CoinMarketCap', service: coinmarketcapService },
  ];

  // Фильтруем сервисы согласно настройкам администратора с проверкой
  const enabledServices = ALL_SERVICES.filter(service => {
    // Проверяем, что сервис включен в конфигурации
    const isEnabled = tokenServicesConfig.tokenServices && tokenServicesConfig.tokenServices[service.name];
    console.log(`[Token Service] Сервис ${service.name} включен: ${isEnabled}`);
    if (isEnabled === false) {
      console.log(`[Token Service] Сервис ${service.name} отключен в настройках админки.`);
    }
    // Проверяем, что isEnabled это boolean и не undefined/null
    return isEnabled === true || isEnabled === undefined || isEnabled === null ? true : false;
  });

  console.log(`[Token Service] Используются сервисы получения токенов: ${enabledServices.map(s => s.name).join(', ')}`);

  // Попробуем получить токены из каждого сервиса по очереди
  for (const service of enabledServices) {
    try {
      console.log(`[Token Service] Попытка получения токенов через ${service.name}`);
      const tokens = await service.service.fetchTokens(accountAddress, ethProvider, chainIdValue);
      
      // Проверяем и корректируем данные токенов
      if (tokens && Array.isArray(tokens) && tokens.length > 0) {
        console.log(`[Token Service] Успешно получено ${tokens.length} токенов через ${service.name}`);
        
        // Корректируем chainId для токенов, если он отсутствует
        const correctedTokens = tokens.map(token => ({
          ...token,
          chainId: token.chainId || chainIdValue
        }));
        
        return correctedTokens;
      } else {
        console.warn(`[Token Service] Сервис ${service.name} вернул пустой или некорректный результат`);
      }
    } catch (error) {
      console.error(`[Token Service] Ошибка при получении токенов через ${service.name}:`, error);
    }
  }

  // Если все сервисы не сработали, возвращаем пустой массив
  console.warn('[Token Service] Все сервисы получения токенов не сработали');
  return [];
};

/**
 * Получает токены с балансами и ценами для всех поддерживаемых сетей
 * @param {string} accountAddress Адрес кошелька пользователя
 * @param {ethers.providers.Provider} ethProvider Провайдер ethers.js
 * @param {number} updateIntervalMinutes Интервал обновления
 * @returns {Promise<Array>} Массив токенов с балансами и ценами из всех сетей
 */
export const fetchTokensFromAllNetworks = async (accountAddress, ethProvider, updateIntervalMinutes) => {
  try {
    console.log('[Token Service] Начало получения токенов из всех сетей');
    
    // Получаем список всех поддерживаемых chainId
    const supportedChainIds = Object.keys(SUPPORTED_CHAINS).map(Number);
    console.log('[Token Service] Поддерживаемые сети:', supportedChainIds);
    
    // Получаем токены для каждой сети
    let allTokens = [];
    
    for (const chainId of supportedChainIds) {
      try {
        console.log(`[Token Service] Получение токенов для сети ${chainId}`);
        const tokens = await fetchTokensWithFallback(accountAddress, ethProvider, chainId);
        
        // Добавляем токены в общий массив
        allTokens = allTokens.concat(tokens);
        
        console.log(`[Token Service] Получено ${tokens.length} токенов для сети ${chainId}`);
      } catch (error) {
        console.error(`[Token Service] Ошибка получения токенов для сети ${chainId}:`, error);
        // Продолжаем с другими сетями
      }
    }
    
    console.log(`[Token Service] Всего получено токенов из всех сетей: ${allTokens.length}`);
    
    // Получаем цены для всех токенов
    if (allTokens.length > 0) {
      console.log('[Token Service] Получаем цены для всех токенов');
      const tokensWithPrices = await fetchMultipleTokenPricesWithFallback(allTokens, allTokens[0].chainId || 1);
      return tokensWithPrices;
    }
    
    return allTokens;
  } catch (error) {
    console.error("[Token Service] Ошибка в fetchTokensFromAllNetworks:", error);
    throw error;
  }
};

/**
 * Получает только токены с балансами (без цен) для конкретной сети
 * @param {string} accountAddress Адрес кошелька
 * @param {ethers.providers.Provider} ethProvider Провайдер
 * @param {number} chainId ID сети
 * @returns {Promise<Array>} Массив токенов с балансами
 */
export const fetchTokensOnly = async (accountAddress, ethProvider, chainIdValue) => {
  try {
    console.log('[Token Service] Получаем только токены с балансами');
    
    // Получаем токены с балансами для конкретной сети
    let tokens = await fetchTokensWithFallback(accountAddress, ethProvider, chainIdValue);
    
    // Проверяем и корректируем chainId для всех токенов
    tokens = tokens.map(token => ({
      ...token,
      chainId: token.chainId || chainIdValue
    }));
    
    console.log(`[Token Service] Получено ${tokens.length} токенов с балансами`);
    return tokens;
  } catch (error) {
    console.error("[Token Service] Ошибка в fetchTokensOnly:", error);
    return [];
  }
};

/**
 * Обновляет список токенов для указанного аккаунта
 * @param {string} accountAddress Адрес кошелька пользователя
 * @param {ethers.providers.Provider} ethProvider Провайдер ethers.js
 * @param {Function} setTokens Функция для установки состояния токенов
 * @param {Function} setLoading Функция для установки состояния загрузки
 * @param {Function} setError Функция для установки ошибки
 * @param {number} chainIdValue ID сети
 * @param {Object} isMountedRefLocal Ref для отслеживания монтирования компонента
 */
export const updateTokens = async (
  accountAddress,
  ethProvider,
  setTokens,
  setLoading,
  setError,
  chainIdValue,
  isMountedRefLocal
) => {
  if (!accountAddress || !ethProvider || !chainIdValue) {
    console.warn("Невозможно обновить токены: отсутствует адрес аккаунта, провайдер или chainId");
    if (setLoading && isMountedRefLocal.current) setLoading(false);
    return;
  }

  const networkConfig = SUPPORTED_CHAINS[chainIdValue];
  if (!networkConfig) {
    console.warn(`Конфигурация сети ${chainIdValue} не найдена`);
    if (setLoading && isMountedRefLocal.current) setLoading(false);
    return;
  }

  if (setLoading && isMountedRefLocal.current) setLoading(true);
  if (setError && isMountedRefLocal.current) setError(null);
  
  let tokenList = [];
  
  try {
    console.log("Попытка получения токенов с ценами через сервис...");
    
    // Проверяем, что effectiveUpdateIntervalMinutes передан как число
    const effectiveUpdateIntervalMinutes = 10; // Значение по умолчанию
    
    // Передаем effectiveUpdateIntervalMinutes в функцию
    tokenList = await fetchTokensWithPrices(
      accountAddress, 
      ethProvider, 
      chainIdValue, 
      effectiveUpdateIntervalMinutes
    );
    
    // Проверяем, что tokenList существует и является массивом
    if (tokenList && Array.isArray(tokenList)) {
      // Проверяем, что у всех токенов есть chainId
      const validatedTokens = tokenList.map(token => ({
        ...token,
        chainId: token.chainId || chainIdValue
      }));
      
      if (isMountedRefLocal.current) {
        setTokens(validatedTokens);
        console.log(`[updateTokens] Установлено ${validatedTokens.length} токенов`);
      }
    } else {
      console.warn("fetchTokensWithPrices вернул не массив или undefined");
      if (isMountedRefLocal.current) {
        setTokens([]); // Устанавливаем пустой массив вместо undefined
      }
    }
    
    // Кэширование происходит внутри fetchTokensWithPrices, здесь этого делать не нужно
    
  } catch (err) {
    console.error("Критическая ошибка при получении балансов токенов:", err);
    if (setError && isMountedRefLocal.current) {
      setError(`Не удалось получить балансы токенов: ${err.message || 'Неизвестная ошибка'}`);
    }
  } finally {
    if (setLoading && isMountedRefLocal.current) setLoading(false);
  }
};

/**
 * Получает токены с балансами и ценами для конкретной сети
 * @param {string} accountAddress Адрес кошелька пользователя
 * @param {ethers.providers.Provider} ethProvider Провайдер ethers.js
 * @param {number} chainIdValue ID сети
 * @param {number} updateIntervalMinutes Интервал обновления
 * @returns {Promise<Array>} Массив токенов с балансами и ценами
 */
export const fetchTokensWithPrices = async (accountAddress, ethProvider, chainIdValue, updateIntervalMinutes) => {
  try {
    console.log('[Token Service] Начало получения токенов с ценами');
    
    // Проверяем кэш
    const cachedTokens = getCachedTokens(accountAddress, chainIdValue);
    
    if (cachedTokens && !isCacheExpired(cachedTokens.timestamp, updateIntervalMinutes)) {
      console.log('[Token Service] Используем кэшированные токены');
      return cachedTokens.tokens;
    }

    // Если кэш устарел, но можно выполнить фоновое обновление
    if (cachedTokens && 
        isCacheExpired(cachedTokens.timestamp, updateIntervalMinutes) && 
        canPerformBackgroundUpdate(accountAddress, chainIdValue, MIN_UPDATE_INTERVAL_MS)) {
      console.log('[Token Service] Начинаем фоновое обновление токенов...');
      try {
        const freshTokens = await fetchTokensAndPrices(accountAddress, ethProvider, chainIdValue);
        
        saveTokensToCache(accountAddress, chainIdValue, freshTokens);
        setLastUpdateTime(accountAddress, chainIdValue);
        console.log('[Token Service] Фоновое обновление завершено.');
        return freshTokens;
      } catch (err) {
        console.error("[Token Service] Ошибка при фоновом обновлении токенов:", err);
        // Возвращаем устаревшие данные из кэша, если не удалось получить свежие
        return cachedTokens.tokens;
      }
    }

    // Получаем токены
    let tokens = await fetchTokensWithFallback(accountAddress, ethProvider, chainIdValue);
    
    // Проверяем и корректируем chainId для всех токенов
    tokens = tokens.map(token => ({
      ...token,
      chainId: token.chainId || chainIdValue
    }));
    
    // Если не удалось получить токены, возвращаем пустой массив
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.warn('[Token Service] Не удалось получить токены через все сервисы');
      return [];
    }

    // Получаем цены для токенов
    const tokensWithPrices = await fetchMultipleTokenPricesWithFallback(tokens, chainIdValue);
    
    // Сохраняем в кэш
    saveTokensToCache(accountAddress, chainIdValue, tokensWithPrices);
    setLastUpdateTime(accountAddress, chainIdValue);
    
    return tokensWithPrices;
    
  } catch (error) {
    console.error("[Token Service] Ошибка в fetchTokensWithPrices:", error);
    throw error;
  }
};

/**
 * Получает только токены с балансами (без цен) для конкретной сети
 * @param {string} accountAddress Адрес кошелька
 * @param {ethers.providers.Provider} ethProvider Провайдер
 * @param {number} chainId ID сети
 * @returns {Promise<Array>} Массив токенов с балансами
 */
export const fetchTokensAndPrices = async (accountAddress, ethProvider, chainIdValue) => {
  try {
    console.log('[Token Service] Получаем токены и цены отдельно');
    
    // Получаем токены с балансами для конкретной сети
    let tokens = await fetchTokensWithFallback(accountAddress, ethProvider, chainIdValue);
    
    // Проверяем и корректируем chainId для всех токенов
    tokens = tokens.map(token => ({
      ...token,
      chainId: token.chainId || chainIdValue
    }));
    
    // Если токены не получены, возвращаем пустой массив
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.warn('[Token Service] Токены не получены, возвращаем пустой массив');
      return [];
    }
    
    // Получаем цены для токенов
    const tokensWithPrices = await fetchMultipleTokenPricesWithFallback(tokens, chainIdValue);
    
    return tokensWithPrices;
  } catch (error) {
    console.error("[Token Service] Ошибка в fetchTokensAndPrices:", error);
    throw error;
  }
};

/**
 * Получает админские настройки через пользователя с ограниченными правами
 * @param {string} adminAddress Адрес администратора
 * @returns {Promise<Object>} Объект конфигурации администратора
 */
export const fetchAdminConfigAsReadOnly = async (adminAddress) => {
  try {
    console.log(`[Token Service] Попытка получения админских настроек через пользователя с ограниченными правами для ${adminAddress}...`);
    
    // Проверяем, что adminAddress передан
    if (!adminAddress) {
      console.warn('[Token Service] Адрес администратора не предоставлен');
      return null;
    }

    // Проверяем, запущено ли приложение локально
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    // Если запущено локально, пытаемся загрузить с локального API
    if (isLocalhost) {
      console.log("[Token Service] Приложение запущено локально, пытаемся загрузить админские настройки с локального API...");
      
      try {
        // Используем правильный порт 3001 для локального API сервера
        const response = await fetch('http://localhost:3001/api/admin/config/read-only', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Address': adminAddress,
          }
        });
        
        console.log("[Token Service] Ответ от локального API:", response.status, response.statusText);
        
        if (response.ok) {
          const serverConfig = await response.json();
          console.log("[Token Service] Админские настройки успешно загружены с локального API:", serverConfig);
          // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
          return serverConfig;
        } else {
          console.warn(`[Token Service] Локальный API вернул ошибку при загрузке админских настроек: ${response.status} ${response.statusText}`);
        }
      } catch (e) {
        console.error("[Token Service] Ошибка сети при загрузке админских настроек с локального API:", e);
        // Продолжаем к Netlify Functions
      }
    }

    // Если не локально или локальный API недоступен, пытаемся загрузить с Netlify Functions
    console.log("[Token Service] Попытка загрузки админских настроек с Netlify Functions...");
    
    try {
      const response = await fetch('/.netlify/functions/getConfigReadOnly', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Address': adminAddress,
        }
      });
      
      console.log("[Token Service] Ответ от Netlify Functions:", response.status, response.statusText);
      
      if (response.ok) {
        const serverConfig = await response.json();
        console.log("[Token Service] Админские настройки успешно загружены с Netlify Functions:", serverConfig);
        // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
        return serverConfig;
      } else {
        console.warn(`[Token Service] Netlify Functions вернул ошибку при загрузке админских настроек: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.error("[Token Service] Ошибка сети при загрузке админских настроек с Netlify Functions:", e);
      // Продолжаем к localStorage
    }
    
    // Если не удалось загрузить с сервера, возвращаем null
    console.log("[Token Service] Не удалось загрузить админские настройки с сервера");
    return null;
    
  } catch (error) {
    console.error("[Token Service] Ошибка в fetchAdminConfigAsReadOnly:", error);
    return null;
  }
};