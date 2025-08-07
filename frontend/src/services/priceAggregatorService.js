import * as etherscanV2Service from './etherscanV2Service';
import * as alchemyService from './alchemyService';
import * as defillamaService from './defillamaService';
import { fetchTokenPrice as fetchCoinGeckoPrice, getTokenIdByAddress } from './coingeckoService';
import * as coinmarketcapService from './coinmarketcapService';
import { getPriceServicesConfig } from '../config/adminConfig'; // Импортируем из нового файла конфигурации
/**
 * Получает цену токена с указанного сервиса
 * @param {string} serviceName - Название сервиса (EtherscanV2, Alchemy, DefiLlama, CoinGecko, CoinMarketCap)
 * @param {string} contractAddress - Адрес контракта токена
 * @param {number} chainId - ID сети
 * @param {string} apiKey - API ключ (если требуется)
 * @param {string} coingeckoId - CoinGecko ID токена (если известен)
 * @param {string} cmcId - CoinMarketCap ID токена (если известен)
 * @returns {Promise<number|null>} Цена токена или null, если не удалось получить
 */
const fetchTokenPriceFromService = async (serviceName, contractAddress, chainId, apiKey, coingeckoId, cmcId) => {
  try {
    console.log(`[Price Aggregator] Попытка получить цену токена ${contractAddress} через ${serviceName}`);
    let servicePrice = null;
    // Выбираем сервис в зависимости от названия
    switch (serviceName) {
      case 'EtherscanV2':
        servicePrice = await etherscanV2Service.fetchTokenPrice(contractAddress, chainId, apiKey);
        break;
      case 'Alchemy':
        // У Alchemy сервиса нет отдельной функции получения цены в текущей реализации
        // Используем функцию из alchemyService.js, которая возвращает null (заглушка)
        console.log(`[Price Aggregator] Получение цены токена напрямую через Alchemy не реализовано. Используйте агрегатор цен.`);
        servicePrice = await alchemyService.fetchTokenPrice();
        break;
      case 'DefiLlama':
        // Аналогично для DefiLlama
        servicePrice = await defillamaService.fetchTokenPrice();
        break;
      case 'CoinGecko':
        // Если coingeckoId не предоставлен, пытаемся получить его по адресу контракта
        let effectiveCoingeckoId = coingeckoId;
        if (effectiveCoingeckoId) {
          servicePrice = await fetchCoinGeckoPrice(effectiveCoingeckoId);
        } else {
          console.log(`[Price Aggregator] CoinGecko ID не предоставлен, пытаемся получить через API для токена ${contractAddress} в сети ${chainId}`);
          effectiveCoingeckoId = await getTokenIdByAddress(contractAddress, chainId);
          if (effectiveCoingeckoId) {
            servicePrice = await fetchCoinGeckoPrice(effectiveCoingeckoId);
          } else {
            console.warn(`[Price Aggregator] Не удалось получить CoinGecko ID для токена ${contractAddress}`);
          }
        }
        break;
      case 'CoinMarketCap':
        if (cmcId) {
          servicePrice = await coinmarketcapService.fetchTokenPrice(cmcId);
        }
        break;
      default:
        console.warn(`[Price Aggregator] Неизвестный сервис: ${serviceName}`);
        servicePrice = null;
    }
    // Проверяем, получили ли мы корректную цену
    if (servicePrice !== null && !isNaN(servicePrice) && isFinite(servicePrice) && servicePrice >= 0) { // Проверяем, что цена >= 0
      console.log(`[Price Aggregator] Цена для токена ${contractAddress} получена через ${serviceName}: $${servicePrice}`);
      return servicePrice;
    } else {
      console.log(`[Price Aggregator] Сервис ${serviceName} не вернул корректную цену для токена ${contractAddress}. Получено: ${servicePrice}`);
      return null;
    }
  } catch (error) {
    console.error(`[Price Aggregator] Ошибка при получении цены через ${serviceName}:`, error);
    return null;
  }
};
/**
 * Получает цену токена с резервных вариантов (fallback)
 * @param {string} contractAddress - Адрес контракта токена
 * @param {number} chainId - ID сети
 * @param {string} apiKey - API ключ (если требуется)
 * @param {string} coingeckoId - CoinGecko ID токена (если известен)
 * @param {string} cmcId - CoinMarketCap ID токена (если известен)
 * @returns {Promise<number>} Цена токена или 0, если не удалось получить
 */
