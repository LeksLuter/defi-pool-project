// Централизованный файл конфигурации приложения
// Все настройки приложения хранятся в этом файле

// Импортируем дефолтную конфигурацию из нового файла констант
// Убедитесь, что DEFAULT_ADMIN_CONFIG определен в '../constants' с правильной структурой
import { DEFAULT_ADMIN_CONFIG } from '../constants';

const ADMIN_CONFIG_KEY = 'defiPool_adminConfig';

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
                    apiUrl = 'http://localhost:3001/api/app/config'; // Локальный API для app config (админка)
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
                return mergedConfig;
            } else if (response.status === 404) {
                console.log("[App Config] Конфигурация на сервере не найдена (админка), будет использована дефолтная или локальная.");
                // Продолжаем к локальной загрузке
            } else {
                const errorText = await response.text();
                console.warn(`[App Config] Сервер (админка) вернул ошибку при загрузке конфига: ${response.status} ${response.statusText}. Текст: ${errorText}`);
                // Продолжаем к локальной загрузке
            }
        } catch (e) {
            console.error("[App Config] Ошибка сети при загрузке конфигурации с сервера (админка):", e);
            // Продолжаем к локальной загрузке
        }
    } else if (userAddress) { // Всегда пытаемся загрузить для пользователя, если адрес есть
        // === ЗАГРУЗКА НА ОБЫЧНЫХ СТРАНИЦАХ ИЛИ ДЛЯ ПОЛЬЗОВАТЕЛЯ В АДМИНКЕ ===
        try {
            console.log(`[App Config] Попытка загрузки конфигурации с сервера (readonly) для пользователя ${userAddress}...`);
            // Определяем URL для readonly API
            let apiUrl = '';
            if (typeof window !== 'undefined') {
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalhost) {
                    apiUrl = 'http://localhost:3001/api/app/config'; // Локальный API для readonly
                } else {
                    apiUrl = '/.netlify/functions/getConfigReadOnly'; // Netlify Functions для readonly
                }
            } else {
                // Для SSR или других сред
                apiUrl = '/.netlify/functions/getConfigReadOnly';
            }

            const headers = {
                'Content-Type': 'application/json',
                'X-User-Address': userAddress, // Всегда передаем адрес пользователя
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
                // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
                const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...serverConfig };
                // Сохраняем в localStorage как резервную копию
                try {
                    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(mergedConfig));
                    console.log("[App Config] Конфигурация сохранена в localStorage как резерв (readonly/user)");
                } catch (storageError) {
                    console.error("[App Config] Ошибка при сохранении в localStorage (readonly/user):", storageError);
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
        console.warn("[App Config] Адрес пользователя не предоставлен, пропуск загрузки с сервера для пользователя.");
    }

    // 2. Попытка загрузки из localStorage
    console.log("[App Config] Попытка загрузки конфигурации из localStorage...");
    try {
        const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
        if (configStr) {
            const parsedConfig = JSON.parse(configStr);
            console.log("[App Config] Конфигурация успешно загружена из localStorage:", parsedConfig);
            return { ...DEFAULT_ADMIN_CONFIG, ...parsedConfig }; // Объединяем с дефолтной
        } else {
            console.log("[App Config] Конфигурация в localStorage не найдена.");
        }
    } catch (e) {
        console.error("[App Config] Ошибка при загрузке конфигурации из localStorage:", e);
    }

    // 3. Возвращаем дефолтную конфигурацию
    console.log("[App Config] Используется дефолтная конфигурация");
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
                    // Для локальной разработки используем локальный API (порт 3001 как в ваших логах)
                    apiUrl = 'http://localhost:3001/api/app/config';
                    console.log("[App Config] Приложение запущено локально, используем локальный API для сохранения:", apiUrl);
                } else {
                    // Для продакшена используем Netlify Functions
                    apiUrl = '/.netlify/functions/saveConfig';
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
                // Добавим таймаут для сетевых запросов
                signal: AbortSignal.timeout(10000) // 10 секунд
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
    } catch (e) {
        console.error("[App Config] Ошибка при сохранении конфигурации в localStorage:", e);
        throw new Error("Не удалось сохранить конфигурацию ни на сервере (локальный API или Netlify Functions), ни локально.");
    }
};

// Обновляем функции для получения настроек сервисов
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
        console.error("[App Config] Ошибка при получении tokenServices из localStorage:", e);
    }
    console.log("[App Config] tokenServices не найден или не является объектом, возвращаем дефолт");
    return DEFAULT_ADMIN_CONFIG.tokenServices;
};

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
        console.error("[App Config] Ошибка при получении priceServices из localStorage:", e);
    }
    console.log("[App Config] priceServices не найден или не является объектом, возвращаем дефолт");
    return DEFAULT_ADMIN_CONFIG.priceServices;
};

/**
 * Получает интервал обновления токенов в минутах.
 * @param {string} [userAddress] - Адрес пользователя (опционально)
 * @returns {Promise<number>} Интервал обновления в минутах.
 */
