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

// === ФУНКЦИИ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ ===
/**
 * Подключается к базе данных Neon
 * @returns {Promise<Client>} Клиент базы данных
 */
const connectToNeon = async () => {
  console.log('[Admin Config] Попытка подключения к Neon...');
  
  // Проверяем переменные окружения
  if (!process.env.NEON_DATABASE_URL) {
    console.error('[Admin Config] ОШИБКА: NEON_DATABASE_URL не установлен в переменных окружения');
    throw new Error('База данных не настроена: NEON_DATABASE_URL отсутствует');
  }

  try {
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await client.connect();
    console.log('[Admin Config] Успешное подключение к Neon');
    return client;
  } catch (error) {
    console.error('[Admin Config] ОШИБКА подключения к Neon:', error);
    throw new Error(`Ошибка подключения к базе данных: ${error.message}`);
  }
};

/**
 * Создает таблицу admin_configs если она не существует
 * @param {Client} client Клиент базы данных
 * @returns {Promise<void>}
 */
const createAdminConfigsTable = async (client) => {
  console.log('[Admin Config] Проверка и создание таблицы admin_configs...');
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_configs (
        address TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Admin Config] Таблица admin_configs создана или уже существует');
  } catch (error) {
    console.error('[Admin Config] ОШИБКА создания таблицы:', error);
    throw new Error(`Ошибка создания таблицы: ${error.message}`);
  }
};

/**
 * Получает конфигурацию администратора из базы данных
 * @param {string} adminAddress Адрес администратора
 * @param {Client} client Клиент базы данных
 * @returns {Promise<Object>} Объект конфигурации
 */
const getAdminConfigFromDB = async (adminAddress, client) => {
  console.log(`[Admin Config] Получение конфигурации для адреса: ${adminAddress}`);
  
  try {
    const result = await client.query(
      'SELECT config FROM admin_configs WHERE address = $1',
      [adminAddress]
    );
    
    if (result.rows.length > 0) {
      console.log(`[Admin Config] Конфигурация найдена в базе для адреса ${adminAddress}`);
      return result.rows[0].config;
    } else {
      console.log(`[Admin Config] Конфигурация не найдена в базе для адреса ${adminAddress}, возвращаем дефолтную`);
      return DEFAULT_ADMIN_CONFIG;
    }
  } catch (error) {
    console.error('[Admin Config] ОШИБКА получения конфигурации:', error);
    throw new Error(`Ошибка получения конфигурации: ${error.message}`);
  }
};

/**
 * Сохраняет конфигурацию администратора в базу данных
 * @param {string} adminAddress Адрес администратора
 * @param {Object} config Объект конфигурации
 * @param {Client} client Клиент базы данных
 * @returns {Promise<void>}
 */
const saveAdminConfigToDB = async (adminAddress, config, client) => {
  console.log(`[Admin Config] Сохранение конфигурации для адреса: ${adminAddress}`);
  
  try {
    await client.query(
      `INSERT INTO admin_configs (address, config, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (address) 
       DO UPDATE SET config = $2, updated_at = NOW()`,
      [adminAddress, config]
    );
    console.log(`[Admin Config] Конфигурация сохранена в базе для адреса ${adminAddress}`);
  } catch (error) {
    console.error('[Admin Config] ОШИБКА сохранения конфигурации:', error);
    throw new Error(`Ошибка сохранения конфигурации: ${error.message}`);
  }
};

// === КОНЕЦ ФУНКЦИЙ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ ===

/**
 * Загружает конфигурацию администратора
 * Сначала пытается загрузить с бэкенда (локальный API или Netlify Functions),
 * в случае ошибки - из localStorage.
 * Если в localStorage нет данных, возвращает дефолтную конфигурацию.
 * @param {string} [adminAddress] - Адрес кошелька администратора (для идентификации на бэкенде)
 * @returns {Promise<Object>} Объект конфигурации
 */
