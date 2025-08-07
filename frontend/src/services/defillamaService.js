// frontend/src/services/defillamaService.js

/**
 * Получает список токенов с DefiLlama (заглушка)
 * @returns {Promise<Array>} Пустой массив
 */
export const fetchTokens = async () => {
  console.log(`[DefiLlama Service] Получение токенов - заглушка`);
  return [];
};

/**
 * Получает цену токена с DefiLlama (заглушка)
 * @returns {Promise<number|null>} Цена токена в USD или null
 */
export const fetchTokenPrice = async () => {
  console.log(`[DefiLlama Price Service] Получение цены - заглушка`);
  return null;
};