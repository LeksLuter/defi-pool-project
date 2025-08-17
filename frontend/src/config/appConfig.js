// Централизованный файл конфигурации приложения
// Все настройки приложения хранятся в этом файле

// === ЗАМЕНА КОНСТАНТ ===
// Вместо дублирования, импортируем SUPPORTED_CHAINS из отдельного файла
import { SUPPORTED_CHAINS } from './supportedChains';
import { DEFAULT_ADMIN_CONFIG } from '../constants'; // Убедитесь, что DEFAULT_ADMIN_CONFIG определен в '../constants' с правильной структурой

const ADMIN_CONFIG_KEY = 'defiPool_adminConfig';
const LOCAL_API_BASE_URL = 'http://localhost:3001/api'; // URL для локального API сервера

// Экспортируем CACHE_DURATION_MS как константу, значение будет обновляться при загрузке конфига
export let CACHE_DURATION_MS = DEFAULT_ADMIN_CONFIG.updateIntervalMinutes * 60 * 1000;
console.log(`[App Config] Инициализация CACHE_DURATION_MS: ${CACHE_DURATION_MS}мс (на основе дефолтных ${DEFAULT_ADMIN_CONFIG.updateIntervalMinutes} минут)`);

// SUPPORTED_CHAINS теперь экспортируются из './supportedChains.js'
// === КОНЕЦ ЗАМЕНЫ КОНСТАНТ ===

// === КОНЕЦ ГЛОБАЛЬНЫХ КОНСТАНТ ===

/**
 * Загружает глобальную конфигурацию приложения.
 * В админке использует adminAddress и основной API.
 * На других страницах использует userAddress и readonly API.
 * @param {string} [adminAddress] - Адрес кошелька администратора (для админки)
 * @param {string} [userAddress] - Адрес кошелька пользователя (для остальных страниц)
 * @returns {Promise<Object>} Объект конфигурации
 */
