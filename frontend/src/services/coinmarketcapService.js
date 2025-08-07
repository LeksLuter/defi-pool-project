// frontend/src/services/coinmarketcapService.js

/**
 * Получает список токенов с CoinMarketCap (заглушка)
 * @returns {Promise<Array>} Пустой массив
 */
export const fetchTokens = async () => {
  console.log(`[CoinMarketCap Service] Получение токенов - заглушка`);
  return [];
};

/**
 * Получает цену токена с CoinMarketCap (заглушка)
 * @param {string} tokenId ID токена на CoinMarketCap
 * @returns {Promise<number|null>} Цена токена в USD или null
 */
export const fetchTokenPrice = async (tokenId) => {
  if (!tokenId) return null;
  
  console.warn(`[CoinMarketCap Price Service] API не реализован для токена ${tokenId}`);
  return null;
};