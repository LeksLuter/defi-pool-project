// Сервис для работы с CoinGecko API и локальной базой данных токенов

// === ИМПОРТЫ ===
import { SUPPORTED_CHAINS } from '../config/supportedChains'; // Импортируем SUPPORTED_CHAINS
// === КОНЕЦ ИМПОРТОВ ===

// === КОНСТАНТЫ ===
// Базовый URL для API нашего локального сервера
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : '/.netlify/functions'; // Для Netlify Functions, если потребуется проксирование

const MAX_RETRIES = 3; // Максимальное количество повторных попыток
const BASE_DELAY_MS = 1000; // Базовая задержка 1 секунда для экспоненциальной выдержки
// === КОНЕЦ КОНСТАНТ ===

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

/**
 * Создает маппинг chainId на платформу CoinGecko на основе SUPPORTED_CHAINS
 * @returns {Object} Объект с маппингом chainId -> platform
 */
const createChainIdToPlatformMapping = () => {
  const mapping = {};
  console.log('[CoinGecko Service] Создание маппинга chainId на платформу CoinGecko из SUPPORTED_CHAINS...');
  for (const [chainId, networkConfig] of Object.entries(SUPPORTED_CHAINS)) {
    const chainIdInt = parseInt(chainId, 10);
    if (networkConfig.coinGeckoId) {
      mapping[chainIdInt] = networkConfig.coinGeckoId;
      console.log(`[CoinGecko Service] Маппинг chainId ${chainIdInt} -> платформа '${networkConfig.coinGeckoId}'`);
    } else {
      console.warn(`[CoinGecko Service] Нет coinGeckoId для сети chainId ${chainIdInt} в SUPPORTED_CHAINS`);
    }
  }
  return mapping;
};

/**
 * Получает CoinGecko ID для нативного токена на основе chainId.
 * @param {number} chainId ID сети.
 * @returns {string|null} CoinGecko ID нативного токена или null.
 */
const getNativeTokenCoinGeckoId = (chainId) => {
  const chainInfo = SUPPORTED_CHAINS[chainId];
  if (chainInfo && chainInfo.nativeTokenCoinGeckoId) {
    console.log(`[CoinGecko Service] Нативный токен для сети ${chainId} (${chainInfo.name}): CoinGecko ID '${chainInfo.nativeTokenCoinGeckoId}'`);
    return chainInfo.nativeTokenCoinGeckoId;
  }
  console.warn(`[CoinGecko Service] CoinGecko ID для нативного токена сети ${chainId} не найден в SUPPORTED_CHAINS`);
  return null;
};

// === КОНЕЦ ВСПОМОГАТЕЛЬНЫХ ФУНКЦИЙ ===

// === ОСНОВНЫЕ ФУНКЦИИ СЕРВИСА ===

/**
 * Получает токен из локальной базы данных по адресу контракта и chainId
 * @param {string} contractAddress - Адрес контракта токена
 * @param {number} chainId - ID сети
 * @returns {Promise<Object|null>} Объект токена или null, если не найден или ошибка
 */
