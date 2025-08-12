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
 * Проверяет существование таблицы admin_configs в базе данных
 * @param {string} connectionString - Строка подключения к базе данных
 * @returns {Promise<boolean>} true если таблица существует, false если нет
 */
const checkTableExists = async (connectionString) => {
  try {
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    await client.connect();
    
    // Проверяем существование таблицы
    const result = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_configs')"
    );
    
    await client.end();
    return result.rows[0].exists;
  } catch (error) {
    console.error('[Admin Config] Ошибка при проверке существования таблицы:', error);
    return false;
  }
};

/**
 * Создает таблицу admin_configs если она не существует
 * @param {string} connectionString - Строка подключения к базе данных
 * @returns {Promise<void>}
 */
const createAdminConfigsTable = async (connectionString) => {
  try {
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    await client.connect();
    
    // Создаем таблицу если она не существует
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_configs (
        address TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('[Admin Config] Таблица admin_configs создана или уже существует');
    await client.end();
  } catch (error) {
    console.error('[Admin Config] Ошибка при создании таблицы admin_configs:', error);
    throw error;
  }
};

/**
 * Получает конфигурацию администратора из базы данных
 * @param {string} adminAddress Адрес администратора
 * @param {string} connectionString Строка подключения к базе данных
 * @returns {Promise<Object>} Объект конфигурации
 */
const getAdminConfigFromDB = async (adminAddress, connectionString) => {
  try {
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    await client.connect();
    
    // Проверяем существование таблицы перед запросом
    const tableExists = await checkTableExists(connectionString);
    if (!tableExists) {
      console.log('[Admin Config] Таблица admin_configs не существует, создаем её');
      await createAdminConfigsTable(connectionString);
    }
    
    // Получаем конфигурацию из базы данных
    const result = await client.query(
      'SELECT config FROM admin_configs WHERE address = $1',
      [adminAddress]
    );
    
    await client.end();
    
    if (result.rows.length > 0) {
      console.log(`[Admin Config] Конфигурация найдена в базе для адреса ${adminAddress}`);
      return result.rows[0].config;
    } else {
      console.log(`[Admin Config] Конфигурация не найдена в базе для адреса ${adminAddress}, возвращаем дефолтную`);
      return DEFAULT_ADMIN_CONFIG;
    }
  } catch (error) {
    console.error('[Admin Config] Ошибка при получении конфигурации из базы:', error);
    // В случае ошибки возвращаем дефолтную конфигурацию
    return DEFAULT_ADMIN_CONFIG;
  }
};

/**
 * Сохраняет конфигурацию администратора в базу данных
 * @param {string} adminAddress Адрес администратора
 * @param {Object} config Объект конфигурации
 * @param {string} connectionString Строка подключения к базе данных
 * @returns {Promise<void>}
 */
const saveAdminConfigToDB = async (adminAddress, config, connectionString) => {
  try {
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    await client.connect();
    
    // Проверяем существование таблицы перед сохранением
    const tableExists = await checkTableExists(connectionString);
    if (!tableExists) {
      console.log('[Admin Config] Таблица admin_configs не существует, создаем её');
      await createAdminConfigsTable(connectionString);
    }
    
    // Сохраняем конфигурацию в базу данных
    await client.query(
      `INSERT INTO admin_configs (address, config, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (address) 
       DO UPDATE SET config = $2, updated_at = NOW()`,
      [adminAddress, config]
    );
    
    console.log(`[Admin Config] Конфигурация сохранена в базе для адреса ${adminAddress}`);
    await client.end();
  } catch (error) {
    console.error('[Admin Config] Ошибка при сохранении конфигурации в базу:', error);
    throw error;
  }
};

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
  
  // Проверяем наличие переменной окружения для подключения к базе данных
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    console.warn("[Admin Config] NEON_DATABASE_URL не установлен в переменных окружения");
    // Возвращаем дефолтную конфигурацию, если нет строки подключения
    return { ...DEFAULT_ADMIN_CONFIG };
  }

  // 1. Попытка загрузки с бэкенда (Netlify Functions)
  if (adminAddress) {
    try {
      console.log(`[Admin Config] Попытка загрузки конфигурации с сервера для ${adminAddress}...`);
      // Определяем URL для API в зависимости от среды выполнения
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        // Для продакшена используем Netlify Functions
        apiUrl = '/.netlify/functions/getConfig';
        console.log("[Admin Config] Приложение запущено в продакшене, используем Netlify Functions:", apiUrl);
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
  
  // 3. Попытка загрузки из базы данных Neon
  try {
    console.log("[Admin Config] Попытка загрузки конфигурации из базы данных Neon...");
    const dbConfig = await getAdminConfigFromDB(adminAddress, connectionString);
    console.log("[Admin Config] Конфигурация успешно загружена из базы данных:", dbConfig);
    
    // Сохраняем в localStorage как резервную копию
    try {
      localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(dbConfig));
      console.log("[Admin Config] Конфигурация сохранена в localStorage как резерв");
    } catch (storageError) {
      console.error("[Admin Config] Ошибка при сохранении в localStorage:", storageError);
    }
    
    // Отправляем кастомное событие для синхронизации между вкладками
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: dbConfig }));
    }
    
    return dbConfig;
  } catch (dbError) {
    console.error("[Admin Config] Ошибка при загрузке конфигурации из базы данных:", dbError);
  }
  
  // 4. Возврат дефолтной конфигурации, если ничего не удалось загрузить
  console.log("[Admin Config] Конфигурация не найдена ни на сервере, ни в localStorage, ни в базе данных. Используется дефолтная.");
  // Отправляем кастомное событие для синхронизации между вкладками
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: DEFAULT_ADMIN_CONFIG }));
  }
  return { ...DEFAULT_ADMIN_CONFIG };
};