export const loadAppConfig = async (adminAddress, userAddress) => {
    console.log("[App Config] Начало загрузки конфигурации");
    console.log("[App Config] Адрес администратора:", adminAddress);
    console.log("[App Config] Адрес пользователя:", userAddress);

    let isAdminPage = false;
    if (typeof window !== 'undefined') {
        isAdminPage = window.location.pathname.startsWith('/admin');
    }

    // 1. Попытка загрузки с бэкенда (локальный API или Netlify Functions)
    if (adminAddress && isAdminPage) {
        // === ЗАГРУЗКА В АДМИНКЕ ===
        try {
            console.log(`[App Config] Попытка загрузки конфигурации с сервера (админка) для ${adminAddress}...`);
            // Определяем URL для API в зависимости от среды выполнения
            let apiUrl = '';
            if (typeof window !== 'undefined') {
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalhost) {
                    apiUrl = `${LOCAL_API_BASE_URL}/app/config`; // Локальный API для app config (админка)
                } else {
                    apiUrl = '/.netlify/functions/getConfig'; // Netlify Functions для админки (чтение/запись)
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

            console.log("[App Config] Ответ от сервера (админка):", response.status, response.statusText);

            if (response.ok) {
                const serverConfig = await response.json();
                console.log("[App Config] Конфигурация успешно загружена с сервера (админка):", serverConfig);

                // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
                const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...serverConfig };

                // Сохраняем в localStorage как резервную копию
                try {
                    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(mergedConfig));
                    console.log("[App Config] Конфигурация сохранена в localStorage как резерв (админка)");
                } catch (storageError) {
                    console.error("[App Config] Ошибка при сохранении в localStorage (админка):", storageError);
                }

                // Обновляем глобальную константу CACHE_DURATION_MS
                if (typeof mergedConfig.updateIntervalMinutes === 'number' && mergedConfig.updateIntervalMinutes > 0) {
                    CACHE_DURATION_MS = mergedConfig.updateIntervalMinutes * 60 * 1000;
                    console.log(`[App Config] CACHE_DURATION_MS обновлено до: ${CACHE_DURATION_MS}мс (на основе ${mergedConfig.updateIntervalMinutes} минут)`);
                }

                return mergedConfig;
            } else if (response.status === 404) {
                console.log("[App Config] Конфигурация на сервере не найдена (админка), будет использована дефолтная или локальная.");
                // Продолжаем к локальной загрузке
            } else if (response.status === 403) {
                const errorText = await response.text();
                console.warn(`[App Config] Доступ запрещен (админка): ${response.status} ${response.statusText} - ${errorText}`);
                // Можно выбросить ошибку или обработать иначе
                throw new Error(`Доступ запрещен: ${errorText}`);
            } else {
                const errorText = await response.text();
                console.warn(`[App Config] Сервер вернул ошибку при загрузке конфигурации (админка): ${response.status} ${response.statusText} - ${errorText}`);
                // Продолжаем к локальной загрузке
            }
        } catch (e) {
            console.error("[App Config] Ошибка сети при загрузке конфигурации с сервера (админка):", e);
            // Продолжаем к локальной загрузке
        }
    } else if (userAddress && !isAdminPage) {
        // === ЗАГРУЗКА ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (READONLY) ===
        try {
            console.log(`[App Config] Попытка загрузки конфигурации с сервера (readonly/user) для ${userAddress}...`);
            // Определяем URL для API в зависимости от среды выполнения
            let apiUrl = '';
            if (typeof window !== 'undefined') {
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalhost) {
                    apiUrl = `${LOCAL_API_BASE_URL}/app/config`; // Локальный API для app config readonly
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

            console.log("[App Config] Ответ от сервера (readonly/user):", response.status, response.statusText);

            if (response.ok) {
                const serverConfig = await response.json();
                console.log("[App Config] Конфигурация успешно загружена с сервера (readonly/user):", serverConfig);

                // ИСПРАВЛЕНИЕ: Обработка структуры ответа от Netlify Function
                // Netlify Function getConfigReadOnly возвращает { config: {...} }
                const configData = serverConfig.config ? serverConfig.config : serverConfig;

                // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
                const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...configData };

                // Сохраняем в localStorage как резервную копию
                try {
                    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(mergedConfig));
                    console.log("[App Config] Конфигурация сохранена в localStorage как резерв (readonly/user)");
                } catch (storageError) {
                    console.error("[App Config] Ошибка при сохранении в localStorage (readonly/user):", storageError);
                }

                // Обновляем глобальную константу CACHE_DURATION_MS
                if (typeof mergedConfig.updateIntervalMinutes === 'number' && mergedConfig.updateIntervalMinutes > 0) {
                    CACHE_DURATION_MS = mergedConfig.updateIntervalMinutes * 60 * 1000;
                    console.log(`[App Config] CACHE_DURATION_MS обновлено до: ${CACHE_DURATION_MS}мс (на основе ${mergedConfig.updateIntervalMinutes} минут)`);
                }

                return mergedConfig;
            } else if (response.status === 404) {
                console.log("[App Config] Конфигурация на сервере не найдена (readonly/user), будет использована дефолтная или локальная.");
                // Продолжаем к локальной загрузке
            } else {
                const errorText = await response.text();
                console.warn(`[App Config] Сервер (readonly/user) вернул ошибку при загрузке конфига: ${response.status} ${response.statusText}. Текст: ${errorText}`);
                // Продолжаем к локальной загрузке
            }
        } catch (e) {
            console.error("[App Config] Ошибка сети при загрузке конфигурации с сервера (readonly/user):", e);
            // Продолжаем к локальной загрузке
        }
    } else {
        console.warn("[App Config] Адрес пользователя или администратора не предоставлен, пропуск загрузки с сервера.");
    }

    // 2. Попытка загрузки из localStorage
    console.log("[App Config] Попытка загрузки конфигурации из localStorage...");
    try {
        const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
        if (configStr) {
            const parsedConfig = JSON.parse(configStr);
            console.log("[App Config] Конфигурация успешно загружена из localStorage:", parsedConfig);

            // Обновляем глобальную константу CACHE_DURATION_MS
            if (typeof parsedConfig.updateIntervalMinutes === 'number' && parsedConfig.updateIntervalMinutes > 0) {
                CACHE_DURATION_MS = parsedConfig.updateIntervalMinutes * 60 * 1000;
                console.log(`[App Config] CACHE_DURATION_MS обновлено до: ${CACHE_DURATION_MS}мс (на основе ${parsedConfig.updateIntervalMinutes} минут)`);
            }

            return { ...DEFAULT_ADMIN_CONFIG, ...parsedConfig }; // Объединяем с дефолтной
        } else {
            console.log("[App Config] Конфигурация в localStorage не найдена.");
        }
    } catch (e) {
        console.error("[App Config] Ошибка при загрузке конфигурации из localStorage:", e);
    }

    // 3. Возвращаем дефолтную конфигурацию
    console.log("[App Config] Используется дефолтная конфигурация");

    // Обновляем глобальную константу CACHE_DURATION_MS на основе дефолта
    CACHE_DURATION_MS = DEFAULT_ADMIN_CONFIG.updateIntervalMinutes * 60 * 1000;
    console.log(`[App Config] CACHE_DURATION_MS установлено в дефолтное значение: ${CACHE_DURATION_MS}мс (на основе ${DEFAULT_ADMIN_CONFIG.updateIntervalMinutes} минут)`);

    return DEFAULT_ADMIN_CONFIG;
};

