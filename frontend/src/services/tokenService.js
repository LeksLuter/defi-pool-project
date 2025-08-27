// frontend/src/services/tokenService.js
// Сервис для получения токенов и цен с различных источников
import { ethers } from 'ethers';
// Импортируем CACHE_DURATION_MS из appConfig.js
import { CACHE_DURATION_MS } from '../config/appConfig';
// Импортируем функции кэширования и управления обновлением из cacheService.js
import { saveTokensToCache, getCachedTokens, setLastUpdateTime, canPerformBackgroundUpdate } from '../services/cacheService';
// Импортируем функции для получения конфигурации и интервала обновления из appConfig.js
import { getTokenServicesConfig, getUpdateIntervalMinutes } from '../config/appConfig';
// === ИМПОРТЫ СЕРВИСОВ ===
// Импортируем модули сервисов целиком
import * as etherscanV2Service from './etherscanV2Service';
import * as alchemyService from './alchemyService';
import * as defillamaService from './defillamaService'; // Правильный регистр
import * as coingeckoService from './coingeckoService';
import * as coinmarketcapService from './coinmarketcapService';
// Импортируем агрегатор цен
import { fetchTokensWithPrices } from './priceAggregatorService';
// === КОНЕЦ ИМПОРТОВ СЕРВИСОВ ===
// === КОНСТАНТЫ ===
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 2000;
// === КОНЕЦ КОНСТАНТ ===
// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
/**
 * Выполняет функцию с повторными попытками в случае ошибки.
 * @param {Function} fn Функция для выполнения.
 * @param {string} serviceName Название сервиса (для логов).
 * @param  {...any} args Аргументы для функции fn.
 * @returns {Promise<any>} Результат выполнения функции или null, если все попытки не удались.
 */
const fetchWithRetry = async (fn, serviceName, ...args) => {
  console.log(`[Token Service] Попытка получения данных от ${serviceName} (попытка 1)...`);
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await fn(...args);
      console.log(`[Token Service] Успешно получены данные от ${serviceName} (попытка ${attempt}).`);
      return result;
    } catch (error) {
      console.error(`[Token Service] Ошибка при получении данных от ${serviceName} (попытка ${attempt}):`, error);
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`[Token Service] Ожидание ${delay.toFixed(0)}мс перед повторной попыткой...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[Token Service] Все попытки получения данных от ${serviceName} исчерпаны. Сервис будет пропущен.`);
      }
    }
  }
  return null; // Если все попытки не удались
};
/**
 * Получает токены со всех включенных сервисов параллельно.
 * @param {string} account Адрес кошелька.
 * @param {ethers.providers.Provider} provider Провайдер ethers.js.
 * @param {number} chainId ID сети.
 * @returns {Promise<Array>} Массив всех полученных токенов.
 */
