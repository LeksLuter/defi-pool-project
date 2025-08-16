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
import * as defillamaService from './defiLlamaService'; // Правильный регистр
import * as coingeckoService from './coingeckoService';
import * as coinmarketcapService from './coinmarketcapService';
// Импортируем агрегатор цен
import { fetchMultipleTokenPricesWithFallback } from './priceAggregatorService';
// === КОНЕЦ ИМПОРТОВ СЕРВИСОВ ===

// === КОНСТАНТЫ ===
console.log(`[Token Service] Используемое значение CACHE_DURATION_MS из appConfig.js: ${CACHE_DURATION_MS}мс`);
// === КОНЕЦ КОНСТАНТ ===

/**
 * Получает токены с одного конкретного сервиса с повторными попытками.
 * @param {Function} fetchFunction Функция для вызова (fetchTokens).
 * @param {string} serviceName Название сервиса (для логирования).
 * @param {string} account Адрес кошелька.
 * @param {ethers.providers.Provider} provider Провайдер ethers.js.
 * @param {number} chainId ID сети.
 * @param {number} maxRetries Максимальное количество попыток.
 * @returns {Promise<any>} Результат вызова сервиса или null в случае неудачи.
 */
const fetchWithRetry = async (fetchFunction, serviceName, account, provider, chainId, maxRetries = 2) => {
  console.log(`[Token Service] Попытка получения данных от ${serviceName} для ${account} в сети ${chainId}...`);
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // Вызываем функцию сервиса, передавая нужные аргументы
      const result = await fetchFunction(account, provider, chainId);
      console.log(`[Token Service] Успешно получены данные от ${serviceName} (попытка ${attempt}).`);
      return result;
    } catch (error) {
      console.warn(`[Token Service] Ошибка при получении данных от ${serviceName} (попытка ${attempt}):`, error.message || error);
      if (attempt <= maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Экспоненциальная задержка: 2с, 4с, ...
        console.log(`[Token Service] Ожидание ${delay}мс перед повторной попыткой...`);
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
      if (result.status === 'fulfilled' && result.value && Array.isArray(result.value)) {
        console.log(`[Token Service] Получено ${result.value.length} токенов от ${serviceName}`);
        allTokens = [...allTokens, ...result.value];
      } else if (result.status === 'rejected') {
        console.error(`[Token Service] Сервис ${serviceName} вернул ошибку при получении токенов:`, result.reason);
      } else {
        console.warn(`[Token Service] Сервис ${serviceName} вернул некорректные данные (не массив) при получении токенов.`);
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
        // console.log(`[Token Service] Найден дубликат токена ${key}, пропущен из ${serviceName}`);
      }
    });

    const uniqueTokens = Array.from(uniqueTokensMap.values());
    console.log(`[Token Service] Всего уникальных токенов после объединения: ${uniqueTokens.length}`);
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

  // Для получения цен используем централизованный агрегатор
  try {
      const prices = await fetchMultipleTokenPricesWithFallback(tokens, chainId);
      console.log(`[Token Service] Цены успешно получены через агрегатор для ${Object.keys(prices).length} токенов`);
      return prices;
  } catch (aggregatorError) {
      console.error(`[Token Service] Ошибка при получении цен через агрегатор:`, aggregatorError);
  }

  // Если агрегатор не сработал, возвращаем пустой объект
  return {};
};

/**
 * Объединяет токены и цены.
 * @param {Array} tokens Массив токенов.
 * @param {Object} prices Объект с ценами.
 * @returns {Array} Массив токенов с добавленными полями цены.
 */
const mergeTokensWithPrices = (tokens, prices) => {
  console.log(`[Token Service] Объединение ${tokens.length} токенов с ценами...`);
  return tokens.map(token => {
    const priceKey = token.contractAddress?.toLowerCase();
    const priceData = prices[priceKey];
    return {
      ...token,
      priceUSD: priceData?.usd ?? null,
      lastPriceUpdate: priceData?.last_updated_at ? new Date(priceData.last_updated_at * 1000).toISOString() : null
    };
  });
};

/**
 * Форматирует токены для отображения.
 * @param {Array} tokensWithPrices Массив токенов с ценами.
 * @param {number} chainId ID сети.
 * @returns {Array} Отформатированный массив токенов.
 */