/**
 * Сохраняет конфигурацию администратора
 * Сначала пытается сохранить на бэкенде (Netlify Functions),
 * затем сохраняет в localStorage.
 * @param {Object} config - Объект конфигурации для сохранения
 * @param {string} [adminAddress] - Адрес кошелька администратора (для идентификации на бэкенде)
 * @returns {Promise<void>}
 */
export const saveAdminConfig = async (config, adminAddress) => {
  console.log("[Admin Config] Начало сохранения конфигурации");
  console.log("[Admin Config] Конфиг для сохранения:", config);
  console.log("[Admin Config] Адрес администратора:", adminAddress);
  
  // Проверяем наличие переменной окружения для подключения к базе данных
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    console.warn("[Admin Config] NEON_DATABASE_URL не установлен в переменных окружения");
    // Продолжаем сохранение в localStorage
  }

  // 1. Попытка сохранения на бэкенде (Netlify Functions)
  if (adminAddress) {
    try {
      console.log(`[Admin Config] Попытка сохранения конфигурации на сервере (Netlify Functions) для ${adminAddress}...`);
      // Определяем URL для API в зависимости от среды выполнения
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        // Для продакшена используем Netlify Functions
        apiUrl = '/.netlify/functions/saveConfig';
        console.log("[Admin Config] Приложение запущено в продакшене, используем Netlify Functions для сохранения:", apiUrl);
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
        console.log("[Admin Config] Конфигурация успешно сохранена на сервере (Netlify Functions):", result);
        
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
        console.warn(`[Admin Config] Сервер (Netlify Functions) вернул ошибку при сохранении конфига: ${response.status} ${response.statusText}. Текст: ${errorText}`);
      }
    } catch (e) {
      console.error("[Admin Config] Ошибка сети при сохранении конфигурации на сервер (Netlify Functions):", e);
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
    throw new Error("Не удалось сохранить конфигурацию ни на сервере (Netlify Functions), ни локально.");
  }
  
  // 3. Попытка сохранения в базу данных Neon
  if (adminAddress && connectionString) {
    try {
      console.log("[Admin Config] Попытка сохранения конфигурации в базу данных Neon...");
      await saveAdminConfigToDB(adminAddress, config, connectionString);
      console.log("[Admin Config] Конфигурация успешно сохранена в базе данных Neon");
    } catch (dbError) {
      console.error("[Admin Config] Ошибка при сохранении конфигурации в базу данных:", dbError);
    }
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
  const currentConfig = await loadAdminConfig(); // Используем асинхронный метод
  const updatedConfig = {
    ...currentConfig,
    tokenServices: { 
      ...currentConfig.tokenServices, 
      ...newTokenServices 
    }
  };
  
  // Сохраняем в базу данных и localStorage
  try {
    const connectionString = process.env.NEON_DATABASE_URL;
    if (connectionString) {
      console.log("[Admin Config] Сохраняем настройки токенов в базу данных...");
      // Здесь нужно будет использовать текущий adminAddress, но у нас нет его в этом методе
      // Поэтому мы сохраним только в localStorage как резерв
    }
    
    // Сохраняем в localStorage как резервную копию
    saveAdminConfig(updatedConfig);
    console.log("[Admin Config] Обновлены настройки токенов:", updatedConfig.tokenServices);
  } catch (error) {
    console.error("[Admin Config] Ошибка при обновлении настроек токенов:", error);
  }
};

/**
 * Обновляет настройки сервисов получения цен
 * @param {Object} newPriceServices - Новые настройки сервисов цен
 */
export const updatePriceServicesConfig = async (newPriceServices) => {
  const currentConfig = await loadAdminConfig(); // Используем асинхронный метод
  const updatedConfig = {
    ...currentConfig,
    priceServices: { 
      ...currentConfig.priceServices, 
      ...newPriceServices 
    }
  };
  
  // Сохраняем в базу данных и localStorage
  try {
    const connectionString = process.env.NEON_DATABASE_URL;
    if (connectionString) {
      console.log("[Admin Config] Сохраняем настройки цен в базу данных...");
      // Здесь нужно будет использовать текущий adminAddress, но у нас нет его в этом методе
      // Поэтому мы сохраним только в localStorage как резерв
    }
    
    // Сохраняем в localStorage как резервную копию
    saveAdminConfig(updatedConfig);
    console.log("[Admin Config] Обновлены настройки цен:", updatedConfig.priceServices);
  } catch (error) {
    console.error("[Admin Config] Ошибка при обновлении настроек цен:", error);
  }
};

/**
 * Обновляет интервал обновления
 * @param {number} newInterval - Новый интервал в минутах
 */
export const updateUpdateIntervalMinutes = async (newInterval) => {
  const currentConfig = await loadAdminConfig(); // Используем асинхронный метод
  const updatedConfig = {
    ...currentConfig,
    updateIntervalMinutes: newInterval
  };
  
  // Сохраняем в базу данных и localStorage
  try {
    const connectionString = process.env.NEON_DATABASE_URL;
    if (connectionString) {
      console.log("[Admin Config] Сохраняем интервал обновления в базу данных...");
      // Здесь нужно будет использовать текущий adminAddress, но у нас нет его в этом методе
      // Поэтому мы сохраним только в localStorage как резерв
    }
    
    // Сохраняем в localStorage как резервную копию
    saveAdminConfig(updatedConfig);
    console.log("[Admin Config] Обновлен интервал обновления:", newInterval);
  } catch (error) {
    console.error("[Admin Config] Ошибка при обновлении интервала обновления:", error);
  }
};

// Экспортируем дефолтные значения для использования в компонентах
export default DEFAULT_ADMIN_CONFIG;