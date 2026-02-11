// Импортируем сервисы цен
import * as etherscanV2Service from './etherscanV2Service';
import * as alchemyService from './alchemyService';
import * as defillamaService from './defillamaService';
import * as coingeckoService from './coingeckoService';
import * as coinmarketcapService from './coinmarketcapService';

// Импортируем конфигурацию сервисов цен
import { getPriceServicesConfig } from '../config/appConfig';

// === КОНСТАНТЫ ===
const DEFAULT_RETRY_DELAY_MS = 1000;
// === КОНЕЦ КОНСТАНТ ===

/*** Получает цену токена с резервными вариантами
 * @param {string} contractAddress Адрес контракта токена
 * @param {number} chainId ID сети
 * @param {string} apiKey API ключ (если требуется)
 * @param {string} coingeckoId ID токена на CoinGecko (если известен)
 * @param {string} cmcId ID токена на CoinMarketCap (если известен)
 * @returns {Promise<{price: number, source: string}>} Объект с ценой токена в USD и источником или {price: 0, source: null}, если не удалось получить
 */
export const fetchTokenPriceWithFallback = async (contractAddress, chainId, apiKey, coingeckoId, cmcId) => {
  try {
    console.log(`[Price Aggregator] Начинаем получение цены для токена ${contractAddress} в сети ${chainId} с резервными вариантами`);

    // Получаем конфигурацию активных сервисов из нового файла конфигурации
    const servicesConfig = getPriceServicesConfig();
    console.log("[Price Aggregator] Загруженная конфигурация цен:", servicesConfig);

    // Определяем порядок опроса сервисов
    const serviceOrder = ['EtherscanV2', 'Alchemy', 'DefiLlama', 'CoinGecko', 'CoinMarketCap'];

    // Проходим по каждому сервису в порядке приоритета
    for (const serviceName of serviceOrder) {
      // Проверяем, включен ли сервис в конфигурации
      if (servicesConfig[serviceName]) {
        console.log(`[Price Aggregator] Опрашиваем сервис ${serviceName} для токена ${contractAddress}`);
        let servicePrice = null;

        try {
          // Выполняем запрос к соответствующему сервису с повторными попытками
          switch (serviceName) {
            case 'EtherscanV2':
              // Используем агрегатор цен из EtherscanV2 сервиса
              servicePrice = await etherscanV2Service.fetchTokenPrice(contractAddress, chainId, apiKey);
              break;
            case 'Alchemy':
              // Используем агрегатор цен из Alchemy сервиса
              servicePrice = await alchemyService.fetchTokenPrice(contractAddress, chainId, apiKey);
              break;
            case 'DefiLlama':
              // Используем агрегатор цен из DefiLlama сервиса
              servicePrice = await defillamaService.fetchTokenPrice(contractAddress, chainId, apiKey);
              break;
            case 'CoinGecko':
              // === ИСПРАВЛЕНИЕ 1: Автоматическое получение CoinGecko ID ===
              // Проверяем, был ли передан CoinGecko ID
              let effectiveCoingeckoId = coingeckoId;

              // Если CoinGecko ID не был передан, пытаемся получить его
              if (!effectiveCoingeckoId) {
                console.log(`[Price Aggregator] CoinGecko ID не предоставлен для токена ${contractAddress}, пытаемся получить его через CoinGecko Service`);
                effectiveCoingeckoId = await coingeckoService.getTokenIdByAddress(contractAddress, chainId);
                console.log(`[Price Aggregator] Полученный CoinGecko ID для токена ${contractAddress}: ${effectiveCoingeckoId}`);
              }

              // Если CoinGecko ID найден (переданный или полученный), запрашиваем цену
              if (effectiveCoingeckoId) {
                servicePrice = await coingeckoService.fetchTokenPrice(effectiveCoingeckoId, apiKey);
                console.log(`[Price Aggregator] Запрошена цена у CoinGecko для токена ${contractAddress} с ID ${effectiveCoingeckoId}: ${servicePrice}`);
                
                // Возвращаем цену и указываем, что источник - CoinGecko
                return { price: servicePrice, source: 'CoinGecko' };
              } else {
                console.warn(`[Price Aggregator] Не удалось получить CoinGecko ID для токена ${contractAddress} в сети ${chainId}`);
              }
              break;
            // === КОНЕЦ ИСПРАВЛЕНИЯ 1 ===
            case 'CoinMarketCap':
              if (cmcId) {
                servicePrice = await coinmarketcapService.fetchTokenPrice(cmcId, apiKey);
              }
              break;
            default:
              console.warn(`[Price Aggregator] Неизвестный сервис: ${serviceName}`);
              servicePrice = null;
          }
        } catch (serviceError) {
          console.error(`[Price Aggregator] Ошибка при получении цены от сервиса ${serviceName} для токена ${contractAddress}:`, serviceError);
          // Продолжаем опрос следующего сервиса в случае ошибки
          continue;
        }

        // === ИСПРАВЛЕНИЕ 2: Усиленная проверка корректности цены ===
        // Проверяем, получили ли мы корректную цену
        // Условие: значение должно быть числом, не NaN, не Infinity и больше 0
        if (servicePrice !== null &&
          servicePrice !== undefined &&
          typeof servicePrice === 'number' &&
          !isNaN(servicePrice) &&
          isFinite(servicePrice) &&
          servicePrice > 0) {
          console.log(`[Price Aggregator] Цена для токена ${contractAddress} получена через ${serviceName}: $${servicePrice}`);
          return { price: servicePrice, source: serviceName }; // Возвращаем объект с ценой и источником
        } else {
          console.log(`[Price Aggregator] Сервис ${serviceName} не вернул корректную цену для токена ${contractAddress}. Получено: ${servicePrice} (тип: ${typeof servicePrice})`);
        }
        // === КОНЕЦ ИСПРАВЛЕНИЯ 2 ===
      } else {
        console.log(`[Price Aggregator] Сервис ${serviceName} отключен в конфигурации`);
      }
    }

    // Если ни один из сервисов не вернул цену, пробуем получить цену для нативного токена
    // Это может быть полезно для токенов с адресом 0x0000000000000000000000000000000000000000
    if (contractAddress === '0x0000000000000000000000000000000000000000' || 
        contractAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      
      // Пытаемся получить цену нативного токена для данной сети
      const nativeTokenPriceResult = await getNativeTokenPrice(chainId);
      if (nativeTokenPriceResult && typeof nativeTokenPriceResult.price === 'number' && nativeTokenPriceResult.price > 0) {
        console.log(`[Price Aggregator] Цена нативного токена для сети ${chainId} получена: $${nativeTokenPriceResult.price}`);
        return nativeTokenPriceResult; // Возвращаем объект с ценой и источником
      }
    }

    // Если ни один из сервисов не вернул цену
    console.warn(`[Price Aggregator] Не удалось получить цену для токена ${contractAddress} ни через один из сервисов`);
    return { price: 0, source: null }; // Возвращаем объект с нулевой ценой и null источником
  } catch (error) {
    console.error(`[Price Aggregator] Критическая ошибка при получении цены для токена ${contractAddress}:`, error);
    // Возвращаем объект с нулевой ценой и null источником в случае критической ошибки
    return { price: 0, source: null };
  }
};

