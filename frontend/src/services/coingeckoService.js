// Сервис для работы с CoinGecko API

/**
 * Получает цену токена с CoinGecko по его CoinGecko ID
 * @param {string} tokenId - CoinGecko ID токена (например, 'ethereum', 'usd-coin')
 * @returns {Promise<number|null>} Цена токена в USD или null, если не удалось получить
 */
export const fetchTokenPrice = async (tokenId) => {
  try {
    // Проверяем, передан ли tokenId
    if (!tokenId) {
      console.warn('[CoinGecko Service] Token ID не предоставлен');
      return null;
    }

    // Формируем URL для запроса к CoinGecko API
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;

    // Выполняем HTTP GET запрос
    const response = await fetch(url);

    // Проверяем успешность ответа
    if (!response.ok) {
      console.warn(`[CoinGecko Service] HTTP ошибка: ${response.status}`);
      return null;
    }

    // Парсим JSON ответ
    const data = await response.json();

    // Извлекаем цену из ответа
    // CoinGecko возвращает данные в формате { "token-id": { "usd": <цена> } }
    if (data && data[tokenId] && data[tokenId].usd !== undefined) {
      return data[tokenId].usd;
    } else {
      console.warn(`[CoinGecko Service] Цена не найдена в ответе для токена: ${tokenId}`);
      return null;
    }
  } catch (error) {
    // Обрабатываем возможные ошибки (сетевые ошибки, ошибки парсинга и т.д.)
    console.error('[CoinGecko Service] Ошибка при получении цены:', error);
    return null;
  }
};

/**
 * Получает список токенов с CoinGecko и создает маппинг адресов контрактов к CoinGecko ID
 * @param {number} chainId - ID сети для фильтрации токенов (не используется напрямую в API, но полезен для логики)
 * @returns {Promise<Object>} Объект с маппингом адресов контрактов к CoinGecko ID
 */
export const fetchTokens = async (chainId) => {
  try {
    console.log(`[CoinGecko Service] Получение списка токенов с платформами`);

    // CoinGecko API endpoint для получения списка токенов с платформами
    const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';

    // Выполняем HTTP GET запрос
    const response = await fetch(url);

    // Проверяем успешность ответа
    if (!response.ok) {
      console.warn(`[CoinGecko Service] HTTP ошибка при получении списка токенов: ${response.status}`);
      return {};
    }

    // Парсим JSON ответ
    const tokens = await response.json();

    // Создаем маппинг адресов контрактов к CoinGecko ID
    const tokenMapping = {};

    // Сопоставление платформ CoinGecko с chainId
    const platformToChainId = {
      'ethereum': 1,
      'polygon-pos': 137,
      // Можно добавить другие сети по мере необходимости
    };

    // Проходим по всем токенам в ответе
    for (const token of tokens) {
      // Проверяем, есть ли у токена платформы (контракты)
      if (token.platforms) {
        // Проходим по всем платформам токена
        for (const [platform, contractAddress] of Object.entries(token.platforms)) {
          // Получаем chainId для текущей платформы
          const platformChainId = platformToChainId[platform];

          // Если платформа соответствует запрашиваемой сети и есть адрес контракта
          // Если chainId не указан, возвращаем все токены
          if ((chainId === undefined || platformChainId === chainId) && contractAddress) {
            // Добавляем в маппинг (адрес контракта -> CoinGecko ID)
            // Приводим адрес к нижнему регистру для согласованности
            tokenMapping[contractAddress.toLowerCase()] = token.id;
          }
        }
      }
    }

    console.log(`[CoinGecko Service] Получено ${Object.keys(tokenMapping).length} токенов с адресами контрактов`);
    return tokenMapping;
  } catch (error) {
    console.error('[CoinGecko Service] Ошибка при получении списка токенов:', error);
    return {};
  }
};

/**
 * Получает CoinGecko ID токена по адресу контракта
 * @param {string} contractAddress - Адрес контракта токена
 * @param {number} chainId - ID сети
 * @returns {Promise<string|null>} CoinGecko ID токена или null, если не найден
 */
export const getTokenIdByAddress = async (contractAddress, chainId) => {
  try {
    // Получаем маппинг адресов контрактов к CoinGecko ID
    const tokenMapping = await fetchTokens(chainId);

    // Ищем CoinGecko ID по адресу контракта
    // Приводим адрес к нижнему регистру для согласованности
    const tokenId = tokenMapping[contractAddress.toLowerCase()];

    if (tokenId) {
      return tokenId;
    } else {
      console.warn(`[CoinGecko Service] CoinGecko ID не найден для токена ${contractAddress} в сети ${chainId}`);
      return null;
    }
  } catch (error) {
    console.error('[CoinGecko Service] Ошибка при поиске CoinGecko ID по адресу:', error);
    return null;
  }
};