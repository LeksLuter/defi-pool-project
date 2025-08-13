import { DEFAULT_ADMIN_CONFIG } from '../constants';

const ADMIN_CONFIG_KEY = 'defiPool_adminConfig';

/**
 * Загружает конфигурацию администратора.
 * В админке использует adminAddress и основной API.
 * На других страницах использует userAddress и readonly API.
 * @param {string} [adminAddress] - Адрес кошелька администратора (для админки)
 * @param {string} [userAddress] - Адрес кошелька пользователя (для остальных страниц)
 * @param {boolean} isAdminPage - Флаг, указывающий, вызывается ли функция из админки
 * @returns {Promise<Object>} Объект конфигурации
 */
export const loadAdminConfig = async (adminAddress, userAddress, isAdminPage = false) => {
  console.log("[Admin Config] Начало загрузки конфигурации");
  console.log("[Admin Config] Адрес администратора:", adminAddress);
  console.log("[Admin Config] Адрес пользователя:", userAddress);
  console.log("[Admin Config] Вызов из админки:", isAdminPage);

  // 1. Попытка загрузки с бэкенда (локальный API или Netlify Functions)
  if (isAdminPage && adminAddress) {
    // === ЗАГРУЗКА В АДМИНКЕ ===
    try {
      console.log(`[Admin Config] Попытка загрузки конфигурации с сервера (админка) для ${adminAddress}...`);

      // Определяем URL для API в зависимости от среды выполнения
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          apiUrl = 'http://localhost:3001/api/admin/config'; // Локальный API
        } else {
          apiUrl = '/.netlify/functions/getConfig'; // Netlify Functions
        }
      } else {
        // Для SSR или других сред, используем Netlify Functions
        apiUrl = '/.netlify/functions/getConfig';
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-Admin-Address': adminAddress,
      };

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
        signal: AbortSignal.timeout(10000) // 10 секунд таймаут
      });

      console.log("[Admin Config] Ответ от сервера (админка):", response.status, response.statusText);

      if (response.ok) {
        const serverConfig = await response.json();
        console.log("[Admin Config] Конфигурация успешно загружена с сервера (админка):", serverConfig);

        // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
        const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...serverConfig };

        // Сохраняем в localStorage как резервную копию
        try {
          localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(mergedConfig));
          console.log("[Admin Config] Конфигурация сохранена в localStorage как резерв (админка)");
        } catch (storageError) {
          console.error("[Admin Config] Ошибка при сохранении в localStorage (админка):", storageError);
        }

        return mergedConfig;
      } else if (response.status === 404) {
        console.log("[Admin Config] Конфигурация на сервере не найдена (админка), будет использована дефолтная или локальная.");
        // Продолжаем к локальной загрузке
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Config] Сервер вернул ошибку при загрузке конфигурации (админка): ${response.status} ${response.statusText} - ${errorText}`);
        // Продолжаем к локальной загрузке
      }
    } catch (e) {
      console.error("[Admin Config] Ошибка сети при загрузке конфигурации с сервера (админка):", e);
      // Продолжаем к локальной загрузке
    }
  } else if (!isAdminPage && userAddress) {
    // === ЗАГРУЗКА НА ОБЫЧНЫХ СТРАНИЦАХ ===
    try {
      console.log(`[Admin Config] Попытка загрузки конфигурации с сервера (readonly) для пользователя ${userAddress}...`);

      // Определяем URL для readonly API
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          // Предполагаем, что у вас есть endpoint для readonly в локальном API
          // Например, /api/admin/config/readonly?targetAdminAddress=...
          // !!! ВАЖНО: Вам нужно определить, чью конфигурацию вы хотите получить.
          // Здесь используется заглушка - адрес админа по умолчанию.
          // const DEFAULT_ADMIN_ADDRESS = "0xe00Fb1e7E860C089503D2c842C683a7A3E57b614"; // Замените на реальный
          // apiUrl = `http://localhost:3001/api/admin/config/readonly?targetAdminAddress=${DEFAULT_ADMIN_ADDRESS}`;
          // Для демонстрации будем использовать тот же endpoint, но с userAddress
          // и ожидать, что сервер сам определит targetAdminAddress
          // Лучше передавать targetAdminAddress явно
          // Предположим, что мы хотим получить конфигурацию админа по умолчанию
          const DEFAULT_ADMIN_ADDRESS = "0xe00Fb1e7E860C089503D2c842C683a7A3E57b614"; // Замените на реальный
          apiUrl = `http://localhost:3001/api/admin/config/readonly?targetAdminAddress=${DEFAULT_ADMIN_ADDRESS}`;
        } else {
          // Предполагаем, что у Netlify Functions есть readonly функция
          // const DEFAULT_ADMIN_ADDRESS = "0xe00Fb1e7E860C089503D2c842C683a7A3E57b614"; // Замените на реальный
          // apiUrl = `/.netlify/functions/getConfigReadOnly?targetAdminAddress=${DEFAULT_ADMIN_ADDRESS}`;
          // Для демонстрации будем использовать тот же endpoint, но с userAddress
          // и ожидать, что сервер сам определит targetAdminAddress
          // Лучше передавать targetAdminAddress явно
          const DEFAULT_ADMIN_ADDRESS = "0xe00Fb1e7E860C089503D2c842C683a7A3E57b614"; // Замените на реальный
          apiUrl = `/.netlify/functions/getConfigReadOnly?targetAdminAddress=${DEFAULT_ADMIN_ADDRESS}`;
        }
      } else {
        // Для SSR или других сред
        const DEFAULT_ADMIN_ADDRESS = "0xe00Fb1e7E860C089503D2c842C683a7A3E57b614"; // Замените на реальный
        apiUrl = `/.netlify/functions/getConfigReadOnly?targetAdminAddress=${DEFAULT_ADMIN_ADDRESS}`;
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-User-Address': userAddress, // Используем user address для readonly
        // 'X-Admin-Address': adminAddress, // Не передаем admin address на обычных страницах
      };

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
        signal: AbortSignal.timeout(10000) // 10 секунд таймаут
      });

      console.log("[Admin Config] Ответ от сервера (readonly):", response.status, response.statusText);

      if (response.ok) {
        const serverConfig = await response.json();
        console.log("[Admin Config] Конфигурация успешно загружена с сервера (readonly):", serverConfig);

        // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
        const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...serverConfig };

        // Сохраняем в localStorage как резервную копию
        try {
          localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(mergedConfig));
          console.log("[Admin Config] Конфигурация сохранена в localStorage как резерв (readonly)");
        } catch (storageError) {
          console.error("[Admin Config] Ошибка при сохранении в localStorage (readonly):", storageError);
        }

        return mergedConfig;
      } else if (response.status === 404) {
        console.log("[Admin Config] Конфигурация на сервере не найдена (readonly), будет использована дефолтная или локальная.");
        // Продолжаем к локальной загрузке
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Config] Сервер вернул ошибку при загрузке конфигурации (readonly): ${response.status} ${response.statusText} - ${errorText}`);
        // Продолжаем к локальной загрузке
      }
    } catch (e) {
      console.error("[Admin Config] Ошибка сети при загрузке конфигурации с сервера (readonly):", e);
      // Продолжаем к локальной загрузке
    }
  }

  // 2. Попытка загрузки из localStorage
  console.log("[Admin Config] Попытка загрузки конфигурации из localStorage...");
  try {
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (configStr) {
      const parsedConfig = JSON.parse(configStr);
      console.log("[Admin Config] Конфигурация успешно загружена из localStorage:", parsedConfig);
      return { ...DEFAULT_ADMIN_CONFIG, ...parsedConfig }; // Объединяем с дефолтной
    } else {
      console.log("[Admin Config] Конфигурация в localStorage не найдена.");
    }
  } catch (e) {
    console.error("[Admin Config] Ошибка при загрузке конфигурации из localStorage:", e);
  }

  // 3. Возвращаем дефолтную конфигурацию
  console.log("[Admin Config] Используется дефолтная конфигурация");
  return DEFAULT_ADMIN_CONFIG;
};

/**
 * Сохраняет конфигурацию администратора.
 * Должна вызываться только из админки.
 * @param {Object} config - Объект конфигурации для сохранения
 * @param {string} [adminAddress] - Адрес кошелька администратора
 * @returns {Promise<void>}
 */
export const saveAdminConfig = async (config, adminAddress) => {
  console.log("[Admin Config] Начало сохранения конфигурации");
  console.log("[Admin Config] Конфиг для сохранения:", config);
  console.log("[Admin Config] Адрес администратора:", adminAddress);

  // 1. Попытка сохранения на бэкенде (локальный API или Netlify Functions)
  if (adminAddress) {
    try {
      console.log(`[Admin Config] Попытка сохранения конфигурации на сервере (админка) для ${adminAddress}...`);

      // Определяем URL для API в зависимости от среды выполнения
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          apiUrl = 'http://localhost:3001/api/admin/config'; // Локальный API
        } else {
          apiUrl = '/.netlify/functions/saveConfig'; // Netlify Functions
        }
      } else {
        // Для SSR или других сред
        apiUrl = '/.netlify/functions/saveConfig';
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-Admin-Address': adminAddress, // Передаем адрес администратора в заголовке
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(10000) // 10 секунд таймаут
      });

      console.log("[Admin Config] Ответ от сохранения:", response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log("[Admin Config] Конфигурация успешно сохранена на сервере (админка):", result);

        // Отправляем кастомное событие для синхронизации между вкладками
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: config }));
        }

        // Сохраняем в localStorage как резервную копию
        try {
          localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
          console.log("[Admin Config] Конфигурация сохранена в localStorage как резерв (админка)");
        } catch (storageError) {
          console.error("[Admin Config] Ошибка при сохранении в localStorage (админка):", storageError);
        }

        return; // Успешно сохранено на сервере
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Config] Сервер вернул ошибку при сохранении конфигурации (админка): ${response.status} ${response.statusText} - ${errorText}`);
        // Пробуем сохранить локально
      }
    } catch (e) {
      console.error("[Admin Config] Ошибка сети при сохранении конфигурации на сервере (админка):", e);
      // Пробуем сохранить локально
    }
  }

  // 2. Попытка сохранения в localStorage (резервная копия)
  console.log("[Admin Config] Попытка сохранения конфигурации в localStorage...");
  try {
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
    console.log("[Admin Config] Конфигурация успешно сохранена в localStorage");

    // Отправляем кастомное событие для синхронизации между вкладками
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: config }));
    }

    return; // Успешно сохранено локально
  } catch (e) {
    console.error("[Admin Config] Ошибка при сохранении конфигурации администратора в localStorage:", e);
    throw new Error("Не удалось сохранить конфигурацию ни на сервере (админка), ни локально.");
  }
};