export const loadAdminConfig = async (adminAddress) => {
  console.log("[Admin Config] Начало загрузки конфигурации");
  console.log("[Admin Config] Адрес администратора:", adminAddress);
  
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
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Передаем адрес администратора в заголовке
          'X-Admin-Address': adminAddress,
        },
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
  } else {
    console.warn("[Admin Config] Адрес администратора не предоставлен, пропуск загрузки с сервера.");
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
 * @returns {Promise<void>}
 */
export const saveAdminConfig = async (config, adminAddress) => {
  console.log("[Admin Config] Начало сохранения конфигурации");
  console.log("[Admin Config] Конфиг для сохранения:", config);
  console.log("[Admin Config] Адрес администратора:", adminAddress);
  
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
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Передаем адрес администратора в заголовке
          'X-Admin-Address': adminAddress,
        },
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
  } else {
    console.warn("[Admin Config] Адрес администратора не предоставлен, пропуск сохранения на сервере.");
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

/**
 * Получает настройки сервисов получения токенов
 * @returns {Object} Объект с настройками сервисов токенов
 */
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

/**
 * Получает настройки сервисов получения цен
 * @returns {Object} Объект с настройками сервисов цен
 */
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

/**
 * Получает интервал обновления токенов
 * @returns {Promise<number>} Интервал обновления в минутах
 */
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

/**
 * Обновляет настройки сервисов получения токенов
 * @param {Object} newTokenServices - Новые настройки сервисов токенов
 */
export const updateTokenServicesConfig = async (newTokenServices) => {
  const currentConfig = loadAdminConfig();
  const updatedConfig = {
    ...currentConfig,
    tokenServices: { 
      ...currentConfig.tokenServices, 
      ...newTokenServices 
    }
  };
  
  // Проверяем, запущено ли приложение локально
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  // Если запущено локально, пытаемся сохранить на локальный API сервер (порт 3001 как в ваших логах)
  if (isLocalhost) {
    try {
      console.log("[Admin Config] Приложение запущено локально, пытаемся сохранить настройки токенов на локальный API сервер...");
      
      // Используем правильный порт 3001 для локального API сервера
      const response = await fetch('http://localhost:3001/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("[Admin Config] Настройки токенов успешно сохранены на локальный API сервер:", result);
        
        // Сохраняем в localStorage как резервную копию
        saveAdminConfig(updatedConfig);
        
        // Отправляем кастомное событие для синхронизации между вкладками
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: updatedConfig }));
        }
        
        return;
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Config] Локальный API сервер вернул ошибку при сохранении настроек токенов: ${response.status} ${response.statusText}. Текст: ${errorText}`);
      }
    } catch (localApiError) {
      console.error("[Admin Config] Ошибка при сохранении настроек токенов на локальный API сервер:", localApiError);
      // Продолжаем к сохранению в localStorage как резерв
    }
  }
  
  // Сохранение в localStorage (резервный вариант)
  saveAdminConfig(updatedConfig);
  console.log("[Admin Config] Обновлены настройки токенов:", updatedConfig.tokenServices);
};

/**
 * Обновляет настройки сервисов получения цен
 * @param {Object} newPriceServices - Новые настройки сервисов цен
 */
export const updatePriceServicesConfig = async (newPriceServices) => {
  const currentConfig = loadAdminConfig();
  const updatedConfig = {
    ...currentConfig,
    priceServices: { 
      ...currentConfig.priceServices, 
      ...newPriceServices 
    }
  };
  
  // Проверяем, запущено ли приложение локально
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  // Если запущено локально, пытаемся сохранить на локальный API сервер (порт 3001 как в ваших логах)
  if (isLocalhost) {
    try {
      console.log("[Admin Config] Приложение запущено локально, пытаемся сохранить настройки цен на локальный API сервер...");
      
      // Используем правильный порт 3001 для локального API сервера
      const response = await fetch('http://localhost:3001/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("[Admin Config] Настройки цен успешно сохранены на локальный API сервер:", result);
        
        // Сохраняем в localStorage как резервную копию
        saveAdminConfig(updatedConfig);
        
        // Отправляем кастомное событие для синхронизации между вкладками
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: updatedConfig }));
        }
        
        return;
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Config] Локальный API сервер вернул ошибку при сохранении настроек цен: ${response.status} ${response.statusText}. Текст: ${errorText}`);
      }
    } catch (localApiError) {
      console.error("[Admin Config] Ошибка при сохранении настроек цен на локальный API сервер:", localApiError);
      // Продолжаем к сохранению в localStorage как резерв
    }
  }
  
  // Сохранение в localStorage (резервный вариант)
  saveAdminConfig(updatedConfig);
  console.log("[Admin Config] Обновлены настройки цен:", updatedConfig.priceServices);
};

/**
 * Обновляет интервал обновления
 * @param {number} newInterval - Новый интервал в минутах
 */
export const updateUpdateIntervalMinutes = async (newInterval) => {
  const currentConfig = loadAdminConfig();
  const updatedConfig = {
    ...currentConfig,
    updateIntervalMinutes: newInterval
  };
  
  // Проверяем, запущено ли приложение локально
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  // Если запущено локально, пытаемся сохранить на локальный API сервер (порт 3001 как в ваших логах)
  if (isLocalhost) {
    try {
      console.log("[Admin Config] Приложение запущено локально, пытаемся сохранить интервал обновления на локальный API сервер...");
      
      // Используем правильный порт 3001 для локального API сервера
      const response = await fetch('http://localhost:3001/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("[Admin Config] Интервал обновления успешно сохранен на локальный API сервер:", result);
        
        // Сохраняем в localStorage как резервную копию
        saveAdminConfig(updatedConfig);
        
        // Отправляем кастомное событие для синхронизации между вкладками
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: updatedConfig }));
        }
        
        return;
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Config] Локальный API сервер вернул ошибку при сохранении интервала: ${response.status} ${response.statusText}. Текст: ${errorText}`);
      }
    } catch (localApiError) {
      console.error("[Admin Config] Ошибка при сохранении интервала обновления на локальный API сервер:", localApiError);
      // Продолжаем к сохранению в localStorage как резерв
    }
  }
  
  // Сохранение в localStorage (резервный вариант)
  saveAdminConfig(updatedConfig);
  console.log("[Admin Config] Обновлен интервал обновления:", newInterval);
};

// Экспортируем дефолтные значения для использования в компонентах
export default DEFAULT_ADMIN_CONFIG;