/**
 * Сохраняет глобальную конфигурацию приложения.
 * Должна вызываться только из админки.
 * @param {Object} config - Объект конфигурации для сохранения
 * @param {string} [adminAddress] - Адрес кошелька администратора
 * @returns {Promise<void>}
 */
export const saveAppConfig = async (config, adminAddress) => {
    console.log("[App Config] Начало сохранения конфигурации");
    console.log("[App Config] Конфиг для сохранения:", config);
    console.log("[App Config] Адрес администратора:", adminAddress);

    // 1. Попытка сохранения на бэкенде (локальный API или Netlify Functions)
    if (adminAddress) {
        try {
            console.log(`[App Config] Попытка сохранения конфигурации на сервере (локальный API или Netlify Functions) для ${adminAddress}...`);
            // Определяем URL для API в зависимости от среды выполнения
            let apiUrl = '';
            if (typeof window !== 'undefined') {
                // Проверяем, запущено ли приложение локально
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalhost) {
                    apiUrl = `${LOCAL_API_BASE_URL}/app/config`; // Локальный API для app config (админка)
                    console.log("[App Config] Приложение запущено локально, используем локальный API для сохранения:", apiUrl);
                } else {
                    apiUrl = '/.netlify/functions/saveConfig'; // Netlify Functions для админки (чтение/запись)
                    console.log("[App Config] Приложение запущено в продакшене, используем Netlify Functions для сохранения:", apiUrl);
                }
            } else {
                // Для SSR или Node.js используем Netlify Functions
                apiUrl = '/.netlify/functions/saveConfig';
                console.log("[App Config] Приложение запущено в SSR/Node.js, используем Netlify Functions для сохранения:", apiUrl);
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
                signal: AbortSignal.timeout(10000) // 10 секунд таймаут
            });

            console.log("[App Config] Ответ от сохранения:", response.status, response.statusText);

            if (response.ok) {
                const result = await response.json();
                console.log("[App Config] Конфигурация успешно сохранена на сервере (локальный API или Netlify Functions):", result);

                // Отправляем кастомное событие для синхронизации между вкладками
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('appConfigUpdated', { detail: config }));
                }

                // Сохраняем в localStorage как резервную копию
                try {
                    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
                    console.log("[App Config] Конфигурация сохранена в localStorage как резерв (админка)");
                } catch (storageError) {
                    console.error("[App Config] Ошибка при сохранении в localStorage (админка):", storageError);
                }

                // Обновляем глобальную константу CACHE_DURATION_MS
                if (typeof config.updateIntervalMinutes === 'number' && config.updateIntervalMinutes > 0) {
                    CACHE_DURATION_MS = config.updateIntervalMinutes * 60 * 1000;
                    console.log(`[App Config] CACHE_DURATION_MS обновлено до: ${CACHE_DURATION_MS}мс (на основе ${config.updateIntervalMinutes} минут)`);
                }

                return; // Успешно сохранено на сервере
            } else if (response.status === 403) {
                const errorText = await response.text();
                console.warn(`[App Config] Сервер вернул 403 Forbidden при сохранении конфига: ${errorText}`);
                throw new Error(`Доступ запрещен при сохранении конфигурации: ${errorText}`);
            } else {
                const errorText = await response.text();
                console.warn(`[App Config] Сервер (локальный API или Netlify Functions) вернул ошибку при сохранении конфига: ${response.status} ${response.statusText}. Текст: ${errorText}`);
                // Продолжаем к локальному сохранению как резерв
            }
        } catch (e) {
            console.error("[App Config] Ошибка сети при сохранении конфигурации на сервер (локальный API или Netlify Functions):", e);
            // Продолжаем к локальному сохранению как резерв
        }
    } else {
        console.warn("[App Config] Адрес администратора не предоставлен, пропуск сохранения на сервере.");
    }

    // 2. Сохранение в localStorage (резервный вариант)
    try {
        localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
        console.log("[App Config] Конфигурация успешно сохранена в localStorage (резерв).");

        // Отправляем кастомное событие для синхронизации между вкладками
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('appConfigUpdated', { detail: config }));
        }

        // Обновляем глобальную константу CACHE_DURATION_MS
        if (typeof config.updateIntervalMinutes === 'number' && config.updateIntervalMinutes > 0) {
            CACHE_DURATION_MS = config.updateIntervalMinutes * 60 * 1000;
            console.log(`[App Config] CACHE_DURATION_MS обновлено до: ${CACHE_DURATION_MS}мс (на основе ${config.updateIntervalMinutes} минут)`);
        }

    } catch (e) {
        console.error("[App Config] Ошибка при сохранении конфигурации в localStorage:", e);
        throw new Error("Не удалось сохранить конфигурацию ни на сервере (локальный API или Netlify Functions), ни локально.");
    }
};

