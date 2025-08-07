import * as etherscanV2Service from './etherscanV2Service';
import * as coingeckoService from './coingeckoService';
import * as coinmarketcapService from './coinmarketcapService';
import * as alchemyService from './alchemyService';
import * as defillamaService from './defillamaService';
import { fetchMultipleTokenPricesWithFallback } from './priceAggregatorService';
import { getTokenServicesConfig } from '../config/adminConfig'; // Импортируем из нового файла конфигурации
import { SUPPORTED_CHAINS } from '../config/supportedChains';
import { saveTokensToCache, getCachedTokens, isCacheExpired } from './cacheService';
import { setLastUpdateTime, canPerformBackgroundUpdate } from './cacheService';
// === КОНСТАНТЫ ===
const MIN_UPDATE_INTERVAL_MS = 30000; // 30 секунд
const CACHE_PREFIX = 'defi_pool_tokens';
const DEFAULT_CACHE_EXPIRY_MINUTES = 5; // 5 минут по умолчанию
// === КОНЕЦ КОНСТАНТ ===
/**
 * Получает список токенов с балансами для указанного аккаунта
 * @param {string} accountAddress Адрес кошелька пользователя
 * @param {ethers.providers.Provider} ethProvider Провайдер ethers.js
 * @param {number} chainIdValue ID сети
 * @returns {Promise<Array>} Массив токенов с балансами и ценами
 */