const fetchTokensFromAllServicesParallel = async (account, provider, chainId) => {
  console.log(`[Token Service] === НАЧАЛО ОБНОВЛЕНИЯ ТОКЕНОВ ДЛЯ АККАУНТА ${account} В СЕТИ ${chainId} ===`);
  console.log(`[Token Service] Загрузка токенов с сервера для сети ${chainId}...`);
  let tokenServicesConfig;
  try {
    // Получаем актуальную конфигурацию сервисов из appConfig.js
    tokenServicesConfig = getTokenServicesConfig();
    console.log(`[Token Service] Конфигурация сервисов:`, tokenServicesConfig);
  } catch (configError) {
    console.error("[Token Service] Ошибка при загрузке конфигурации сервисов:", configError);
    tokenServicesConfig = null;
  }
  console.log(`[Token Service] Получаем токены и цены отдельно`);
  // Определяем все доступные сервисы
  const ALL_TOKEN_SERVICES = [
    { name: 'EtherscanV2', fetchTokens: etherscanV2Service.fetchTokens },
    { name: 'Alchemy', fetchTokens: alchemyService.fetchTokens },
    { name: 'DefiLlama', fetchTokens: defillamaService.fetchTokens },
    { name: 'CoinGecko', fetchTokens: coingeckoService.fetchTokens },
    { name: 'CoinMarketCap', fetchTokens: coinmarketcapService.fetchTokens },
  ];
  // Фильтруем сервисы получения ТОКЕНОВ, оставляя только включенные
  const enabledTokenServices = ALL_TOKEN_SERVICES.filter(service => {
    // Проверяем, что сервис включен в конфигурации
    const isEnabled = tokenServicesConfig && tokenServicesConfig[service.name] === true;
    console.log(`[Token Service] Сервис ${service.name} включен для получения токенов:`, isEnabled);
    if (isEnabled === undefined || isEnabled === false) {
      console.log(`[Token Service] Сервис ${service.name} отключен в настройках админки для получения токенов.`);
      return false;
    }
    return true;
  });
  console.log(`[Token Service] Используются сервисы получения токенов:`, enabledTokenServices.map(s => s.name));
  if (enabledTokenServices.length === 0) {
    console.warn(`[Token Service] Нет включенных сервисов для получения токенов для сети ${chainId}.`);
    return []; // Возвращаем пустой массив
  }
  // Запускаем получение токенов от всех включенных сервисов параллельно
  const tokensPromises = enabledTokenServices.map(service =>
    fetchWithRetry(service.fetchTokens, service.name, account, provider, chainId)
  );
  try {
    const tokensResults = await Promise.allSettled(tokensPromises);
    // Объединяем результаты из всех сервисов
    let allTokens = [];
    tokensResults.forEach((result, index) => {
      const serviceName = enabledTokenServices[index].name;
      if (result.status === 'fulfilled') {
        const serviceTokens = result.value;
        if (Array.isArray(serviceTokens)) {
          console.log(`[Token Service] Получено ${serviceTokens.length} токенов от ${serviceName}`);
          allTokens = [...allTokens, ...serviceTokens];
        } else {
          console.warn(`[Token Service] Сервис ${serviceName} вернул некорректные данные (не массив) при получении токенов.`);
        }
      } else {
        console.error(`[Token Service] Сервис ${serviceName} завершился с ошибкой:`, result.reason);
      }
    });
    // Удаляем дубликаты по contractAddress
    const uniqueTokensMap = new Map();
    allTokens.forEach(token => {
      // Используем адрес контракта в нижнем регистре как ключ для Map
      const key = token.contractAddress?.toLowerCase();
      // Если токен с таким адресом уже есть, оставляем первый найденный
      if (key && !uniqueTokensMap.has(key)) {
        uniqueTokensMap.set(key, token);
      } else if (key && uniqueTokensMap.has(key)) {
        // console.log(`[Token Service] Дубликат токена с адресом ${key} найден и пропущен.`);
      } else {
        // console.warn(`[Token Service] Токен без корректного адреса контракта пропущен:`, token);
      }
    });
    const uniqueTokens = Array.from(uniqueTokensMap.values());
    console.log(`[Token Service] Найдено ${uniqueTokens.length} уникальных токенов`);
    // === ИСПРАВЛЕНИЕ 1: Добавление нативного токена Polygon ===
    // Проверяем, есть ли в списке токен с адресом 0x000...000 для сети Polygon (chainId 137)
    const hasNativeToken = uniqueTokens.some(token => token.contractAddress === '0x0000000000000000000000000000000000000000');
    if (chainId === 137 && !hasNativeToken) {
      console.log(`[Token Service] Нативный токен не найден в списке для сети Polygon (${chainId}), добавляем MATIC...`);
      try {
        // Получаем баланс нативного токена (MATIC)
        let nativeBalance = '0';
        if (provider) {
          try {
            const balanceWei = await provider.getBalance(account);
            nativeBalance = ethers.utils.formatEther(balanceWei); // Polygon использует 18 decimals как ETH
          } catch (balanceError) {
            console.error(`[Token Service] Ошибка получения баланса MATIC для ${account}:`, balanceError);
          }
        } else {
          console.warn(`[Token Service] Провайдер для сети ${chainId} не найден для получения баланса MATIC`);
        }
        // Создаем объект для нативного токена Polygon
        const nativeToken = {
          contractAddress: '0x0000000000000000000000000000000000000000',
          name: 'Matic Token', // Или 'Polygon Ecosystem Token'?
          symbol: 'MATIC',
          balance: nativeBalance,
          decimals: 18, // У MATIC 18 decimals
          logo: null, // URL логотипа, если есть
        };
        uniqueTokens.push(nativeToken);
        console.log(`[Token Service] Добавлен нативный токен MATIC`);
      } catch (nativeTokenError) {
        console.error(`[Token Service] Ошибка при добавлении нативного токена Polygon:`, nativeTokenError);
      }
    } else if (chainId === 137 && hasNativeToken) {
      console.log(`[Token Service] Нативный токен уже присутствует в списке для сети Polygon (${chainId}). Проверяем корректность имени и символа...`);
      const nativeTokenIndex = uniqueTokens.findIndex(token => token.contractAddress === '0x0000000000000000000000000000000000000000');
      if (nativeTokenIndex !== -1) {
        const nativeToken = uniqueTokens[nativeTokenIndex];
        if (nativeToken.name !== 'Matic Token' || nativeToken.symbol !== 'MATIC') {
          console.log(`[Token Service] Корректируем имя и символ нативного токена Polygon.`);
          uniqueTokens[nativeTokenIndex] = {
            ...nativeToken,
            name: 'Matic Token',
            symbol: 'MATIC'
          };
        }
      }
    }
    // === КОНЕЦ ИСПРАВЛЕНИЯ 1 ===
    console.log(`[Token Service] Успешно обработано ${uniqueTokens.length} токенов (включая с нулевым балансом)`);
    return uniqueTokens;
  } catch (error) {
    console.error(`[Token Service] Критическая ошибка при параллельном получении токенов:`, error);
    return []; // Возвращаем пустой массив в случае критической ошибки
  }
};
/**
 * Получает цены со всех включенных сервисов параллельно.
 * @param {string} account Адрес кошелька.
 * @param {ethers.providers.Provider} provider Провайдер ethers.js.
 * @param {number} chainId ID сети.
 * @param {Array} tokens Массив токенов, для которых нужно получить цены.
 * @returns {Promise<Object>} Объект с ценами, где ключ - contractAddress, значение - цена.
 */
