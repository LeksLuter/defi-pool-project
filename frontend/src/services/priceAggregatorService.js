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
 * @returns {Promise<number>} Цена токена в USD или 0, если не удалось получить
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
          return servicePrice;
        } else {
          console.log(`[Price Aggregator] Сервис ${serviceName} не вернул корректную цену для токена ${contractAddress}. Получено: ${servicePrice} (тип: ${typeof servicePrice})`);
        }
        // === КОНЕЦ ИСПРАВЛЕНИЯ 2 ===
      } else {
        console.log(`[Price Aggregator] Сервис ${serviceName} отключен в конфигурации`);
      }
    }

    // Если ни один из сервисов не вернул цену
    console.warn(`[Price Aggregator] Не удалось получить цену для токена ${contractAddress} ни через один из сервисов`);
    return 0; // Возвращаем 0, если цена не найдена
  } catch (error) {
    console.error(`[Price Aggregator] Критическая ошибка при получении цены для токена ${contractAddress}:`, error);
    // Возвращаем 0 в случае критической ошибки
    return 0;
  }
};

/*** Получает цены для массива токенов параллельно
 * @param {Array} tokens Массив объектов токенов
 * @param {number} chainId ID сети
 * @returns {Promise<Object>} Объект с маппингом адресов контрактов к ценам { адрес: цена }
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
      ).then(price => ({
        contractAddress: token.contractAddress,
        price: price
      }))
    );

    // Ждем завершения всех промисов
    const results = await Promise.all(pricePromises);

    // Создаем объект с маппингом адресов контрактов к ценам
    const prices = {};
    results.forEach(result => {
      prices[result.contractAddress] = result.price;
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
    // === ИСПРАВЛЕНИЕ 3: Сохраняем цену в поле priceUSD, как ожидает компонент WalletTokens ===
    const tokensWithPrices = tokens.map(token => {
      const price = prices[token.contractAddress] || null; // Используем null для "не найдено"
      return {
        ...token,
        priceUSD: price // <-- Исправлено: сохраняем в priceUSD
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