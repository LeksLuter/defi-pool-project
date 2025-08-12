// frontend/src/services/localApiService.js
// Сервис для работы с локальным API в среде разработки
// Все запросы к локальному API обрабатываются в этом файле

const LOCAL_API_BASE_URL = 'http://localhost:3000/api';

/**
 * Получает конфигурацию администратора с локального API
 * @param {string} adminAddress Адрес кошелька администратора
 * @returns {Promise<Object>} Объект конфигурации
 */
export const getAdminConfigFromLocalAPI = async (adminAddress) => {
  try {
    console.log(`[Local API Service] Попытка получения конфигурации администратора ${adminAddress} с локального API...`);
    
    const response = await fetch(`${LOCAL_API_BASE_URL}/admin/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Address': adminAddress,
      },
      signal: AbortSignal.timeout(10000) // 10 секунд таймаут
    });
    
    console.log("[Local API Service] Ответ от локального API:", response.status, response.statusText);
    
    if (response.ok) {
      const config = await response.json();
      console.log("[Local API Service] Конфигурация успешно получена с локального API:", config);
      return config;
    } else {
      const errorText = await response.text();
      console.warn(`[Local API Service] Локальный API вернул ошибку: ${response.status} ${response.statusText}. Текст: ${errorText}`);
      throw new Error(`Локальный API вернул ошибку: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("[Local API Service] Ошибка при получении конфигурации с локального API:", error);
    throw error;
  }
};

/**
 * Сохраняет конфигурацию администратора на локальный API
 * @param {Object} config Объект конфигурации для сохранения
 * @param {string} adminAddress Адрес кошелька администратора
 * @returns {Promise<Object>} Результат сохранения
 */
export const saveAdminConfigToLocalAPI = async (config, adminAddress) => {
  try {
    console.log(`[Local API Service] Попытка сохранения конфигурации администратора ${adminAddress} на локальный API...`);
    
    const response = await fetch(`${LOCAL_API_BASE_URL}/admin/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Address': adminAddress,
      },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(10000) // 10 секунд таймаут
    });
    
    console.log("[Local API Service] Ответ от сохранения на локальный API:", response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log("[Local API Service] Конфигурация успешно сохранена на локальный API:", result);
      return result;
    } else {
      const errorText = await response.text();
      console.warn(`[Local API Service] Локальный API вернул ошибку при сохранении: ${response.status} ${response.statusText}. Текст: ${errorText}`);
      throw new Error(`Локальный API вернул ошибку при сохранении: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("[Local API Service] Ошибка при сохранении конфигурации на локальный API:", error);
    throw error;
  }
};

/**
 * Проверяет доступность локального API
 * @returns {Promise<boolean>} True если API доступен, false если нет
 */
export const isLocalAPIAvailable = async () => {
  try {
    console.log("[Local API Service] Проверка доступности локального API...");
    
    const response = await fetch(`${LOCAL_API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 секунд таймаут
    });
    
    const isAvailable = response.ok;
    console.log(`[Local API Service] Локальный API ${isAvailable ? 'доступен' : 'недоступен'}`);
    return isAvailable;
  } catch (error) {
    console.error("[Local API Service] Ошибка при проверке доступности локального API:", error);
    return false;
  }
};