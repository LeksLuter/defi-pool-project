// frontend/src/services/tokenService.js
import * as etherscanV2Service from './etherscanV2Service';
import * as coingeckoService from './coingeckoService';
import * as coinmarketcapService from './coinmarketcapService';
import * as alchemyService from './alchemyService';
import * as defillamaService from './defillamaService';
// === ИСПРАВЛЕНИЕ ПУТИ К priceAggregatorService ===
// ВАЖНО: Убедитесь, что файл frontend/src/services/priceAggregatorService.js существует
import { fetchMultipleTokenPricesWithFallback } from './priceAggregatorService';
// === АДАПТАЦИЯ ПОД НОВУЮ ЛОГИКУ КОНФИГУРАЦИИ ===
// ВАЖНО: Убедитесь, что файл frontend/src/config/adminConfig.js существует и экспортирует getTokenServicesConfig
import { getTokenServicesConfig } from '../config/adminConfig';
// === КОНЕЦ АДАПТАЦИИ ===
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

  // === АДАПТАЦИЯ ПОД НОВУЮ ЛОГИКУ КОНФИГУРАЦИИ ===
  // Получаем конфигурацию сервисов. Теперь это ГЛОБАЛЬНАЯ конфигурация, загружаемая из adminConfig.js
  // adminConfig.js сама обрабатывает загрузку из API или localStorage
  let tokenServicesConfig = getTokenServicesConfig();
  // === КОНЕЦ АДАПТАЦИИ ===
  
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
  // ВАЖНО: Теперь проверяем на строгое равенство `true`
  const enabledServices = ALL_SERVICES.filter(service => {
    // Проверяем, что сервис включен в конфигурации
    const isEnabled = tokenServicesConfig.tokenServices && tokenServicesConfig.tokenServices[service.name] === true;
    console.log(`[Token Service] Сервис ${service.name} включен: ${isEnabled}`);
    if (!isEnabled) {
      console.log(`[Token Service] Сервис ${service.name} отключен в настройках админки.`);
    }
    return isEnabled;
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
 * Получает токены с балансами и ценами для конкретной сети
 * @param {string} accountAddress Адрес кошелька пользователя
 * @param {ethers.providers.Provider} ethProvider Провайдер ethers.js
 * @param {number} chainIdValue ID сети
 * @returns {Promise<Array>} Массив токенов с балансами и ценами
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
 * Получает только токены с балансами (без цен) для конкретной сети
 * @param {string} accountAddress Адрес кошелька
 * @param {ethers.providers.Provider} ethProvider Провайдер
 * @param {number} chainId ID сети
 * @returns {Promise<Array>} Массив токенов с балансами
 */
export const fetchTokensOnly = async (accountAddress, ethProvider, chainId) => {
  try {
    console.log(`[Token Service] Получение токенов ТОЛЬКО С БАЛАНСАМИ для аккаунта ${accountAddress} в сети ${chainId}...`);
    // Просто вызываем fetchTokensWithFallback
    let tokens = await fetchTokensWithFallback(accountAddress, ethProvider, chainId);

    // Проверяем и корректируем chainId для всех токенов
    tokens = tokens.map(token => ({
      ...token,
      chainId: token.chainId || chainId
    }));

    console.log(`[Token Service] Получено ${tokens.length} токенов с балансами`);
    return tokens;
  } catch (error) {
    console.error("[Token Service] Ошибка в fetchTokensOnly:", error);
    return [];
  }
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
    console.log(`[Token Service] === НАЧАЛО ОБНОВЛЕНИЯ ТОКЕНОВ ДЛЯ ВСЕХ СЕТЕЙ ДЛЯ АККАУНТА ${accountAddress} ===`);

    // Импортируем конфигурацию сетей
    // const { SUPPORTED_CHAINS } = await import('../config/supportedChains');

    const allTokens = [];
    const chainIds = Object.keys(SUPPORTED_CHAINS).map(Number);

    // Используем Promise.allSettled для параллельного выполнения запросов
    const results = await Promise.allSettled(
      chainIds.map(chainId =>
        fetchTokensAndPrices(accountAddress, ethProvider, chainId)
      )
    );

    results.forEach((result, index) => {
      const chainId = chainIds[index];
      if (result.status === 'fulfilled') {
        console.log(`[Token Service] Успешно получены токены для сети ${chainId}`);
        allTokens.push(...result.value);
      } else {
        console.error(`[Token Service] Ошибка при получении токенов для сети ${chainId}:`, result.reason);
      }
    });

    console.log(`[Token Service] === ЗАВЕРШЕНО ОБНОВЛЕНИЕ ТОКЕНОВ ДЛЯ ВСЕХ СЕТЕЙ. ВСЕГО ТОКЕНОВ: ${allTokens.length} ===`);
    return allTokens;
  } catch (error) {
    console.error("[Token Service] Ошибка в fetchTokensFromAllNetworks:", error);
    throw error;
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
  isMountedRefLocal // Принимаем ref как аргумент
) => {
  try {
    console.log(`[Token Service] === НАЧАЛО ОБНОВЛЕНИЯ ТОКЕНОВ ДЛЯ АККАУНТА ${accountAddress} В СЕТИ ${chainIdValue} ===`);

    // Проверяем, что компонент всё ещё смонтирован
    if (isMountedRefLocal && !isMountedRefLocal.current) {
      console.log("[Token Service] Компонент размонтирован, отмена обновления токенов");
      return;
    }

    // Проверяем возможность фонового обновления
    // const canUpdate = await canPerformBackgroundUpdate(accountAddress, chainIdValue, MIN_UPDATE_INTERVAL_MS);
    // if (!canUpdate) {
    //   console.log("[Token Service] Фоновое обновление отложено, загружаем из кэша");
    //   const cachedTokens = getCachedTokens(`${accountAddress}-${chainIdValue}`);
    //   if (cachedTokens && cachedTokens.tokens && cachedTokens.tokens.length > 0) {
    //     if (isMountedRefLocal && isMountedRefLocal.current) {
    //       setTokens(prevTokens => {
    //         const tokensWithoutCurrentChain = prevTokens.filter(t => t.chainId !== chainIdValue);
    //         return [...tokensWithoutCurrentChain, ...cachedTokens.tokens];
    //       });
    //     }
    //     return cachedTokens.tokens;
    //   }
    // }

    // Проверяем кэш
    const cacheKey = `${accountAddress}-${chainIdValue}`;
    const cachedData = getCachedTokens(cacheKey);
    // const isExpired = isCacheExpired(cachedData, 5); // 5 минут TTL для кэша

    // if (cachedData && !isExpired) {
    if (cachedData && cachedData.tokens && cachedData.tokens.length > 0) {
      console.log(`[Token Service] Загрузка токенов из кэша для сети ${chainIdValue}`);
      if (isMountedRefLocal && isMountedRefLocal.current) {
        setTokens(prevTokens => {
          const tokensWithoutCurrentChain = prevTokens.filter(t => t.chainId !== chainIdValue);
          return [...tokensWithoutCurrentChain, ...cachedData.tokens];
        });
        // setLoading(false); // Не устанавливаем loading в false здесь, так как основной процесс продолжается
      }
      // return; // Не возвращаем, продолжаем обновление
    }

    // Получаем токены с балансами и ценами
    console.log(`[Token Service] Загрузка токенов с сервера для сети ${chainIdValue}...`);
    const freshTokens = await fetchTokensAndPrices(accountAddress, ethProvider, chainIdValue);

    // Проверяем, что компонент всё ещё смонтирован перед обновлением состояния
    if (isMountedRefLocal && !isMountedRefLocal.current) {
      console.log("[Token Service] Компонент размонтирован, отмена обновления состояния");
      return;
    }

    // Обновляем состояние токенов
    if (isMountedRefLocal && isMountedRefLocal.current) {
      setTokens(prevTokens => {
        const tokensWithoutCurrentChain = prevTokens.filter(t => t.chainId !== chainIdValue);
        return [...tokensWithoutCurrentChain, ...freshTokens];
      });
    }

    // Сохраняем в кэш
    saveTokensToCache(accountAddress, chainIdValue, freshTokens);
    setLastUpdateTime(accountAddress, chainIdValue);

    console.log(`[Token Service] === ЗАВЕРШЕНО ОБНОВЛЕНИЕ ТОКЕНОВ ДЛЯ АККАУНТА ${accountAddress} В СЕТИ ${chainIdValue}. ВСЕГО ТОКЕНОВ С ЦЕНАМИ: ${freshTokens.length} ===`);

    return freshTokens;
  } catch (error) {
    console.error(`[Token Service] Критическая ошибка при обновлении токенов для аккаунта ${accountAddress} в сети ${chainIdValue}:`, error);
    if (isMountedRefLocal && isMountedRefLocal.current) {
      setError(`Ошибка при обновлении токенов: ${error.message}`);
    }
    throw error; // Пробрасываем ошибку дальше
  } finally {
    // Устанавливаем loading в false в любом случае, если компонент смонтирован
    if (isMountedRefLocal && isMountedRefLocal.current) {
      setLoading(false);
    }
  }
};

// === УДАЛЕНЫ НЕИСПОЛЬЗУЕМЫЕ ФУНКЦИИ ===
// Функции `fetchTokensWithPrices`, `fetchAdminConfigAsReadOnly` удалены, так как:
// 1. `fetchTokensWithPrices` дублирует логику `fetchTokensAndPrices` и `updateTokens`.
// 2. `fetchAdminConfigAsReadOnly` больше не нужна, так как `getTokenServicesConfig` сама
//    отвечает за загрузку ГЛОБАЛЬНОЙ конфигурации из API или localStorage.
// === КОНЕЦ УДАЛЕННЫХ ФУНКЦИЙ ===