/**
 * Получает цену нативного токена для указанной сети
 * @param {number} chainId ID сети
 * @returns {Promise<{price: number, source: string}>} Объект с ценой нативного токена в USD и источником или {price: 0, source: null}, если не удалось получить
 */
const getNativeTokenPrice = async (chainId) => {
  try {
    console.log(`[Price Aggregator] Попытка получения цены нативного токена для сети ${chainId}`);

    // Импортируем конфигурацию поддерживаемых сетей
    const { SUPPORTED_CHAINS } = await import('../config/supportedChains');
    const chainConfig = SUPPORTED_CHAINS[chainId];

    if (!chainConfig || !chainConfig.nativeTokenCoinGeckoId) {
      console.warn(`[Price Aggregator] Нет конфигурации CoinGecko для нативного токена сети ${chainId}`);
      return { price: 0, source: null };
    }

    const nativeTokenId = chainConfig.nativeTokenCoinGeckoId;
    console.log(`[Price Aggregator] Используем CoinGecko ID для нативного токена: ${nativeTokenId}`);

    // Получаем цену через CoinGecko
    const price = await coingeckoService.fetchTokenPrice(nativeTokenId);
    if (price && typeof price === 'number' && price > 0) {
      console.log(`[Price Aggregator] Цена нативного токена для сети ${chainId} успешно получена: $${price}`);
      return { price: price, source: 'CoinGecko' }; // Указываем, что цена получена через CoinGecko
    }

    console.warn(`[Price Aggregator] Не удалось получить цену нативного токена для сети ${chainId} через CoinGecko`);
    return { price: 0, source: null };
  } catch (error) {
    console.error(`[Price Aggregator] Ошибка при получении цены нативного токена для сети ${chainId}:`, error);
    return { price: 0, source: null };
  }
};