export const fetchTokenPriceWithFallback = async (contractAddress, chainId, apiKey, coingeckoId, cmcId) => {
  try {
    console.log(`[Price Aggregator] Начинаем получение цены для токена ${contractAddress} в сети ${chainId} с резервными вариантами`);
    // Получаем конфигурацию активных сервисов из нового файла конфигурации
    const servicesConfig = getPriceServicesConfig();
    // Определяем порядок опроса сервисов
    const serviceOrder = ['EtherscanV2', 'Alchemy', 'DefiLlama', 'CoinGecko', 'CoinMarketCap'];
    // Проходим по каждому сервису в порядке приоритета
    for (const serviceName of serviceOrder) {
      // Проверяем, активен ли сервис в конфигурации
      if (servicesConfig[serviceName]) {
        console.log(`[Price Aggregator] Опрашиваем сервис ${serviceName} для токена ${contractAddress}`);
        // Пытаемся получить цену через текущий сервис
        const price = await fetchTokenPriceFromService(serviceName, contractAddress, chainId, apiKey, coingeckoId, cmcId);
        // Если цена получена, возвращаем её
        if (price !== null && !isNaN(price) && isFinite(price)) { // Убедиться, что цена валидна
          return price;
        }
      } else {
        console.log(`[Price Aggregator] Сервис ${serviceName} отключен в конфигурации`);
      }
    }
    // Если ни один из сервисов не вернул цену
    console.warn(`[Price Aggregator] Не удалось получить цену для токена ${contractAddress} ни через один из сервисов`);
    return 0; // Возвращаем 0, если цена не найдена
  } catch (error) {
    console.error('[Price Aggregator] Критическая ошибка в fetchTokenPriceWithFallback:', error);
    return 0; // Возвращаем 0 в случае ошибки
  }
};
/**
 * Получает цены для нескольких токенов с резервными вариантами
 * @param {Array} tokens - Массив объектов токенов с полями contractAddress, chainId, apiKey, coingeckoId, cmcId
 * @param {number} chainId - ID сети (для совместимости, если нужно)
 * @returns {Promise<Array>} Массив токенов с добавленным полем priceUSD
 */
export const fetchMultipleTokenPricesWithFallback = async (tokens, chainId) => {
  try {
    console.log(`[Price Aggregator] Начинаем получение цен для ${tokens.length} токенов`);
    // Создаем массив промисов для параллельного получения цен
    const pricePromises = tokens.map(token =>
      fetchTokenPriceWithFallback(
        token.contractAddress,
        token.chainId || chainId, // Используем chainId из токена или общий chainId
        token.apiKey,
        token.coingeckoId,
        token.cmcId
      ).then(price => ({
        contractAddress: token.contractAddress,
        chainId: token.chainId || chainId,
        price: price // price может быть 0
      }))
    );
    // Ждем завершения всех промисов
    const results = await Promise.all(pricePromises);
    // Создаем маппинг адресов контрактов к ценам
    const priceMap = {};
    results.forEach(result => {
      // Используем комбинацию адреса и chainId как ключ, чтобы избежать конфликтов
      const key = `${result.contractAddress.toLowerCase()}_${result.chainId}`;
      priceMap[key] = result.price; // price может быть 0
    });
    console.log(`[Price Aggregator] Получены цены для ${Object.keys(priceMap).length} токенов`);
    // Добавляем цену к каждому токену
    const tokensWithPrices = tokens.map(token => {
        const key = `${token.contractAddress.toLowerCase()}_${token.chainId || chainId}`;
        const priceUSD = priceMap[key];
        // Добавляем цену к объекту токена
        return {
            ...token,
            priceUSD: priceUSD !== undefined ? priceUSD.toString() : '0' // Преобразуем в строку и используем '0' если undefined
        };
    });
    console.log(`[Price Aggregator] Токены с ценами сформированы`);
    return tokensWithPrices; // Возвращаем массив токенов с ценами
  } catch (error) {
    console.error('[Price Aggregator] Критическая ошибка в fetchMultipleTokenPricesWithFallback:', error);
    // Возвращаем оригинальный массив токенов без цен в случае ошибки
    return tokens.map(token => ({ ...token, priceUSD: '0' }));
  }
};
