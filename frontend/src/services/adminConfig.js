// frontend/src/services/adminConfig.js

// Импортируем дефолтную конфигурацию из нового файла констант
import { DEFAULT_ADMIN_CONFIG } from '../constants'; // Убедитесь, что DEFAULT_ADMIN_CONFIG определен там

const ADMIN_CONFIG_KEY = 'defiPool_adminConfig';

/**
 * Загружает глобальную конфигурацию приложения.
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
          apiUrl = 'http://localhost:3001/api/app/config'; // Локальный API для app config
        } else {
          apiUrl = '/.netlify/functions/getConfig'; // Netlify Functions для админки (чтение)
        }
      } else {
        // Для SSR или других сред
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
      } else if (response.status === 403) {
        const errorText = await response.text();
        console.warn(`[Admin Config] Доступ запрещен (админка): ${response.status} ${response.statusText} - ${errorText}`);
        // Можно выбросить ошибку или обработать иначе
        throw new Error(`Доступ запрещен: ${errorText}`);
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
          apiUrl = 'http://localhost:3001/api/app/config'; // Локальный API для app config readonly
        } else {
          apiUrl = '/.netlify/functions/getConfigReadOnly'; // Netlify Functions readonly
        }
      } else {
        // Для SSR или других сред
        apiUrl = '/.netlify/functions/getConfigReadOnly';
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-User-Address': userAddress, // Используем user address для readonly
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
 * Сохраняет глобальную конфигурацию приложения.
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
          apiUrl = 'http://localhost:3001/api/app/config'; // Локальный API для app config
        } else {
          apiUrl = '/.netlify/functions/saveConfig'; // Netlify Functions для админки
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
      } else if (response.status === 403) {
        const errorText = await response.text();
        console.warn(`[Admin Config] Доступ запрещен при сохранении (админка): ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Доступ запрещен при сохранении: ${errorText}`);
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

/**
 * Загружает настройки сервисов получения токенов из localStorage или дефолта.
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
 * Загружает настройки сервисов получения цен из localStorage или дефолта.
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
 * Загружает интервал обновления из localStorage или дефолта.
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

/**
 * Проверяет, является ли адрес администратором, делая запрос к API.
 * @param {string} address - Адрес кошелька для проверки.
 * @returns {Promise<boolean>} true если адрес является администратором.
 */
export const checkIsAdmin = async (address) => {
  if (!address) {
    console.warn('[Admin Config] Адрес для проверки isAdmin не предоставлен');
    return false;
  }

  try {
    console.log(`[Admin Config] Проверка isAdmin для адреса: ${address}`);

    // Определяем URL для API в зависимости от среды выполнения
    let apiUrl = '';
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        // Предполагаем, что у локального API есть endpoint для проверки
        apiUrl = `http://localhost:3001/api/admins/check?address=${encodeURIComponent(address)}`;
      } else {
        // Для Netlify Functions
        apiUrl = `/.netlify/functions/checkAdmin?address=${encodeURIComponent(address)}`;
      }
    } else {
      // Для SSR
      apiUrl = `/.netlify/functions/checkAdmin?address=${encodeURIComponent(address)}`;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000) // 10 секунд таймаут
    });

    console.log("[Admin Config] Ответ от проверки isAdmin:", response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log(`[Admin Config] Результат проверки isAdmin для ${address}:`, data.isAdmin);
      return data.isAdmin === true;
    } else if (response.status === 404) {
      // Адрес не найден в списке админов
      console.log(`[Admin Config] Адрес ${address} не найден в списке администраторов`);
      return false;
    } else {
      const errorText = await response.text();
      console.warn(`[Admin Config] Сервер вернул ошибку при проверке isAdmin: ${response.status} ${response.statusText} - ${errorText}`);
      return false; // По умолчанию не админ
    }
  } catch (e) {
    console.error("[Admin Config] Ошибка сети при проверке isAdmin:", e);
    return false; // По умолчанию не админ
  }
};

// Экспортируем дефолтные значения для использования в компонентах
export default DEFAULT_ADMIN_CONFIG;