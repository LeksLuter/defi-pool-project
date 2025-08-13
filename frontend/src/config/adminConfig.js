// frontend/src/config/adminConfig.js
// Централизованный файл конфигурации администратора
// Все настройки администратора хранятся в этом файле
// === КОНСТАНТЫ ===
const ADMIN_CONFIG_KEY = 'defiPool_adminConfig';
const DEFAULT_ADMIN_CONFIG = {
  // Настройки сервисов получения токенов
  tokenServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
    CoinMarketCap: true,
  },
  // Настройки сервисов получения цен
  priceServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
    CoinMarketCap: true,
  },
  // Интервал обновления токенов в минутах
  updateIntervalMinutes: 10,
};
// === КОНЕЦ КОНСТАНТ ===
/**
 * Загружает конфигурацию администратора
 * Сначала пытается загрузить с бэкенда (локальный API или Netlify Functions),
 * в случае ошибки - из localStorage.
 * Если в localStorage нет данных, возвращает дефолтную конфигурацию.
 * @param {string} [adminAddress] - Адрес кошелька администратора (для идентификации на бэкенде)
 * @param {string} [userAddress] - Адрес кошелька пользователя (для идентификации на бэкенде)
 * @returns {Promise<Object>} Объект конфигурации
 */
export const loadAdminConfig = async (adminAddress, userAddress) => {
  console.log("[Admin Config] Начало загрузки конфигурации");
  console.log("[Admin Config] Адрес администратора:", adminAddress);
  console.log("[Admin Config] Адрес пользователя:", userAddress);
  
  // 1. Попытка загрузки с бэкенда (локальный API или Netlify Functions)
  if (adminAddress) {
    try {
      console.log(`[Admin Config] Попытка загрузки конфигурации с сервера для ${adminAddress}...`);
      // Определяем URL для API в зависимости от среды выполнения
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        // Проверяем, запущено ли приложение локально
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          // Для локальной разработки используем локальный API (порт 3001 как в ваших логах)
          apiUrl = 'http://localhost:3001/api/admin/config';
          console.log("[Admin Config] Приложение запущено локально, используем локальный API:", apiUrl);
        } else {
          // Для продакшена используем Netlify Functions
          apiUrl = '/.netlify/functions/getConfig';
          console.log("[Admin Config] Приложение запущено в продакшене, используем Netlify Functions:", apiUrl);
        }
      } else {
        // Для SSR или Node.js используем Netlify Functions
        apiUrl = '/.netlify/functions/getConfig';
        console.log("[Admin Config] Приложение запущено в SSR/Node.js, используем Netlify Functions:", apiUrl);
      }
      
      const headers = {
        'Content-Type': 'application/json',
        // Передаем адрес администратора в заголовке
        'X-Admin-Address': adminAddress,
      };
      
      // Если есть адрес пользователя, передаем его тоже
      if (userAddress) {
        headers['X-User-Address'] = userAddress;
      }
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
        // Добавим таймаут для сетевых запросов
        signal: AbortSignal.timeout(10000) // 10 секунд
      });
      console.log("[Admin Config] Ответ от сервера:", response.status, response.statusText);
      if (response.ok) {
        const serverConfig = await response.json();
        console.log("[Admin Config] Конфигурация успешно загружена с сервера:", serverConfig);
        // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
        const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...serverConfig };
        // Сохраняем в localStorage как резервную копию
        try {
          localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(mergedConfig));
          console.log("[Admin Config] Конфигурация сохранена в localStorage как резерв");
        } catch (storageError) {
          console.error("[Admin Config] Ошибка при сохранении в localStorage:", storageError);
        }
        return mergedConfig;
      } else if (response.status === 404) {
        console.log("[Admin Config] Конфигурация на сервере не найдена, будет использована дефолтная или локальная.");
        // Продолжаем к локальной загрузке
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Config] Сервер вернул ошибку при загрузке конфига: ${response.status} ${response.statusText}. Текст: ${errorText}`);
      }
    } catch (e) {
      console.error("[Admin Config] Ошибка сети при загрузке конфигурации с сервера:", e);
      // Продолжаем к локальной загрузке
    }
  } else if (userAddress) {
    // Для обычных пользователей загружаем конфигурацию
    try {
      console.log(`[Admin Config] Попытка загрузки конфигурации с сервера для пользователя ${userAddress}...`);
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          apiUrl = 'http://localhost:3001/api/admin/config';
          console.log("[Admin Config] Приложение запущено локально, используем локальный API для пользователя:", apiUrl);
        } else {
          apiUrl = '/.netlify/functions/getConfig';
          console.log("[Admin Config] Приложение запущено в продакшене, используем Netlify Functions для пользователя:", apiUrl);
        }
      } else {
        apiUrl = '/.netlify/functions/getConfig';
        console.log("[Admin Config] Приложение запущено в SSR/Node.js, используем Netlify Functions для пользователя:", apiUrl);
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Address': userAddress,
      };
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
        signal: AbortSignal.timeout(10000)
      });
      
      console.log("[Admin Config] Ответ от сервера для пользователя:", response.status, response.statusText);
      if (response.ok) {
        const serverConfig = await response.json();
        console.log("[Admin Config] Конфигурация успешно загружена с сервера для пользователя:", serverConfig);
        const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...serverConfig };
        try {
          localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(mergedConfig));
          console.log("[Admin Config] Конфигурация сохранена в localStorage как резерв для пользователя");
        } catch (storageError) {
          console.error("[Admin Config] Ошибка при сохранении в localStorage:", storageError);
        }
        return mergedConfig;
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Config] Сервер вернул ошибку при загрузке конфига для пользователя: ${response.status} ${response.statusText}. Текст: ${errorText}`);
      }
    } catch (e) {
      console.error("[Admin Config] Ошибка сети при загрузке конфигурации с сервера для пользователя:", e);
    }
  } else {
    console.warn("[Admin Config] Адрес администратора и пользователя не предоставлены, пропуск загрузки с сервера.");
  }
  
  // 2. Загрузка из localStorage (резервный вариант)
  try {
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    console.log(`[Admin Config] Попытка загрузки из localStorage: ${configStr ? 'Найдено' : 'Не найдено'}`);
    if (configStr) {
      const parsedConfig = JSON.parse(configStr);
      console.log("[Admin Config] Конфигурация загружена из localStorage:", parsedConfig);
      // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
      const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...parsedConfig };
      // Отправляем кастомное событие для синхронизации между вкладками
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: mergedConfig }));
      }
      return mergedConfig;
    }
  } catch (e) {
    console.error("[Admin Config] Ошибка при загрузке конфигурации администратора из localStorage:", e);
  }
  
  // 3. Возврат дефолтной конфигурации, если ничего не удалось загрузить
  console.log("[Admin Config] Конфигурация не найдена ни на сервере, ни в localStorage. Используется дефолтная.");
  // Отправляем кастомное событие для синхронизации между вкладками
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: DEFAULT_ADMIN_CONFIG }));
  }
  return { ...DEFAULT_ADMIN_CONFIG };
};

