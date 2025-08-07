const ADMIN_CONFIG_KEY = 'adminConfig';

// === ДЕФОЛТНАЯ КОНФИГУРАЦИЯ ===
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
// === КОНЕЦ ДЕФОЛТНОЙ КОНФИГУРАЦИИ ===

/**
 * Загружает конфигурацию администратора.
 * Сначала пытается загрузить с бэкенда (заглушка, требует реализации с передачей адреса),
 * в случае ошибки или отсутствия - из localStorage.
 * Если в localStorage нет данных, возвращает дефолтную конфигурацию.
 * @param {string} [adminAddress] - Адрес администратора (для будущей интеграции с бэкендом).
 * @returns {Promise<Object>} Объект конфигурации.
 */
export const loadAdminConfig = async (adminAddress) => {
  // 1. Загрузка с бэкенда (заглушка)
  // В реальной реализации здесь был бы fetch запрос к /api/admin/config
  // с заголовком 'X-Admin-Address: adminAddress'
  // и логика обработки ответа.
  // Пока что этот блок закомментирован или упрощен.
  /*
  if (adminAddress) {
    try {
      console.log(`[adminConfig] Попытка загрузки конфигурации с сервера для ${adminAddress}...`);
      const response = await fetch(`/api/admin/config`, {
        method: 'GET',
        headers: {
          'X-Admin-Address': adminAddress
        }
      });
      if (response.ok) {
        const serverConfig = await response.json();
        console.log("[adminConfig] Конфигурация успешно загружена с сервера.");
        return serverConfig;
      } else {
        console.warn(`[adminConfig] Сервер вернул ошибку при загрузке конфига: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.error("[adminConfig] Ошибка сети при загрузке конфигурации с сервера:", e);
      // Продолжаем к локальной загрузке
    }
  } else {
    console.warn("[adminConfig] Адрес администратора не предоставлен, пропуск загрузки с сервера.");
  }
  */

  // 2. Загрузка из localStorage (резервный вариант)
  try {
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (configStr) {
      const parsedConfig = JSON.parse(configStr);
      console.log("[adminConfig] Конфигурация загружена из localStorage.");
      // Объединяем с дефолтной конфигурацией, чтобы убедиться, что все поля присутствуют
      return { ...DEFAULT_ADMIN_CONFIG, ...parsedConfig };
    } else {
      console.log("[adminConfig] Конфигурация в localStorage не найдена, используем дефолтную.");
    }
  } catch (e) {
    console.error("[adminConfig] Ошибка при парсинге конфигурации из localStorage:", e);
  }

  // 3. Возврат дефолтной конфигурации, если ничего не удалось загрузить
  console.log("[adminConfig] Возвращаем дефолтную конфигурацию.");
  return DEFAULT_ADMIN_CONFIG;
};

/**
 * Сохраняет конфигурацию администратора.
 * Сначала пытается сохранить на бэкенде (заглушка),
 * затем сохраняет в localStorage.
 * @param {Object} config - Объект конфигурации для сохранения.
 * @param {string} [adminAddress] - Адрес администратора (для будущей интеграции с бэкендом).
 * @returns {Promise<void>}
 */
export const saveAdminConfig = async (config, adminAddress) => {
  // 1. Сохранение на бэкенде (заглушка)
  // В реальной реализации здесь был бы fetch запрос к /api/admin/config
  // с методом POST, заголовком 'X-Admin-Address: adminAddress' и телом config.
  /*
  if (adminAddress) {
    try {
      console.log(`[adminConfig] Попытка сохранения конфигурации на сервере для ${adminAddress}...`);
      const response = await fetch(`/api/admin/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Address': adminAddress
        },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        console.log("[adminConfig] Конфигурация успешно сохранена на сервере.");
      } else {
        console.error(`[adminConfig] Ошибка при сохранении конфига на сервере: ${response.status} ${response.statusText}`);
        // Не прерываем выполнение, пробуем сохранить в localStorage
      }
    } catch (e) {
      console.error("[adminConfig] Ошибка сети при сохранении конфигурации на сервере:", e);
      // Не прерываем выполнение, пробуем сохранить в localStorage
    }
  } else {
    console.warn("[adminConfig] Адрес администратора не предоставлен, пропуск сохранения на сервере.");
  }
  */

  // 2. Сохранение в localStorage
  try {
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
    console.log("[adminConfig] Конфигурация сохранена в localStorage.");
    // Отправляем кастомное событие для синхронизации между вкладками
    window.dispatchEvent(new CustomEvent('adminConfigUpdated', { detail: config }));
  } catch (e) {
    console.error("[adminConfig] Ошибка при сохранении конфигурации в localStorage:", e);
    throw new Error("Не удалось сохранить конфигурацию ни на сервере, ни в локальном хранилище.");
  }
};

/**
 * Получает настройки сервисов для получения токенов из конфигурации.
 * @returns {Object} Объект с настройками сервисов токенов.
 */
export const getTokenServicesConfig = () => {
  // В реальном приложении здесь нужно получать актуальную конфигурацию,
  // например, из состояния контекста React или снова вызывать loadAdminConfig.
  // Для простоты примера мы берем из localStorage напрямую,
  // но правильнее было бы управлять этим на уровне выше (например, в AdminPanel).
  try {
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (configStr) {
      const config = JSON.parse(configStr);
      return config.tokenServices || DEFAULT_ADMIN_CONFIG.tokenServices;
    }
  } catch (e) {
    console.error("[adminConfig] Ошибка при получении tokenServices из localStorage:", e);
  }
  return DEFAULT_ADMIN_CONFIG.tokenServices;
};

/**
 * Получает настройки сервисов для получения цен из конфигурации.
 * @returns {Object} Объект с настройками сервисов цен.
 */
export const getPriceServicesConfig = () => {
  // Аналогично getTokenServicesConfig, берем из localStorage.
  try {
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (configStr) {
      const config = JSON.parse(configStr);
      return config.priceServices || DEFAULT_ADMIN_CONFIG.priceServices;
    }
  } catch (e) {
    console.error("[adminConfig] Ошибка при получении priceServices из localStorage:", e);
  }
  return DEFAULT_ADMIN_CONFIG.priceServices;
};

/**
 * Получает интервал обновления в минутах из конфигурации.
 * @returns {number} Интервал обновления в минутах.
 */
export const getUpdateIntervalMinutes = () => {
  // Аналогично, берем из localStorage.
  try {
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (configStr) {
      const config = JSON.parse(configStr);
      return config.updateIntervalMinutes !== undefined ? config.updateIntervalMinutes : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
    }
  } catch (e) {
    console.error("[adminConfig] Ошибка при получении updateIntervalMinutes из localStorage:", e);
  }
  return DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
};

// Экспортируем дефолтные значения для использования в компонентах
export default DEFAULT_ADMIN_CONFIG;