// --- Остальные функции остаются без изменений ---

/**
 * Загружает настройки сервисов получения токенов из localStorage.
 * @returns {Object} Объект с настройками сервисов токенов.
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
    console.log("[Admin Config] Используются дефолтные настройки токенов из DEFAULT_ADMIN_CONFIG");
    return DEFAULT_ADMIN_CONFIG.tokenServices;
  } catch (e) {
    console.error("[Admin Config] Ошибка при загрузке настроек токенов из localStorage:", e);
    return DEFAULT_ADMIN_CONFIG.tokenServices;
  }
};

/**
 * Загружает настройки сервисов получения цен из localStorage.
 * @returns {Object} Объект с настройками сервисов цен.
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
    console.log("[Admin Config] Используются дефолтные настройки цен из DEFAULT_ADMIN_CONFIG");
    return DEFAULT_ADMIN_CONFIG.priceServices;
  } catch (e) {
    console.error("[Admin Config] Ошибка при загрузке настроек цен из localStorage:", e);
    return DEFAULT_ADMIN_CONFIG.priceServices;
  }
};

/**
 * Загружает интервал обновления из localStorage.
 * @returns {number} Интервал обновления в минутах.
 */
export const getUpdateIntervalMinutes = () => {
  try {
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
 * Обновляет настройки сервисов получения токенов.
 * @param {Object} newTokenServices - Новые настройки сервисов токенов.
 * @param {string} adminAddress - Адрес администратора.
 * @returns {Promise<void>}
 */
export const updateTokenServicesConfig = async (newTokenServices, adminAddress) => {
  const currentConfig = await loadAdminConfig(adminAddress, null, true); // Загружаем текущую конфигурацию из админки
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

/**
 * Обновляет настройки сервисов получения цен.
 * @param {Object} newPriceServices - Новые настройки сервисов цен.
 * @param {string} adminAddress - Адрес администратора.
 * @returns {Promise<void>}
 */
export const updatePriceServicesConfig = async (newPriceServices, adminAddress) => {
  const currentConfig = await loadAdminConfig(adminAddress, null, true); // Загружаем текущую конфигурацию из админки
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

/**
 * Обновляет интервал обновления.
 * @param {number} newIntervalMinutes - Новый интервал обновления в минутах.
 * @param {string} adminAddress - Адрес администратора.
 * @returns {Promise<void>}
 */
export const updateUpdateIntervalMinutes = async (newIntervalMinutes, adminAddress) => {
  const currentConfig = await loadAdminConfig(adminAddress, null, true); // Загружаем текущую конфигурацию из админки
  const updatedConfig = {
    ...currentConfig,
    updateIntervalMinutes: newIntervalMinutes
  };
  // Сохраняем в базу данных
  await saveAdminConfig(updatedConfig, adminAddress);
  console.log("[Admin Config] Обновлен интервал обновления:", updatedConfig.updateIntervalMinutes);
};