// === ФУНКЦИИ ДОСТУПА К КОНКРЕТНЫМ ЧАСТЯМ КОНФИГУРАЦИИ ===
// Эти функции предоставляют удобный доступ к частям конфигурации

/**
 * Получает настройки сервисов для получения токенов.
 * @returns {Object} Объект с настройками сервисов токенов
 */
export const getTokenServicesConfig = () => {
    try {
        const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
        if (configStr) {
            const parsedConfig = JSON.parse(configStr);
            console.log("[App Config] Загруженная конфигурация токенов:", parsedConfig.tokenServices);
            // Проверяем, что tokenServices существует и является объектом
            if (parsedConfig.tokenServices && typeof parsedConfig.tokenServices === 'object') {
                return parsedConfig.tokenServices;
            }
        }
    } catch (e) {
        console.error("[App Config] Ошибка при загрузке настроек сервисов токенов из localStorage:", e);
    }
    // Если не удалось загрузить, возвращаем дефолтные настройки
    console.log("[App Config] Используются дефолтные настройки сервисов токенов:", DEFAULT_ADMIN_CONFIG.tokenServices);
    return DEFAULT_ADMIN_CONFIG.tokenServices;
};

/**
 * Получает настройки сервисов для получения цен.
 * @returns {Object} Объект с настройками сервисов цен
 */
export const getPriceServicesConfig = () => {
    try {
        const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
        if (configStr) {
            const parsedConfig = JSON.parse(configStr);
            console.log("[App Config] Загруженная конфигурация цен:", parsedConfig.priceServices);
            // Проверяем, что priceServices существует и является объектом
            if (parsedConfig.priceServices && typeof parsedConfig.priceServices === 'object') {
                return parsedConfig.priceServices;
            }
        }
    } catch (e) {
        console.error("[App Config] Ошибка при загрузке настроек сервисов цен из localStorage:", e);
    }
    // Если не удалось загрузить, возвращаем дефолтные настройки
    console.log("[App Config] Используются дефолтные настройки сервисов цен:", DEFAULT_ADMIN_CONFIG.priceServices);
    return DEFAULT_ADMIN_CONFIG.priceServices;
};