const fetchPricesFromAllServicesParallel = async (account, provider, chainId, tokens) => {
  console.log(`[Token Service] === НАЧАЛО ОБНОВЛЕНИЯ ЦЕН ДЛЯ ${tokens.length} ТОКЕНОВ АККАУНТА ${account} В СЕТИ ${chainId} ===`);
  let priceServicesConfig;
  try {
    // Получаем актуальную конфигурацию сервисов цен из appConfig.js
    // ВАЖНО: используем правильную функцию getPriceServicesConfig
    const configModule = await import('../config/appConfig');
    priceServicesConfig = configModule.getPriceServicesConfig();
    console.log(`[Token Service] Конфигурация сервисов цен:`, priceServicesConfig);
  } catch (configError) {
    console.error("[Token Service] Ошибка при загрузке конфигурации сервисов цен:", configError);
    // Если не удалось загрузить, используем пустой объект, чтобы не включать никакие сервисы
    priceServicesConfig = {};
  }
  // Используем агрегатор цен, который уже реализует логику опроса нескольких сервисов
  try {
    const tokensWithPrices = await fetchTokensWithPrices(tokens, chainId, priceServicesConfig);
    console.log(`[Token Service] Цены успешно получены через агрегатор для ${tokensWithPrices.length} токенов`);
    // Преобразуем массив токенов с ценами в объект { адрес: { priceUSD: ... } }
    const pricesObject = {};
    tokensWithPrices.forEach(token => {
      if (token.contractAddress) {
        pricesObject[token.contractAddress.toLowerCase()] = { priceUSD: token.priceUSD };
      }
    });
    console.log(`[Token Service] Преобразованы цены в объект для сопоставления.`);
    return pricesObject;
  } catch (aggregatorError) {
    console.error(`[Token Service] Ошибка при получении цен через агрегатор:`, aggregatorError);
    // Возвращаем пустой объект цен в случае ошибки агрегатора
    return {};
  }
};
/**
 * Форматирует токены для конкретной сети, добавляя chainId.
 * @param {Array} rawTokens Массив сырых токенов.
 * @param {number} chainId ID сети.
 * @returns {Promise<Array>} Массив отформатированных токенов.
 */