export const getUpdateIntervalMinutes = async (userAddress) => {
    try {
        // Получаем адрес пользователя, если он не передан
        let finalUserAddress = userAddress;

        // Все запросы к локальному API обрабатываются в этом файле
        const LOCAL_API_BASE_URL = 'http://localhost:3001/api'; // Порт 3001 для локального API

        // Проверяем, запущено ли приложение локально
        const isLocalhost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

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

            const response = await fetch(`${LOCAL_API_BASE_URL}/app/config`, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(10000) // 10 секунд таймаут
            });

            console.log("[App Config] Ответ от локального API сервера при загрузке интервала:", response.status, response.statusText);

            if (response.ok) {
                const serverConfig = await response.json();
                const interval = serverConfig.updateIntervalMinutes;
                console.log("[App Config] Интервал обновления успешно загружен с локального API сервера:", interval);
                return interval !== undefined ? interval : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
            } else if (response.status === 404) {
                console.log("[App Config] Локальный API сервер вернул 404 Not Found при загрузке интервала. Пробуем загрузить всю конфигурацию.");
                // Если отдельный endpoint не работает, попробуем загрузить всю конфигурацию
                const fullConfigResponse = await fetch(`${LOCAL_API_BASE_URL}/app/config`, {
                    method: 'GET',
                    headers: headers,
                    signal: AbortSignal.timeout(10000)
                });
                if (fullConfigResponse.ok) {
                    const fullServerConfig = await fullConfigResponse.json();
                    const interval = fullServerConfig.updateIntervalMinutes;
                    console.log("[App Config] Интервал обновления успешно загружен с локального API сервера (полная конфигурация):", interval);
                    return interval !== undefined ? interval : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
                } else {
                    const errorText = await fullConfigResponse.text();
                    console.warn(`[App Config] Локальный API сервер вернул ошибку при загрузке полной конфигурации: ${fullConfigResponse.status} ${fullConfigResponse.statusText} - ${errorText}`);
                }
            } else {
                const errorText = await response.text();
                console.warn(`[App Config] Локальный API сервер вернул ошибку при загрузке интервала: ${response.status} ${response.statusText} - ${errorText}`);
            }
        } else {
            console.log("[App Config] Приложение запущено НЕ локально, используем Netlify Functions или localStorage.");
            // Для продакшена или других сред используем Netlify Functions или localStorage
            // Пробуем загрузить конфигурацию через Netlify Functions
            try {
                const headers = {
                    'Content-Type': 'application/json',
                };

                // Добавляем заголовок с адресом пользователя, если он есть
                if (finalUserAddress) {
                    headers['X-User-Address'] = finalUserAddress;
                    console.log(`[App Config] Добавляем заголовок X-User-Address для Netlify: ${finalUserAddress}`);
                }

                // Для readonly используем специальный endpoint
                const response = await fetch('/.netlify/functions/getConfigReadOnly', {
                    method: 'GET',
                    headers: headers,
                    signal: AbortSignal.timeout(10000)
                });

                if (response.ok) {
                    const serverConfig = await response.json();
                    const interval = serverConfig.updateIntervalMinutes;
                    console.log("[App Config] Интервал обновления успешно загружен с Netlify Functions (readonly):", interval);
                    return interval !== undefined ? interval : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
                } else {
                    const errorText = await response.text();
                    console.warn(`[App Config] Netlify Functions (readonly) вернул ошибку при загрузке конфигурации: ${response.status} ${response.statusText} - ${errorText}`);
                }
            } catch (netlifyError) {
                console.error("[App Config] Ошибка сети при загрузке конфигурации с Netlify Functions (readonly):", netlifyError);
            }
        }
    } catch (localApiError) {
        console.error("[App Config] Ошибка при загрузке интервала обновления:", localApiError);
        // Продолжаем к загрузке из localStorage
    }

    // Загружаем из localStorage (резервный вариант)
    const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (configStr) {
        const parsedConfig = JSON.parse(configStr);
        const interval = parsedConfig.updateIntervalMinutes;
        console.log("[App Config] Интервал обновления из localStorage:", interval);
        return interval !== undefined ? interval : DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
    }

    console.log("[App Config] Интервал обновления не найден, используем дефолтный");
    return DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
};

// Функции обновления настроек (для администраторов)
export const updateTokenServicesConfig = async (newTokenServices, adminAddress) => {
    const currentConfig = await loadAppConfig(adminAddress);
    const updatedConfig = { ...currentConfig, tokenServices: newTokenServices };
    // Сохраняем в базу данных
    await saveAppConfig(updatedConfig, adminAddress);
    console.log("[App Config] Обновлены настройки токенов:", updatedConfig.tokenServices);
};

export const updatePriceServicesConfig = async (newPriceServices, adminAddress) => {
    const currentConfig = await loadAppConfig(adminAddress);
    const updatedConfig = { ...currentConfig, priceServices: newPriceServices };
    // Сохраняем в базу данных
    await saveAppConfig(updatedConfig, adminAddress);
    console.log("[App Config] Обновлены настройки цен:", updatedConfig.priceServices);
};

export const updateUpdateIntervalMinutes = async (newInterval, adminAddress) => {
    const currentConfig = await loadAppConfig(adminAddress);
    const updatedConfig = { ...currentConfig, updateIntervalMinutes: newInterval };
    // Сохраняем в базу данных
    await saveAppConfig(updatedConfig, adminAddress);
    console.log("[App Config] Обновлен интервал обновления:", newInterval);
};

// Экспортируем дефолтные значения для использования в компонентах
export default DEFAULT_ADMIN_CONFIG;