const formatTokens = (tokensWithPrices, chainId) => {
  // SUPPORTED_CHAINS импортируется внутри функции, если нужно
  // import { SUPPORTED_CHAINS } from '../config/supportedChains';
  // Для простоты предположим, что SUPPORTED_CHAINS доступен глобально или из контекста
  // const network = SUPPORTED_CHAINS[chainId];
  // if (!network) {
  //   console.error(`[Token Service] Неизвестная сеть с chainId: ${chainId}`);
  //   return [];
  // }

  console.log(`[Token Service] Форматирование ${tokensWithPrices.length} токенов для сети ${chainId}...`);
  return tokensWithPrices.map(token => {
    let balanceFormatted = 'N/A';
    let balanceUSD = 'N/A';

    if (token.balance && token.decimals !== undefined) {
      try {
        const balanceBigNumber = ethers.BigNumber.from(token.balance);
        const balanceEther = ethers.utils.formatUnits(balanceBigNumber, token.decimals);
        balanceFormatted = parseFloat(balanceEther).toFixed(4); // Округляем до 4 знаков

        if (token.priceUSD) {
          const priceNum = parseFloat(token.priceUSD);
          if (!isNaN(priceNum) && priceNum > 0) {
            const balanceNum = parseFloat(balanceEther);
            if (!isNaN(balanceNum)) {
              balanceUSD = (balanceNum * priceNum).toFixed(2); // Итоговая стоимость в USD
            }
          }
        }
      } catch (formatError) {
        console.error(`[Token Service] Ошибка форматирования баланса для токена ${token.contractAddress}:`, formatError);
        balanceFormatted = 'Ошибка';
        balanceUSD = 'Ошибка';
      }
    }

    return {
      ...token,
      chainId: chainId,
      // chainName: network.name, // Если SUPPORTED_CHAINS импортирован
      // logoUrl: token.logo || `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${network.name.toLowerCase()}/assets/${token.contractAddress}/logo.png`,
      balanceFormatted,
      balanceUSD
    };
  });
};

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
  console.log(`[Token Service] === НАЧАЛО ОБНОВЛЕНИЯ ТОКЕНОВ ДЛЯ АККАУНТА ${accountAddress} В СЕТИ ${chainIdValue} ===`);

  // Проверка входных параметров
  if (!accountAddress) {
    const errorMsg = "[Token Service] Адрес аккаунта не предоставлен";
    console.error(errorMsg);
    if (isMountedRefLocal?.current && setError) setError(new Error(errorMsg));
    if (isMountedRefLocal?.current && setLoading) setLoading(false);
    return [];
  }

  if (!chainIdValue || typeof chainIdValue !== 'number') {
    const errorMsg = `[Token Service] Некорректный chainId: ${chainIdValue} (тип: ${typeof chainIdValue})`;
    console.error(errorMsg);
    if (isMountedRefLocal?.current && setError) setError(new Error(errorMsg));
    if (isMountedRefLocal?.current && setLoading) setLoading(false);
    return [];
  }

  // Получаем актуальный интервал обновления из appConfig.js
  let actualCacheDurationMs = CACHE_DURATION_MS; // Используем значение из appConfig.js
  try {
    const updateIntervalMinutes = await getUpdateIntervalMinutes(); // Получаем в минутах из appConfig.js
    if (typeof updateIntervalMinutes === 'number' && updateIntervalMinutes > 0) {
         actualCacheDurationMs = updateIntervalMinutes * 60 * 1000;
         console.log(`[Token Service] Актуальный интервал обновления: ${updateIntervalMinutes} минут (${actualCacheDurationMs}мс)`);
    } else {
        console.log(`[Token Service] Используем дефолтный интервал обновления из appConfig.js: ${actualCacheDurationMs}мс`);
    }
  } catch (intervalError) {
     console.warn(`[Token Service] Не удалось получить интервал обновления, используем дефолтный из appConfig.js: ${actualCacheDurationMs}мс`, intervalError);
  }

  // Проверка возможности фонового обновления
  if (!canPerformBackgroundUpdate(accountAddress, chainIdValue, actualCacheDurationMs)) {
    console.log(`[Token Service] Фоновое обновление отложено для ${accountAddress} в сети ${chainIdValue}.`);
    // Даже если фоновое обновление отложено, мы должны вернуть текущие данные из кэша
    const cachedData = getCachedTokens(accountAddress, chainIdValue);
    if (cachedData && Array.isArray(cachedData)) {
       console.log(`[Token Service] Возвращены закэшированные данные (${cachedData.length} токенов) для ${accountAddress} в сети ${chainIdValue}.`);
       if (isMountedRefLocal?.current && setTokens) setTokens(cachedData);
       if (isMountedRefLocal?.current && setLoading) setLoading(false);
       return cachedData;
    } else {
        console.log(`[Token Service] Нет закэшированных данных для ${accountAddress} в сети ${chainIdValue}, продолжаем обновление.`);
    }
  }

  try {
    // 1. Получаем токены
    const tokens = await fetchTokensFromAllServicesParallel(accountAddress, ethProvider, chainIdValue);
    if (!Array.isArray(tokens) || tokens.length === 0) {
       console.warn(`[Token Service] Не удалось получить токены для ${accountAddress} в сети ${chainIdValue}.`);
       // Сохраняем пустой массив в кэш
       saveTokensToCache(accountAddress, chainIdValue, []);
       if (isMountedRefLocal?.current && setTokens) setTokens([]);
       if (isMountedRefLocal?.current && setLoading) setLoading(false);
       return [];
    }

    // 2. Получаем цены
    const prices = await fetchPricesFromAllServicesParallel(accountAddress, ethProvider, chainIdValue, tokens);

    // 3. Объединяем токены и цены
    const tokensWithPrices = mergeTokensWithPrices(tokens, prices);

    // 4. Форматируем данные
    const formattedTokens = formatTokens(tokensWithPrices, chainIdValue);

    // 5. Сохраняем в кэш
    saveTokensToCache(accountAddress, chainIdValue, formattedTokens);
    setLastUpdateTime(accountAddress, chainIdValue); // Обновляем время последнего обновления

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
    // В случае ошибки также возвращаем данные из кэша, если они есть
    const cachedData = getCachedTokens(accountAddress, chainIdValue);
    if (cachedData && Array.isArray(cachedData)) {
       console.log(`[Token Service] Возвращены закэшированные данные из-за ошибки (${cachedData.length} токенов) для ${accountAddress} в сети ${chainIdValue}.`);
       if (isMountedRefLocal?.current) {
           if (setTokens) setTokens(cachedData);
           if (setLoading) setLoading(false);
           if (setError) setError(null); // Ошибка обработана, сбрасываем
       }
       return cachedData;
    }
    // Если и кэш пуст, возвращаем пустой массив
    if (isMountedRefLocal?.current) {
        if (setLoading) setLoading(false);
        if (setError) setError(error);
    }
    return [];
  }
};

// Экспортируем TOKEN_SERVICES для использования в других частях приложения, если необходимо
//export { TOKEN_SERVICES };