/**
 * Получает интервал обновления в минутах.
 * @param {string} [userAddress] - Адрес пользователя (для readonly загрузки)
 * @returns {Promise<number>} Интервал обновления в минутах
 */
export const getUpdateIntervalMinutes = async (userAddress) => {
    console.log("[App Config] Начало загрузки интервала обновления...");
    const finalUserAddress = userAddress || (typeof window !== 'undefined' ? window?.ethereum?.selectedAddress : null);
    console.log("[App Config] Адрес пользователя для загрузки интервала:", finalUserAddress);

    // 1. Попытка загрузки с сервера (локальный API или Netlify Functions)
    if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
            console.log("[App Config] Приложение запущено локально, пытаемся загрузить интервал обновления с локального API сервера...");
            // Используем локальный API для получения только интервала
            const headers = {
                'Content-Type': 'application/json',
            };
            // Добавляем заголовок с адресом пользователя, если он есть
            if (finalUserAddress) {
                headers['X-User-Address'] = finalUserAddress;
                console.log(`[App Config] Добавляем заголовок X-User-Address: ${finalUserAddress}`);
            }

            try {
                // Сначала пробуем загрузить полную конфигурацию
                const fullConfigResponse = await fetch(`${LOCAL_API_BASE_URL}/app/config`, {
                    method: 'GET',
                    headers: headers,
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });

                if (fullConfigResponse.ok) {
                    const fullConfig = await fullConfigResponse.json();
                    const interval = fullConfig.updateIntervalMinutes;
                    console.log("[App Config] Интервал обновления успешно загружен с локального API сервера (полная конфигурация):", interval);
                    return interval !== undefined ? interval : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
                } else {
                    const errorText = await fullConfigResponse.text();
                    console.warn(`[App Config] Локальный API сервер вернул ошибку при загрузке полной конфигурации: ${fullConfigResponse.status} ${fullConfigResponse.statusText} - ${errorText}`);
                }
            } catch (e) {
                console.error("[App Config] Ошибка сети при загрузке полной конфигурации с локального API сервера:", e);
            }

            // Если полная конфигурация не загрузилась, пробуем получить только интервал
            // (Предполагая, что у вас есть отдельный endpoint для этого, например /api/app/config/interval)
            // const intervalResponse = await fetch(`${LOCAL_API_BASE_URL}/app/config/interval`, {
            //   method: 'GET',
            //   headers: headers,
            //   signal: AbortSignal.timeout(10000) // 10 секунд таймаут
            // });
            // if (intervalResponse.ok) {
            //   const intervalData = await intervalResponse.json();
            //   console.log("[App Config] Интервал обновления успешно загружен с локального API сервера:", intervalData.interval);
            //   return intervalData.interval !== undefined ? intervalData.interval : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
            // } else {
            //   const errorText = await intervalResponse.text();
            //   console.warn(`[App Config] Локальный API сервер вернул ошибку при загрузке интервала: ${intervalResponse.status} ${intervalResponse.statusText} - ${errorText}`);
            // }
        } else {
            console.log("[App Config] Приложение запущено НЕ локально, используем Netlify Functions или localStorage.");
            // Для продакшена или других сред используем Netlify Functions или localStorage
            // Пробуем загрузить конфигурацию через Netlify Functions
            try {
                const headers = {
                    'Content-Type': 'application/json',
                };
                // --- ИСПРАВЛЕНИЕ ---
                // Добавляем заголовок с адресом пользователя, если он есть
                // Это важно для корректной работы проверки доступа в Netlify Function
                if (finalUserAddress) {
                    headers['X-User-Address'] = finalUserAddress;
                }
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

                const response = await fetch('/.netlify/functions/getConfigReadOnly', {
                    method: 'GET',
                    headers: headers, // Используем обновленные заголовки
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });

                if (response.ok) {
                    const serverResponse = await response.json();
                    // --- ИСПРАВЛЕНИЕ ---
                    // Netlify Function getConfigReadOnly возвращает { config: {...} }
                    // Поэтому нужно брать updateIntervalMinutes из serverResponse.config
                    const interval = serverResponse.config ? serverResponse.config.updateIntervalMinutes : serverResponse.updateIntervalMinutes;
                    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                    console.log("[App Config] Интервал обновления успешно загружен с Netlify Functions:", interval);
                    return interval !== undefined ? interval : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
                } else {
                    const errorText = await response.text();
                    console.warn(`[App Config] Netlify Functions вернул ошибку при загрузке конфигурации: ${response.status} ${response.statusText} - ${errorText}`);
                }
            } catch (e) {
                console.error("[App Config] Ошибка сети при загрузке конфигурации с Netlify Functions:", e);
            }
        }
    } else {
        console.log("[App Config] window не определен (SSR), используем localStorage или дефолт.");
    }

    // 2. Загрузка из localStorage (резервный вариант)
    try {
        const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
        if (configStr) {
            const parsedConfig = JSON.parse(configStr);
            const interval = parsedConfig.updateIntervalMinutes;
            console.log("[App Config] Интервал обновления из localStorage:", interval);
            return interval !== undefined ? interval : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
        }
    } catch (e) {
        console.error("[App Config] Ошибка при загрузке интервала из localStorage:", e);
    }

    console.log("[App Config] Интервал обновления не найден, используем дефолтный");
    return DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
};
// === КОНЕЦ ФУНКЦИЙ ДОСТУПА ===