/*** Получает цены для массива токенов параллельно
 * @param {Array} tokens Массив объектов токенов
 * @param {number} chainId ID сети
 * @returns {Promise<Object>} Объект с маппингом адресов контрактов к объектам {price, source}
 */
export const fetchMultipleTokenPricesWithFallback = async (tokens, chainId) => {
  try {
    console.log(`[Price Aggregator] Начинаем получение цен для ${tokens.length} токенов`);

    // Создаем массив промисов для параллельного получения цен
    const pricePromises = tokens.map(token =>
      fetchTokenPriceWithFallback(
        token.contractAddress,
        token.chainId || chainId, // Используем chainId токена, если он есть, иначе общий chainId
        token.apiKey,
        token.coingeckoId,
        token.cmcId
      ).then(result => ({
        contractAddress: token.contractAddress,
        price: result.price,
        source: result.source
      }))
    );

    // Ждем завершения всех промисов
    const results = await Promise.all(pricePromises);

    // Создаем объект с маппингом адресов контрактов к объектам {price, source}
    const prices = {};
    results.forEach(result => {
      prices[result.contractAddress] = { price: result.price, source: result.source };
    });

    console.log(`[Price Aggregator] Получены цены для ${results.length} токенов`);
    return prices;
  } catch (error) {
    console.error('[Price Aggregator] Критическая ошибка в fetchMultipleTokenPricesWithFallback:', error);
    throw error;
  }
};

/*** Получает токены с ценами и объединяет их
 * @param {Array} tokens - Массив объектов токенов с полями contractAddress, chainId, apiKey, coingeckoId, cmcId
 * @param {number} chainId - ID сети
 * @returns {Promise<Array>} Массив токенов с ценами
 */
export const fetchTokensWithPrices = async (tokens, chainId) => {
  try {
    console.log(`[Price Aggregator] Получаем цены для ${tokens.length} токенов`);

    // Получаем цены для всех токенов
    const prices = await fetchMultipleTokenPricesWithFallback(tokens, chainId);

    // Объединяем токены с ценами
    // === ИСПРАВЛЕНИЕ 3: Сохраняем цену в поле priceUSD и источник в priceSource, как ожидает компонент WalletTokens ===
    const tokensWithPrices = tokens.map(token => {
      const priceData = prices[token.contractAddress]; // Сохраняем точное значение цены (даже 0 или null)
      return {
        ...token,
        priceUSD: priceData ? priceData.price : null, // <-- Исправлено: сохраняем в priceUSD
        priceSource: priceData ? priceData.source : null // <-- Добавлено: сохраняем источник цены
      };
    });
    // === КОНЕЦ ИСПРАВЛЕНИЯ 3 ===

    console.log(`[Price Aggregator] Получено ${tokensWithPrices.length} токенов с ценами`);
    return tokensWithPrices;
  } catch (error) {
    console.error('[Price Aggregator] Критическая ошибка в fetchTokensWithPrices:', error);
    // Возвращаем токены без цен в случае ошибки
    return tokens.map(token => ({ ...token, priceUSD: null }));
  }
};