const getTokenFromDatabase = async (contractAddress, chainId) => {
  try {
    console.log(`[CoinGecko Service] getTokenFromDatabase: Поиск токена в БД по адресу ${contractAddress} в сети ${chainId}`);

    // Валидация входных данных
    if (!contractAddress || !chainId) {
      console.warn('[CoinGecko Service] getTokenFromDatabase: Адрес контракта или chainId не предоставлены');
      return null;
    }

    // Формируем URL для запроса к нашему API
    const url = `${API_BASE_URL}/tokens/address/${chainId}/${contractAddress}`;
    console.log(`[CoinGecko Service] getTokenFromDatabase: Запрос к API: ${url}`);

    let retries = 0;
    while (retries <= MAX_RETRIES) {
      try {
        // Выполняем HTTP GET запрос
        const response = await fetch(url);

        // Проверяем успешность ответа
        if (!response.ok) {
          if (response.status === 404) {
            console.log(`[CoinGecko Service] getTokenFromDatabase: Токен с адресом ${contractAddress} в сети ${chainId} не найден в БД`);
            return null;
          }
          const errorText = await response.text();
          console.warn(`[CoinGecko Service] getTokenFromDatabase: HTTP ошибка ${response.status} - ${response.statusText}. Body: ${errorText}`);
          // Для других ошибок (500 и т.д.) пробуем повторить
          if (retries < MAX_RETRIES) {
            const delay = Math.pow(2, retries) * BASE_DELAY_MS + Math.random() * 1000;
            console.warn(`[CoinGecko Service] getTokenFromDatabase: Повторная попытка через ${delay.toFixed(0)}мс... (Попытка ${retries + 1}/${MAX_RETRIES + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }
          return null;
        }

        // Парсим JSON ответ
        const tokenData = await response.json();
        console.log(`[CoinGecko Service] getTokenFromDatabase: Получен ответ от API для ${contractAddress} в сети ${chainId}:`, tokenData);

        // Проверяем, есть ли у токена CoinGecko ID
        if (tokenData && tokenData.coingecko_id) {
          console.log(`[CoinGecko Service] getTokenFromDatabase: CoinGecko ID для токена ${contractAddress} в сети ${chainId}: ${tokenData.coingecko_id}`);
          return tokenData;
        } else {
          console.log(`[CoinGecko Service] getTokenFromDatabase: У токена ${contractAddress} в сети ${chainId} нет CoinGecko ID в ответе БД`);
          // Даже если coingecko_id null/undefined, мы все равно возвращаем объект токена,
          // чтобы различать "токен не найден" и "токен найден, но coingecko_id отсутствует"
          return tokenData || null;
        }
      } catch (error) {
        console.error('[CoinGecko Service] getTokenFromDatabase: Ошибка при запросе к API (попытка ' + (retries + 1) + '):', error);
        if (retries < MAX_RETRIES) {
          const delay = Math.pow(2, retries) * BASE_DELAY_MS + Math.random() * 1000;
          console.warn(`[CoinGecko Service] getTokenFromDatabase: Ошибка сети. Повторная попытка через ${delay.toFixed(0)}мс... (Попытка ${retries + 1}/${MAX_RETRIES + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }
        // Возвращаем null в случае сетевой ошибки или ошибки парсинга
        return null;
      }
    }
  } catch (error) {
    console.error('[CoinGecko Service] getTokenFromDatabase: Критическая ошибка:', error);
    return null;
  }
};

/**
 * Пытается получить CoinGecko ID токена, запрашивая его напрямую у CoinGecko API по адресу и chainId.
 * Это резервный метод, если токен не найден в локальной БД.
 * @param {string} contractAddress - Адрес контракта токена
 * @param {number} chainId - ID сети
 * @returns {Promise<string|null>} CoinGecko ID токена или null, если не найден или ошибка
 */
const fetchTokenIdDirectlyFromCoinGeckoAPI = async (contractAddress, chainId) => {
  try {
    console.log(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Попытка прямого запроса CoinGecko ID для адреса ${contractAddress} в сети ${chainId}`);

    if (!contractAddress || !chainId) {
      console.warn('[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Адрес контракта или chainId не предоставлены');
      return null;
    }

    // Создаем маппинг chainId -> platform
    const chainIdToPlatform = createChainIdToPlatformMapping();
    const platform = chainIdToPlatform[chainId];

    if (!platform) {
      console.warn(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Неизвестная или неподдерживаемая сеть chainId ${chainId} для CoinGecko`);
      return null;
    }

    console.log(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Используемая платформа CoinGecko: ${platform}`);

    // CoinGecko API endpoint для поиска токена по адресу на конкретной платформе
    // Документация: https://docs.coingecko.com/reference/contract-address
    // ВАЖНО: Этот эндпоинт может не работать для всех токенов, особенно на L2.
    // ИСПРАВЛЕНО: Удалены лишние пробелы в URL
    const url = `https://api.coingecko.com/api/v3/coins/${platform}/contract/${contractAddress}`;
    console.log(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Запрос к CoinGecko API: ${url}`);

    let retries = 0;
    while (retries <= MAX_RETRIES) {
      try {
        const response = await fetch(url);

        if (response.status === 429) { // Too Many Requests
          const delay = Math.pow(2, retries) * BASE_DELAY_MS + Math.random() * 1000;
          console.warn(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Получен статус 429. Повторная попытка через ${delay.toFixed(0)}мс... (Попытка ${retries + 1}/${MAX_RETRIES + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 404) {
            console.log(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Токен не найден (404) для ${contractAddress} на платформе ${platform}. Response: ${errorText}`);
          } else {
            console.warn(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: HTTP ошибка: ${response.status} - ${response.statusText}. Body: ${errorText}`);
          }
          // Для 404 и других ошибок возвращаем null
          return null;
        }

        const data = await response.json();
        console.log(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Получен ответ от CoinGecko API для ${contractAddress} на платформе ${platform}:`, data);

        // CoinGecko возвращает объект токена, в котором поле 'id' и есть CoinGecko ID
        if (data && data.id) {
          const tokenId = data.id;
          console.log(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: CoinGecko ID для токена ${contractAddress} на платформе ${platform}: ${tokenId}`);
          return tokenId;
        } else {
          console.warn(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: CoinGecko ID не найден в ответе для токена ${contractAddress} на платформе ${platform}`, data);
          return null;
        }
      } catch (error) {
        console.error('[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Ошибка при прямом запросе CoinGecko API (попытка ' + (retries + 1) + '):', error);
        if (retries < MAX_RETRIES) {
          const delay = Math.pow(2, retries) * BASE_DELAY_MS + Math.random() * 1000;
          console.warn(`[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Ошибка сети. Повторная попытка через ${delay.toFixed(0)}мс... (Попытка ${retries + 1}/${MAX_RETRIES + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }
        return null;
      }
    }
  } catch (error) {
    console.error('[CoinGecko Service] fetchTokenIdDirectlyFromCoinGeckoAPI: Критическая ошибка:', error);
    return null;
  }
};

/**
 * Пытается получить CoinGecko ID токена, запрашивая его у локального API-сервера.
 * Локальный сервер может иметь более широкие лимиты или использовать кэшированные данные.
 * @param {string} contractAddress - Адрес контракта токена
 * @param {number} chainId - ID сети
 * @returns {Promise<string|null>} CoinGecko ID токена или null, если не найден или ошибка
 */
const fetchTokenIdFromLocalAPIServer = async (contractAddress, chainId) => {
  try {
    console.log(`[CoinGecko Service] fetchTokenIdFromLocalAPIServer: Запрос CoinGecko ID у локального API-сервера для адреса ${contractAddress} в сети ${chainId}`);

    if (!contractAddress || !chainId) {
      console.warn('[CoinGecko Service] fetchTokenIdFromLocalAPIServer: Адрес контракта или chainId не предоставлены');
      return null;
    }

    // Формируем URL для запроса к нашему локальному API
    // Предполагаем, что локальный API имеет эндпоинт для поиска токенов
    // Например: GET /api/coingecko/token-id?address=<>&chainId=<>
    const url = `${API_BASE_URL}/coingecko/token-id?address=${contractAddress}&chainId=${chainId}`;
    console.log(`[CoinGecko Service] fetchTokenIdFromLocalAPIServer: Запрос к локальному API: ${url}`);

    let retries = 0;
    while (retries <= MAX_RETRIES) {
      try {
        // Выполняем HTTP GET запрос
        const response = await fetch(url);

        // Проверяем успешность ответа
        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[CoinGecko Service] fetchTokenIdFromLocalAPIServer: HTTP ошибка от локального API: ${response.status} - ${response.statusText}. Body: ${errorText}`);
          // Пробуем повторить
          if (retries < MAX_RETRIES) {
            const delay = Math.pow(2, retries) * BASE_DELAY_MS + Math.random() * 1000;
            console.warn(`[CoinGecko Service] fetchTokenIdFromLocalAPIServer: Повторная попытка через ${delay.toFixed(0)}мс... (Попытка ${retries + 1}/${MAX_RETRIES + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }
          return null;
        }

        // Парсим JSON ответ
        const data = await response.json();
        console.log(`[CoinGecko Service] fetchTokenIdFromLocalAPIServer: Получен ответ от локального API для ${contractAddress} в сети ${chainId}:`, data);

        // Проверяем, есть ли CoinGecko ID в ответе
        if (data && data.coingecko_id) {
          const tokenId = data.coingecko_id;
          console.log(`[CoinGecko Service] fetchTokenIdFromLocalAPIServer: CoinGecko ID для токена ${contractAddress} в сети ${chainId}: ${tokenId}`);
          return tokenId;
        } else {
          console.log(`[CoinGecko Service] fetchTokenIdFromLocalAPIServer: CoinGecko ID не найден в ответе локального API для токена ${contractAddress} в сети ${chainId}`);
          return null;
        }
      } catch (error) {
        console.error('[CoinGecko Service] fetchTokenIdFromLocalAPIServer: Ошибка при запросе к локальному API (попытка ' + (retries + 1) + '):', error);
        if (retries < MAX_RETRIES) {
          const delay = Math.pow(2, retries) * BASE_DELAY_MS + Math.random() * 1000;
          console.warn(`[CoinGecko Service] fetchTokenIdFromLocalAPIServer: Ошибка сети. Повторная попытка через ${delay.toFixed(0)}мс... (Попытка ${retries + 1}/${MAX_RETRIES + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }
        // Возвращаем null в случае сетевой ошибки или ошибки парсинга
        return null;
      }
    }
  } catch (error) {
    console.error('[CoinGecko Service] fetchTokenIdFromLocalAPIServer: Критическая ошибка:', error);
    return null;
  }
};

/**
 * Получает CoinGecko ID токена по адресу контракта
 * @param {string} contractAddress - Адрес контракта токена
 * @param {number} chainId - ID сети
 * @returns {Promise<string|null>} CoinGecko ID токена или null, если не найден или ошибка
 */
export const getTokenIdByAddress = async (contractAddress, chainId) => {
  try {
    console.log(`[CoinGecko Service] getTokenIdByAddress: Поиск CoinGecko ID для адреса: ${contractAddress} в сети ${chainId}`);

    // Проверяем входные параметры
    if (!contractAddress) {
      console.warn('[CoinGecko Service] getTokenIdByAddress: Адрес контракта не предоставлен');
      return null;
    }

    // === ИСПРАВЛЕНИЕ: Обработка нативного токена ===
    // Обработка нативного токена
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      console.log(`[CoinGecko Service] getTokenIdByAddress: Обнаружен адрес нативного токена ${contractAddress}`);
      const nativeTokenId = getNativeTokenCoinGeckoId(chainId);
      if (nativeTokenId) {
        console.log(`[CoinGecko Service] getTokenIdByAddress: Найден CoinGecko ID для нативного токена сети ${chainId}: ${nativeTokenId}`);
        return nativeTokenId;
      } else {
        console.warn(`[CoinGecko Service] getTokenIdByAddress: CoinGecko ID для нативного токена сети ${chainId} не найден в SUPPORTED_CHAINS`);
        // Можно попробовать другие методы или вернуть null
      }
    }
    // === КОНЕЦ ИСПРАВЛЕНИЯ ===

    // 1. Попытка получить токен из локальной базы данных
    console.log(`[CoinGecko Service] getTokenIdByAddress: Попытка поиска токена в локальной БД...`);
    const tokenFromDb = await getTokenFromDatabase(contractAddress, chainId);

    // 2. Если токен найден в БД и у него есть CoinGecko ID, возвращаем его
    if (tokenFromDb && tokenFromDb.coingecko_id) {
      console.log(`[CoinGecko Service] getTokenIdByAddress: CoinGecko ID найден в БД: ${tokenFromDb.coingecko_id}`);
      return tokenFromDb.coingecko_id;
    } else if (tokenFromDb) {
      // Токен найден, но CoinGecko ID отсутствует
      console.log(`[CoinGecko Service] getTokenIdByAddress: Токен найден в БД, но у него нет CoinGecko ID. Symbol: ${tokenFromDb.symbol || 'N/A'}`);
    } else {
      // Токен не найден в БД
      console.log(`[CoinGecko Service] getTokenIdByAddress: Токен не найден в БД`);
    }

    // 3. Если токен не найден в БД или у него нет CoinGecko ID,
    // пытаемся найти его напрямую через CoinGecko API (резервный метод)
    console.log(`[CoinGecko Service] getTokenIdByAddress: Попытка прямого поиска токена через CoinGecko API...`);
    const tokenIdDirect = await fetchTokenIdDirectlyFromCoinGeckoAPI(contractAddress, chainId);
    if (tokenIdDirect) {
      console.log(`[CoinGecko Service] getTokenIdByAddress: CoinGecko ID найден напрямую через CoinGecko API: ${tokenIdDirect}`);
      return tokenIdDirect;
    } else {
      console.log(`[CoinGecko Service] getTokenIdByAddress: Прямой поиск через CoinGecko API не дал результата`);
    }

    // 4. Если прямой поиск не удался, пытаемся получить CoinGecko ID через локальный API-сервер
    // Локальный сервер может иметь более широкие лимиты или использовать кэшированные данные
    console.log(`[CoinGecko Service] getTokenIdByAddress: Попытка получения CoinGecko ID через локальный API-сервер...`);
    const tokenIdFromLocalAPI = await fetchTokenIdFromLocalAPIServer(contractAddress, chainId);
    if (tokenIdFromLocalAPI) {
      console.log(`[CoinGecko Service] getTokenIdByAddress: CoinGecko ID найден через локальный API-сервер: ${tokenIdFromLocalAPI}`);
      return tokenIdFromLocalAPI;
    } else {
      console.log(`[CoinGecko Service] getTokenIdByAddress: Поиск через локальный API-сервер не дал результата`);
    }

    // 5. Если все методы исчерпаны, возвращаем null
    console.warn(`[CoinGecko Service] getTokenIdByAddress: Не удалось получить CoinGecko ID для адреса ${contractAddress} в сети ${chainId} ни из БД, ни напрямую через CoinGecko API, ни через локальный API-сервер`);
    return null;

  } catch (error) {
    console.error('[CoinGecko Service] getTokenIdByAddress: Критическая ошибка:', error);
    return null;
  }
};

/**
 * Получает цену токена с CoinGecko по его CoinGecko ID
 * @param {string} tokenId - CoinGecko ID токена (например, 'ethereum', 'usd-coin')
 * @returns {Promise<number|null>} Цена токена в USD или null, если не удалось получить
 */
export const fetchTokenPrice = async (tokenId) => {
  try {
    // Проверяем, передан ли tokenId
    if (!tokenId) {
      console.warn('[CoinGecko Service] fetchTokenPrice: Token ID не предоставлен');
      return null;
    }

    console.log(`[CoinGecko Service] fetchTokenPrice: Получение цены для tokenId: ${tokenId}`);

    let retries = 0;
    while (retries <= MAX_RETRIES) {
      try {
        // Формируем URL для запроса к CoinGecko API
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
        console.log(`[CoinGecko Service] fetchTokenPrice: Запрос к CoinGecko API: ${url}`);

        // Подготавливаем заголовки запроса
        const headers = {
          'Accept': 'application/json',
        };

        // Выполняем HTTP GET запрос
        const response = await fetch(url, { headers });

        if (response.status === 429) { // Too Many Requests
          const delay = Math.pow(2, retries) * BASE_DELAY_MS + Math.random() * 1000;
          console.warn(`[CoinGecko Service] fetchTokenPrice: Получен статус 429. Повторная попытка через ${delay.toFixed(0)}мс... (Попытка ${retries + 1}/${MAX_RETRIES + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }

        // Проверяем успешность ответа
        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[CoinGecko Service] fetchTokenPrice: HTTP ошибка ${response.status} - ${response.statusText}. Response body: ${errorText}`);
          // Пробуем повторить
          if (retries < MAX_RETRIES) {
            const delay = Math.pow(2, retries) * BASE_DELAY_MS + Math.random() * 1000;
            console.warn(`[CoinGecko Service] fetchTokenPrice: Повторная попытка через ${delay.toFixed(0)}мс... (Попытка ${retries + 1}/${MAX_RETRIES + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }
          return null;
        }

        // Парсим JSON ответ
        const data = await response.json();
        console.log(`[CoinGecko Service] fetchTokenPrice: Получен ответ от CoinGecko API для ${tokenId}:`, data);

        // Извлекаем цену из ответа
        // CoinGecko возвращает данные в формате { "token-id": { "usd": <цена> } }
        if (data && data[tokenId] && typeof data[tokenId].usd === 'number') {
          const price = data[tokenId].usd;
          console.log(`[CoinGecko Service] fetchTokenPrice: Цена для токена ${tokenId}: $${price}`);
          return price;
        } else {
          console.warn(`[CoinGecko Service] fetchTokenPrice: Цена не найдена или некорректна в ответе для токена: ${tokenId}`, data);
          return null;
        }
      } catch (error) {
        console.error('[CoinGecko Service] fetchTokenPrice: Ошибка при получении цены (попытка ' + (retries + 1) + '):', error);
        if (retries < MAX_RETRIES) {
          const delay = Math.pow(2, retries) * BASE_DELAY_MS + Math.random() * 1000;
          console.warn(`[CoinGecko Service] fetchTokenPrice: Ошибка сети. Повторная попытка через ${delay.toFixed(0)}мс... (Попытка ${retries + 1}/${MAX_RETRIES + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }
        return null;
      }
    }
  } catch (error) {
    console.error('[CoinGecko Service] fetchTokenPrice: Критическая ошибка:', error);
    return null;
  }
};

/**
 * Получает список токенов (заглушка для совместимости с другими сервисами)
 * @returns {Promise<Array>} Пустой массив
 */
export const fetchTokensList = async () => {
  console.log(`[CoinGecko Service] fetchTokensList called - returning empty array as stub`);
  return [];
};

/**
 * Получает токены (заглушка для совместимости с другими сервисами)
 * @param {string} account - Адрес кошелька
 * @param {Object} provider - Провайдер ethers.js
 * @param {number} chainId - ID сети
 * @returns {Promise<Array>} Пустой массив
 */
export const fetchTokens = async (account, provider, chainId) => {
  console.log(`[CoinGecko Service] fetchTokens called with account: ${account}, chainId: ${chainId} - returning empty array as stub`);
  return [];
};
// === КОНЕЦ ОСНОВНЫХ ФУНКЦИЙ СЕРВИСА ===