const formatTokensForNetwork = async (rawTokens, chainId) => {
  console.log(`[Token Service] Форматирование ${rawTokens.length} токенов для сети ${chainId}...`);
  // В данном случае форматирование уже происходит в сервисах получения токенов,
  // здесь просто добавляем chainId, если его нет, и гарантируем правильный формат для Polygon native token.
  const formattedTokens = rawTokens.map(token => ({
    ...token,
    chainId: token.chainId || chainId, // Убеждаемся, что chainId присутствует
  }));
  console.log(`[Token Service] Форматирование токенов для сети ${chainId} завершено.`);
  return formattedTokens;
};
/**
 * Объединяет массив токенов с объектом цен.
 * @param {Array} tokensArray Массив токенов.
 * @param {Object} pricesObject Объект цен { адрес: { priceUSD: ... } }.
 * @returns {Array} Массив токенов с добавленным полем priceUSD.
 */
export const combineTokensWithPrices = (tokensArray, pricesObject) => {
  console.log(`[Token Service] Объединение ${tokensArray.length} токенов с ценами...`);
  // console.log(`[Token Service] Prices object received:`, pricesObject); // Для отладки
  const tokensWithPrices = tokensArray.map(token => {
    try {
      const tokenAddress = token.contractAddress;
      if (!tokenAddress) {
        console.warn(`[Token Service] Токен без адреса контракта, пропущен:`, token);
        return { ...token, priceUSD: null }; // Возвращаем токен без цены
      }
      // --- ИСПРАВЛЕНИЕ 2: Получение цены ---
      // Ищем цену по адресу контракта (в нижнем регистре, как в pricesObject)
      const priceInfo = pricesObject[tokenAddress.toLowerCase()];
      // console.log(`[Token Service] Цена для токена ${token.symbol} (${tokenAddress}):`, priceInfo);
      let priceUSDValue = null;
      if (priceInfo && typeof priceInfo === 'object' && priceInfo.priceUSD !== undefined) {
        // Цена пришла в формате { priceUSD: <число> }
        priceUSDValue = priceInfo.priceUSD;
        // console.log(`[Token Service] Цена для ${token.symbol} из priceInfo.priceUSD:`, priceUSDValue);
      } else if (typeof priceInfo === 'number' && !isNaN(priceInfo)) {
        // Цена пришла напрямую как число (менее вероятно, но на всякий случай)
        priceUSDValue = priceInfo;
        // console.log(`[Token Service] Цена для ${token.symbol} напрямую из priceInfo:`, priceUSDValue);
      } else {
        // Цена не найдена или невалидна
        // console.log(`[Token Service] Цена для токена ${token.symbol} (${tokenAddress}) не найдена или невалидна:`, priceInfo);
      }
      // --- КОНЕЦ ИСПРАВЛЕНИЯ 2 ---
      // Возвращаем токен с добавленным полем priceUSD
      const tokenWithPrice = {
        ...token,
        priceUSD: priceUSDValue // priceUSDValue будет числом или null
      };
      // console.log(`[Token Service] Токен после объединения с ценой:`, tokenWithPrice.symbol, tokenWithPrice.priceUSD);
      return tokenWithPrice;
    } catch (combineError) {
      console.error(`[Token Service] Ошибка при объединении цены для токена:`, token, combineError);
      return { ...token, priceUSD: null }; // Возвращаем токен без цены в случае ошибки
    }
  });
  console.log(`[Token Service] Объединение токенов с ценами завершено.`);
  return tokensWithPrices;
};
// === ОСНОВНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ ===
/**
 * Основная функция обновления токенов и цен.
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
  try {
    console.log(`[Token Service] === НАЧАЛО ОБНОВЛЕНИЯ ДЛЯ АККАУНТА ${accountAddress} В СЕТИ ${chainIdValue} ===`);
    // Устанавливаем состояние загрузки, если функция передана
    if (isMountedRefLocal?.current) {
      if (setLoading) setLoading(true);
      if (setError) setError(null);
    }
    // === ПОЛИТИКА КЭШИРОВАНИЯ И ФОНОВОЕ ОБНОВЛЕНИЕ ===
    let actualCacheDurationMs = CACHE_DURATION_MS;
    console.log(`[Token Service] Используемое значение CACHE_DURATION_MS из appConfig.js: ${actualCacheDurationMs}мс`);
    try {
      // Пытаемся получить актуальный интервал обновления из конфигурации
      const updateIntervalMinutes = await getUpdateIntervalMinutes(accountAddress);
      actualCacheDurationMs = updateIntervalMinutes * 60 * 1000;
      console.log(`[Token Service] Актуальный интервал обновления: ${updateIntervalMinutes} минут (${actualCacheDurationMs}мс)`);
    } catch (intervalError) {
      console.warn(`[Token Service] Не удалось получить интервал обновления, используем дефолтный из appConfig.js: ${actualCacheDurationMs}мс`, intervalError);
    }
    // Проверка возможности фонового обновления
    if (!canPerformBackgroundUpdate(accountAddress, chainIdValue, actualCacheDurationMs)) {
      console.log(`[Token Service] Фоновое обновление отложено для ${accountAddress} в сети ${chainIdValue}.`);
      // Получаем закэшированные токены
      const cachedTokens = getCachedTokens(accountAddress, chainIdValue);
      if (cachedTokens && cachedTokens.length > 0) {
        console.log(`[Token Service] Возвращены закэшированные данные (${cachedTokens.length} токенов) для ${accountAddress} в сети ${chainIdValue}.`);
        if (isMountedRefLocal?.current) {
          if (setTokens) setTokens(cachedTokens);
          if (setLoading) setLoading(false);
        }
        return cachedTokens;
      } else {
        console.log(`[Token Service] Нет закэшированных данных для ${accountAddress} в сети ${chainIdValue}, продолжаем обновление.`);
      }
    }
    // === КОНЕЦ ПОЛИТИКИ КЭШИРОВАНИЯ ===
    // 1. Получаем токены
    const rawTokens = await fetchTokensFromAllServicesParallel(accountAddress, ethProvider, chainIdValue);
    console.log(`[Token Service] Получено ${rawTokens.length} токенов от сервисов получения токенов`);
    // 2. Получаем цены
    const pricesObject = await fetchPricesFromAllServicesParallel(accountAddress, ethProvider, chainIdValue, rawTokens);
    console.log(`[Token Service] Получены цены от сервисов получения цен`);
    // 3. Объединяем токены с ценами
    const tokensWithPrices = combineTokensWithPrices(rawTokens, pricesObject);
    console.log(`[Token Service] Объединение ${tokensWithPrices.length} токенов с ценами...`);
    // 4. Форматируем токены для конкретной сети
    const formattedTokens = await formatTokensForNetwork(tokensWithPrices, chainIdValue);
    console.log(`[Token Service] Форматирование ${formattedTokens.length} токенов для сети ${chainIdValue}...`);
    // 5. Сохраняем в кэш
    saveTokensToCache(accountAddress, chainIdValue, formattedTokens);
    // ИСПРАВЛЕНО: Правильное сохранение времени
    const now = Date.now();
    setLastUpdateTime(accountAddress, chainIdValue, now); // Сохраняем время обновления
    
    console.log(`[Token Service] === ОБНОВЛЕНИЕ ЗАВЕРШЕНО ДЛЯ АККАУНТА ${accountAddress} В СЕТИ ${chainIdValue}. Всего токенов: ${formattedTokens.length} ===`);
    // Устанавливаем состояние только если компонент смонтирован
    if (isMountedRefLocal?.current) {
      if (setTokens) setTokens(formattedTokens);
      if (setLoading) setLoading(false);
      if (setError) setError(null);
    }
    return formattedTokens;
  } catch (error) {
    console.error(`[Token Service] Ошибка в updateTokens для ${accountAddress} в сети ${chainIdValue}:`, error);
    // Устанавливаем состояние ошибки и завершаем загрузку только если компонент смонтирован
    if (isMountedRefLocal?.current) {
      if (setLoading) setLoading(false);
      if (setError) setError(error);
    }
    return [];
  }
};
// === КОНЕЦ ОСНОВНОЙ ФУНКЦИИ ОБНОВЛЕНИЯ ===