// === ФУНКЦИИ ОБНОВЛЕНИЯ КОНФИГУРАЦИИ (ДЛЯ АДМИНИСТРАТОРОВ) ===
/**
 * Обновляет настройки сервисов для получения токенов.
 * @param {Object} newTokenServicesConfig - Новые настройки сервисов токенов
 * @param {string} adminAddress - Адрес администратора
 * @returns {Promise<void>}
 */
export const updateTokenServicesConfig = async (newTokenServicesConfig, adminAddress) => {
    const currentConfig = await loadAppConfig(adminAddress);
    const updatedConfig = { ...currentConfig, tokenServices: newTokenServicesConfig };
    // Сохраняем в базу данных
    await saveAppConfig(updatedConfig, adminAddress);
    console.log("[App Config] Обновлены настройки токенов:", updatedConfig.tokenServices);
};

/**
 * Обновляет настройки сервисов для получения цен.
 * @param {Object} newPriceServicesConfig - Новые настройки сервисов цен
 * @param {string} adminAddress - Адрес администратора
 * @returns {Promise<void>}
 */
export const updatePriceServicesConfig = async (newPriceServicesConfig, adminAddress) => {
    const currentConfig = await loadAppConfig(adminAddress);
    const updatedConfig = { ...currentConfig, priceServices: newPriceServicesConfig };
    // Сохраняем в базу данных
    await saveAppConfig(updatedConfig, adminAddress);
    console.log("[App Config] Обновлены настройки цен:", updatedConfig.priceServices);
};

/**
 * Обновляет интервал обновления.
 * @param {number} newInterval - Новый интервал обновления в минутах
 * @param {string} adminAddress - Адрес администратора
 * @returns {Promise<void>}
 */
export const updateUpdateIntervalMinutes = async (newInterval, adminAddress) => {
    const currentConfig = await loadAppConfig(adminAddress);
    const updatedConfig = { ...currentConfig, updateIntervalMinutes: newInterval };
    // Сохраняем в базу данных
    await saveAppConfig(updatedConfig, adminAddress);
    console.log("[App Config] Обновлен интервал обновления:", newInterval);
};
// === КОНЕЦ ФУНКЦИЙ ОБНОВЛЕНИЯ ===

// Экспортируем дефолтные значения для использования в компонентах
export { DEFAULT_ADMIN_CONFIG };

// Экспортируем SUPPORTED_CHAINS, импортированные из supportedChains.js
export { SUPPORTED_CHAINS };