export const fetchTokensWithFallback = async (accountAddress, ethProvider, chainId) => {
  const networkConfig = SUPPORTED_CHAINS[chainId];
  if (!networkConfig) {
    console.warn(`Конфигурация сети ${chainId} не найдена`);
    return [];
  }
  // Исправлено: Проверяем, что getTokenServicesConfig возвращает объект
  const tokenServicesConfig = getTokenServicesConfig();
  // Проверяем, что tokenServicesConfig существует и является объектом
  if (!tokenServicesConfig || typeof tokenServicesConfig !== 'object') {
    console.warn('[Token Service] getTokenServicesConfig вернул некорректные данные, используем дефолтные настройки');
    // Возвращаем пустой массив, если конфигурация некорректна
    return [];
  }
  const ALL_SERVICES = [
    { name: 'EtherscanV2', service: etherscanV2Service },
    { name: 'Alchemy', service: alchemyService },
    { name: 'DefiLlama', service: defillamaService },
    { name: 'CoinGecko', service: coingeckoService },
    { name: 'CoinMarketCap', service: coinmarketcapService },
  ];
  // Фильтруем сервисы согласно настройкам администратора
  const filteredServices = ALL_SERVICES.filter(({ name }) => {
    // Проверяем, что сервис включен в конфигурации
    const isEnabled = tokenServicesConfig[name];
    if (!isEnabled) {
      console.log(`[Token Service] Сервис ${name} отключен в настройках админки.`);
    }
    return isEnabled;
  });
  if (filteredServices.length === 0) {
    console.warn('[Token Service] Все сервисы получения токенов отключены в настройках админки. Будет использован пустой список.');
    return [];
  }
  console.log(`[Token Service] Используются сервисы получения токенов: ${filteredServices.map(s => s.name).join(', ')}`);
  // Попробуем получить токены из каждого сервиса по очереди
  for (const service of filteredServices) {
    try {
      console.log(`[Token Service] Попытка получения токенов через ${service.name}`);
      const tokens = await service.service.fetchTokens(accountAddress, ethProvider, chainId);
      if (tokens && Array.isArray(tokens) && tokens.length > 0) {
        console.log(`[Token Service] Успешно получено ${tokens.length} токенов через ${service.name}`);
        return tokens;
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
 * Получает цены для токенов
 * @param {Array} tokens Массив токенов
 * @param {number} chainId ID сети
 * @param {number} updateIntervalMinutes Интервал обновления в минутах для проверки кэша
 * @returns {Promise<Array>} Массив токенов с ценами
 */
export const fetchTokensWithPrices = async (accountAddress, ethProvider, chainId, updateIntervalMinutes) => {
  try {
    console.log('[Token Service] Начало получения токенов с ценами');
    // Проверяем кэш
    const cachedTokens = getCachedTokens(accountAddress, chainId);
    if (cachedTokens && !isCacheExpired(cachedTokens.timestamp, updateIntervalMinutes)) {
      console.log('[Token Service] Используем кэшированные токены');
      // Убедимся, что возвращаем массив
      return cachedTokens.tokens && Array.isArray(cachedTokens.tokens) ? cachedTokens.tokens : [];
    }
    // Если кэш устарел, но можно выполнить фоновое обновление
    if (cachedTokens &&
      isCacheExpired(cachedTokens.timestamp, updateIntervalMinutes) &&
      canPerformBackgroundUpdate(accountAddress, chainId, MIN_UPDATE_INTERVAL_MS)) {
      console.log('[Token Service] Начинаем фоновое обновление токенов...');
      try {
        const freshTokens = await fetchTokensAndPrices(accountAddress, ethProvider, chainId);
        // Убедиться, что freshTokens - это массив
        if (Array.isArray(freshTokens)) {
          saveTokensToCache(accountAddress, chainId, freshTokens);
          setLastUpdateTime(accountAddress, chainId);
          console.log('[Token Service] Фоновое обновление завершено.');
          return freshTokens;
        } else {
          console.warn('[Token Service] Фоновое обновление вернуло не массив, используем устаревшие данные из кэша.');
          // Убедимся, что возвращаем массив
          return cachedTokens.tokens && Array.isArray(cachedTokens.tokens) ? cachedTokens.tokens : [];
        }
      } catch (err) {
        console.error("[Token Service] Ошибка при фоновом обновлении токенов:", err);
        // Возвращаем устаревшие данные из кэша, если не удалось получить свежие
        // Убедимся, что возвращаем массив
        return cachedTokens.tokens && Array.isArray(cachedTokens.tokens) ? cachedTokens.tokens : [];
      }
    }
    // Получаем токены
    let tokens = await fetchTokensWithFallback(accountAddress, ethProvider, chainId);
    // Если не удалось получить токены, возвращаем пустой массив
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.warn('[Token Service] Не удалось получить токены через все сервисы');
      return []; // Возвращаем пустой массив
    }
    // Получаем цены для токенов
    // Исправлено: передаем только tokens, так как fetchMultipleTokenPricesWithFallback в priceAggregatorService.js уже обрабатывает chainId
    const tokensWithPrices = await fetchMultipleTokenPricesWithFallback(tokens);
    // Убедиться, что tokensWithPrices - это массив
    if (!Array.isArray(tokensWithPrices)) {
      console.warn('[Token Service] fetchMultipleTokenPricesWithFallback вернул не массив');
      return tokens; // Возвращаем токены без цен
    }
    // Добавляем цену к каждому токену
    const finalTokens = tokens.map(token => {
      const priceUSD = tokensWithPrices[token.contractAddress] || '0';
      return {
        ...token,
        priceUSD: priceUSD.toString()
      };
    });
    // Сохраняем в кэш
    saveTokensToCache(accountAddress, chainId, finalTokens);
    setLastUpdateTime(accountAddress, chainId);
    return finalTokens; // Возвращаем массив токенов с ценами
  } catch (error) {
    console.error("[Token Service] Ошибка в fetchTokensWithPrices:", error);
    // Возвращаем пустой массив в случае критической ошибки
    return [];
  }
};
/**
 * Получает токены и цены отдельно, потом объединяет
 * @param {string} accountAddress Адрес кошелька
 * @param {ethers.providers.Provider} ethProvider Провайдер
 * @param {number} chainId ID сети
 * @returns {Promise<Array>} Массив токенов с ценами
 */
export const fetchTokensAndPrices = async (accountAddress, ethProvider, chainId) => {
  try {
    console.log('[Token Service] Получаем токены и цены');
    // Получаем токены
    let tokens = await fetchTokensWithFallback(accountAddress, ethProvider, chainId);
    // Если токены не получены, возвращаем пустой массив
    if (!tokens || !Array.isArray(tokens)) {
      console.warn('[Token Service] Токены не получены, возвращаем пустой массив');
      return []; // Возвращаем пустой массив
    }
    // Получаем цены для токенов
    // Исправлено: передаем только tokens
    const tokensWithPrices = await fetchMultipleTokenPricesWithFallback(tokens);
    // Убедиться, что tokensWithPrices - это массив или объект
    if (!tokensWithPrices || (typeof tokensWithPrices !== 'object')) {
      console.warn('[Token Service] fetchMultipleTokenPricesWithFallback вернул не объект');
      return tokens; // Возвращаем токены без цен
    }
    // Добавляем цену к каждому токену
    const finalTokens = tokens.map(token => {
      const priceUSD = tokensWithPrices[token.contractAddress] || '0';
      return {
        ...token,
        priceUSD: priceUSD.toString()
      };
    });
    return finalTokens; // Возвращаем массив токенов с ценами
  } catch (error) {
    console.error("[Token Service] Ошибка в fetchTokensAndPrices:", error);
    // Возвращаем пустой массив в случае ошибки
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
 * @param {number} updateIntervalMinutes Интервал обновления в минутах
 */
export const updateTokens = async (
  accountAddress,
  ethProvider,
  setTokens,
  setLoading,
  setError,
  chainIdValue,
  isMountedRefLocal,
  updateIntervalMinutes = 10 // Получаем интервал как параметр, значение по умолчанию 10 минут
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
    // Передаем updateIntervalMinutes в функцию
    tokenList = await fetchTokensWithPrices(
      accountAddress,
      ethProvider,
      chainIdValue,
      updateIntervalMinutes // Передаем интервал обновления
    );
    // Проверяем, что tokenList существует и является массивом
    if (tokenList && Array.isArray(tokenList)) {
      if (isMountedRefLocal.current) {
        setTokens(tokenList);
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
    // В случае критической ошибки также устанавливаем пустой массив токенов
    if (isMountedRefLocal.current) {
      setTokens([]);
    }
  } finally {
    if (setLoading && isMountedRefLocal.current) setLoading(false);
  }
};