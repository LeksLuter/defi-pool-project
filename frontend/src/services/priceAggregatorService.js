// frontend/src/services/priceAggregatorService.js
import * as etherscanV2Service from './etherscanV2Service';
import * as coingeckoService from './coingeckoService';
import * as coinmarketcapService from './coinmarketcapService';
import * as alchemyService from './alchemyService';
import * as defillamaService from './defillamaService';
import { getPriceServicesConfig } from '../config/adminConfig';
import { SUPPORTED_CHAINS } from '../config/supportedChains';
import { saveTokensToCache, getCachedTokens, isCacheExpired } from './cacheService';
import { setLastUpdateTime, canPerformBackgroundUpdate } from './cacheService';

// === КОНСТАНТЫ ===
const MIN_UPDATE_INTERVAL_MS = 30000;
const CACHE_PREFIX = 'defi_pool_prices';
const DEFAULT_CACHE_EXPIRY_MINUTES = 5;
const MIN_TOKEN_VALUE_USD = 0.1;
// === КОНЕЦ КОНСТАНТ ===

/**
 * Получает цену токена с резервными вариантами (fallback)
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
        let servicePrice = null;
        
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
            if (coingeckoId) {
              servicePrice = await coingeckoService.fetchTokenPrice(coingeckoId, apiKey);
            } else {
              console.warn(`[Price Aggregator] Не удалось получить CoinGecko ID для токена ${contractAddress}`);
            }
            break;
          case 'CoinMarketCap':
            if (cmcId) {
              servicePrice = await coinmarketcapService.fetchTokenPrice(cmcId, apiKey);
            }
            break;
          default:
            console.warn(`[Price Aggregator] Неизвестный сервис: ${serviceName}`);
            servicePrice = null;
        }
        
        // Проверяем, получили ли мы корректную цену
        if (servicePrice !== null && !isNaN(servicePrice) && servicePrice > 0) {
          console.log(`[Price Aggregator] Цена для токена ${contractAddress} получена через ${serviceName}: $${servicePrice}`);
          return servicePrice;
        } else {
          console.log(`[Price Aggregator] Сервис ${serviceName} не вернул корректную цену для токена ${contractAddress}. Получено: ${servicePrice}`);
        }
      } else {
        console.log(`[Price Aggregator] Сервис ${serviceName} отключен в конфигурации`);
      }
    }
    
    // Если ни один из сервисов не вернул цену
    console.warn(`[Price Aggregator] Не удалось получить цену для токена ${contractAddress} ни через один из сервисов`);
    return 0;
  } catch (error) {
    console.error('[Price Aggregator] Критическая ошибка в fetchTokenPriceWithFallback:', error);
    return 0;
  }
};

/**
 * Получает цены для нескольких токенов с резервными вариантами
 * @param {Array} tokens - Массив объектов токенов с полями contractAddress, chainId, apiKey, coingeckoId, cmcId
 * @param {number} chainId - ID сети
 * @returns {Promise<Object>} Объект с маппингом адресов контрактов к ценам
 */
export const fetchMultipleTokenPricesWithFallback = async (tokens, chainId) => {
  try {
    console.log(`[Price Aggregator] Начинаем получение цен для ${tokens.length} токенов`);
    
    // Создаем массив промисов для параллельного получения цен
    const pricePromises = tokens.map(token => 
      fetchTokenPriceWithFallback(
        token.contractAddress,
        token.chainId || chainId,
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
    
    console.log(`[Price Aggregator] Получены цены для ${Object.keys(prices).length} токенов`);
    return prices;
  } catch (error) {
    console.error('[Price Aggregator] Критическая ошибка в fetchMultipleTokenPricesWithFallback:', error);
    // Возвращаем пустой объект в случае ошибки
    return {};
  }
};

/**
 * Получает токены с ценами и объединяет их
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
    const tokensWithPrices = tokens.map(token => {
      const price = prices[token.contractAddress] || 0;
      return {
        ...token,
        price: price
      };
    });
    
    console.log(`[Price Aggregator] Получено ${tokensWithPrices.length} токенов с ценами`);
    return tokensWithPrices;
  } catch (error) {
    console.error('[Price Aggregator] Критическая ошибка в fetchTokensWithPrices:', error);
    throw error;
  }
};