/**
 * Сохраняет конфигурацию администратора
 * Сначала пытается сохранить на бэкенде (локальный API или Netlify Functions),
 * затем сохраняет в localStorage.
 * @param {Object} config - Объект конфигурации для сохранения
 * @param {string} [adminAddress] - Адрес кошелька администратора (для идентификации на бэкенде)
 * @param {string} [userAddress] - Адрес кошелька пользователя (для идентификации на бэкенде)
 * @returns {Promise<void>}
 */
export const saveAdminConfig = async (config, adminAddress, userAddress) => {
  console.log("[Admin Config] Начало сохранения конфигурации");
  console.log("[Admin Config] Конфиг для сохранения:", config);
  console.log("[Admin Config] Адрес администратора:", adminAddress);
  console.log("[Admin Config] Адрес пользователя:", userAddress);
  
  // 1. Попытка сохранения на бэкенде (локальный API или Netlify Functions)
  if (adminAddress) {
    try {
      console.log(`[Admin Config] Попытка сохранения конфигурации на сервере (локальный API или Netlify Functions) для ${adminAddress}...`);
      // Определяем URL для API в зависимости от среды выполнения
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        // Проверяем, запущено ли приложение локально
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          // Для локальной разработки используем локальный API (порт 3001 как в ваших логах)
          apiUrl = 'http://localhost:3001/api/admin/config';
          console.log("[Admin Config] Приложение запущено локально, используем локальный API для сохранения:", apiUrl);
        } else {
          // Для продакшена используем Netlify Functions
          apiUrl = '/.netlify/functions/saveConfig';
          console.log("[Admin Config] Приложение запущено в продакшене, используем Netlify Functions для сохранения:", apiUrl);
        }
      } else {
        // Для SSR или Node.js используем Netlify Functions
        apiUrl = '/.netlify/functions/saveConfig';
        console.log("[Admin Config] Приложение запущено в SSR/Node.js, используем Netlify Functions для сохранения:", apiUrl);
      }
      
      const headers = {
        'Content-Type': 'application/json',
        // Передаем адрес администратора в заголовке
        'X-Admin-Address': adminAddress,
      };
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(config),
        // Добавим таймаут для сетевых запросов
        signal: AbortSignal.timeout(10000) // 10 секунд
      });
      console.log("[Admin Config] Ответ от сохранения:", response.status, response.statusText);
      if (response.ok) {
        const result = await response.json();
        console.log("[Admin Config] Конфигурация успешно сохранена на сервере (локальный API или Netlify Functions):", result);
        // Отправляем кастомное событие для синхронизации между вкладками
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: config }));
        }
        // Сохраняем в localStorage как резервную копию
        try {
          localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
          console.log("[Admin Config] Конфигурация сохранена в localStorage как резерв");
        } catch (storageError) {
          console.error("[Admin Config] Ошибка при сохранении в localStorage:", storageError);
        }
        return; // Успешно сохранено на сервере
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Config] Сервер (локальный API или Netlify Functions) вернул ошибку при сохранении конфига: ${response.status} ${response.statusText}. Текст: ${errorText}`);
      }
    } catch (e) {
      console.error("[Admin Config] Ошибка сети при сохранении конфигурации на сервер (локальный API или Netlify Functions):", e);
      // Продолжаем к локальному сохранению как резерв
    }
  } else if (userAddress) {
    // Для обычных пользователей сохраняем только в localStorage
    try {
      console.log(`[Admin Config] Сохранение конфигурации только в localStorage для пользователя ${userAddress}...`);
      localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
      console.log("[Admin Config] Конфигурация успешно сохранена в localStorage (резерв) для пользователя.");
      // Отправляем кастомное событие для синхронизации между вкладками
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: config }));
      }
    } catch (e) {
      console.error("[Admin Config] Ошибка при сохранении конфигурации пользователя в localStorage:", e);
      throw new Error("Не удалось сохранить конфигурацию в localStorage для пользователя.");
    }
    return;
  } else {
    console.warn("[Admin Config] Адрес администратора и пользователя не предоставлены, пропуск сохранения на сервере.");
  }
  
  // 2. Сохранение в localStorage (резервный вариант)
  try {
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
    console.log("[Admin Config] Конфигурация успешно сохранена в localStorage (резерв).");
    // Отправляем кастомное событие для синхронизации между вкладками
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: config }));
    }
  } catch (e) {
    console.error("[Admin Config] Ошибка при сохранении конфигурации администратора в localStorage:", e);
    throw new Error("Не удалось сохранить конфигурацию ни на сервере (локальный API или Netlify Functions), ни локально.");
  }
};

// Обновляем функции для получения настроек сервисов
export const getTokenServicesConfig = () => {
  try {
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (configStr) {
      const parsedConfig = JSON.parse(configStr);
      console.log("[Admin Config] Загруженная конфигурация токенов:", parsedConfig.tokenServices);
      // Проверяем, что tokenServices существует и является объектом
      if (parsedConfig.tokenServices && typeof parsedConfig.tokenServices === 'object') {
        return parsedConfig.tokenServices;
      }
    }
  } catch (e) {
    console.error("[Admin Config] Ошибка при получении tokenServices из localStorage:", e);
  }
  console.log("[Admin Config] tokenServices не найден или не является объектом, возвращаем дефолт");
  return DEFAULT_ADMIN_CONFIG.tokenServices;
};

export const getPriceServicesConfig = () => {
  try {
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (configStr) {
      const parsedConfig = JSON.parse(configStr);
      console.log("[Admin Config] Загруженная конфигурация цен:", parsedConfig.priceServices);
      // Проверяем, что priceServices существует и является объектом
      if (parsedConfig.priceServices && typeof parsedConfig.priceServices === 'object') {
        return parsedConfig.priceServices;
      }
    }
  } catch (e) {
    console.error("[Admin Config] Ошибка при получении priceServices из localStorage:", e);
  }
  console.log("[Admin Config] priceServices не найден или не является объектом, возвращаем дефолт");
  return DEFAULT_ADMIN_CONFIG.priceServices;
};

export const getUpdateIntervalMinutes = async () => {
  try {
    // Проверяем, запущено ли приложение локально
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    // Если запущено локально, пытаемся загрузить с локального API сервера (порт 3001 как в ваших логах)
    if (isLocalhost) {
      console.log("[Admin Config] Приложение запущено локально, пытаемся загрузить интервал обновления с локального API сервера...");
      try {
        // Используем правильный порт 3001 для локального API сервера
        const response = await fetch('http://localhost:3001/api/admin/config', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const serverConfig = await response.json();
          console.log("[Admin Config] Интервал обновления успешно загружен с локального API сервера:", serverConfig.updateIntervalMinutes);
          // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
          const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...serverConfig };
          // Сохраняем в localStorage как резервную копию
          localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(mergedConfig));
          return mergedConfig.updateIntervalMinutes;
        } else {
          console.warn(`[Admin Config] Локальный API сервер вернул ошибку при загрузке интервала: ${response.status} ${response.statusText}`);
        }
      } catch (localApiError) {
        console.error("[Admin Config] Ошибка при загрузке интервала обновления с локального API сервера:", localApiError);
        // Продолжаем к загрузке из localStorage
      }
    }
    
    // Загружаем из localStorage (резервный вариант)
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (configStr) {
      const parsedConfig = JSON.parse(configStr);
      const interval = parsedConfig.updateIntervalMinutes;
      console.log("[Admin Config] Интервал обновления из localStorage:", interval);
      return interval !== undefined ? interval : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
    }
  } catch (e) {
    console.error("[Admin Config] Ошибка при загрузке интервала обновления из localStorage:", e);
  }
  console.log("[Admin Config] Интервал обновления не найден, используем дефолтный");
  return DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
};

// Функции обновления настроек (для администраторов)
export const updateTokenServicesConfig = async (newTokenServices, adminAddress) => {
  const currentConfig = loadAdminConfig();
  const updatedConfig = {
    ...currentConfig,
    tokenServices: { 
      ...currentConfig.tokenServices, 
      ...newTokenServices 
    }
  };
  // Сохраняем в базу данных
  await saveAdminConfig(updatedConfig, adminAddress);
  console.log("[Admin Config] Обновлены настройки токенов:", updatedConfig.tokenServices);
};

export const updatePriceServicesConfig = async (newPriceServices, adminAddress) => {
  const currentConfig = loadAdminConfig();
  const updatedConfig = {
    ...currentConfig,
    priceServices: { 
      ...currentConfig.priceServices, 
      ...newPriceServices 
    }
  };
  // Сохраняем в базу данных
  await saveAdminConfig(updatedConfig, adminAddress);
  console.log("[Admin Config] Обновлены настройки цен:", updatedConfig.priceServices);
};

export const updateUpdateIntervalMinutes = async (newInterval, adminAddress) => {
  const currentConfig = loadAdminConfig();
  const updatedConfig = {
    ...currentConfig,
    updateIntervalMinutes: newInterval
  };
  // Сохраняем в базу данных
  await saveAdminConfig(updatedConfig, adminAddress);
  console.log("[Admin Config] Обновлен интервал обновления:", newInterval);
};

// Экспортируем дефолтные значения для использования в компонентах
export default DEFAULT_ADMIN_CONFIG;