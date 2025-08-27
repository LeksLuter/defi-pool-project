// frontend/src/config/appConfig.js
// Централизованный файл конфигурации приложения
// Все настройки приложения хранятся в этом файле
// === ЗАМЕНА КОНСТАНТ ===
// Вместо дублирования, импортируем SUPPORTED_CHAINS из отдельного файла
import { SUPPORTED_CHAINS } from './supportedChains';
import { DEFAULT_ADMIN_CONFIG } from '../constants'; // Убедитесь, что DEFAULT_ADMIN_CONFIG определен в '../constants' с правильной структурой

const ADMIN_CONFIG_KEY = 'defiPool_adminConfig';
// URL для локального API сервера (если используется отдельный порт)
// const LOCAL_API_BASE_URL = 'http://localhost:3001/api';
// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
// Глобальная переменная для хранения текущей конфигурации (если нужно использовать вне функций)
export let CURRENT_APP_CONFIG = { ...DEFAULT_ADMIN_CONFIG };
// Глобальная переменная для интервала кэширования (пересчитывается из updateIntervalMinutes)
export let CACHE_DURATION_MS = DEFAULT_ADMIN_CONFIG.updateIntervalMinutes * 60 * 1000;
// === КОНЕЦ ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ ===

// === ОСНОВНАЯ ФУНКЦИЯ ЗАГРУЗКИ ===
/**
 * Загружает глобальную конфигурацию приложения.
 * В админке использует adminAddress и основной API с заголовком X-Admin-Address.
 * На других страницах использует userAddress и readonly API с заголовком X-User-Address.
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
        console.log("[App Config] isAdminPage:", isAdminPage);
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
                    console.log("[App Config] Приложение запущено локально, используем локальный API сервер для загрузки.");
                    apiUrl = '/api/getConfig'; // Предполагаемый путь для локального API прокси
                } else {
                    console.log("[App Config] Приложение запущено НЕ локально, используем Netlify Functions для загрузки: /.netlify/functions/getConfig");
                    apiUrl = '/.netlify/functions/getConfig';
                }
            } else {
                // Для SSR или других сред, предполагаем использование Netlify Functions
                console.log("[App Config] window не определен (SSR), используем Netlify Functions для загрузки: /.netlify/functions/getConfig");
                apiUrl = '/.netlify/functions/getConfig';
            }
            
            // Подготавливаем заголовки
            const headers = {
                'Content-Type': 'application/json',
                // Передаем адрес администратора в заголовке
                'X-Admin-Address': adminAddress,
            };
            
            // Выполняем запрос к API
            console.log("[App Config] Выполняем запрос к API:", apiUrl);
            const response = await fetch(apiUrl, {
                method: 'GET', // Предполагаем, что getConfig использует GET или POST без тела для чтения
                headers: headers,
                signal: AbortSignal.timeout(10000) // 10 секунд таймаут
            });
            
            console.log("[App Config] Ответ от сервера (админка):", response.status, response.statusText);
            
            if (response.ok) {
                const serverConfig = await response.json();
                console.log("[App Config] Ответ от сервера (админка) (parsed):", serverConfig);
                
                // Проверяем структуру ответа
                let configData = serverConfig;
                if (serverConfig && typeof serverConfig === 'object' && serverConfig.config) {
                    configData = serverConfig.config;
                }
                
                // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
                const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...configData };
                console.log("[App Config] Конфигурация успешно загружена с сервера (админка):", mergedConfig);
                
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
                
                // Обновляем глобальную переменную текущей конфигурации
                CURRENT_APP_CONFIG = mergedConfig;
                return mergedConfig;
            } else if (response.status === 404) {
                console.log("[App Config] Конфигурация на сервере не найдена (админка), будет использована дефолтная или локальная.");
                // Продолжаем к локальной загрузке
            } else if (response.status === 403) {
                const errorText = await response.text();
                console.warn(`[App Config] Доступ запрещен (админка): ${response.status} ${response.statusText} - ${errorText}`);
                throw new Error(`Доступ запрещен: ${errorText}`);
            } else {
                const errorText = await response.text();
                console.warn(`[App Config] Сервер вернул ошибку при загрузке конфигурации (админка): ${response.status} ${response.statusText} - ${errorText}`);
                throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
            }
        } catch (e) {
            console.error("[App Config] Ошибка сети при загрузке конфигурации с сервера (админка):", e);
            if (e.name === 'AbortError') {
                console.error("[App Config] Таймаут при загрузке конфигурации с сервера (админка)");
                throw new Error("Таймаут при загрузке конфигурации с сервера");
            }
            // Продолжаем к локальной загрузке как резерв
        }
        // === КОНЕЦ ЗАГРУЗКИ В АДМИНКЕ ===
    } else if (userAddress && !isAdminPage) {
        // === ЗАГРУЗКА НА ОБЫЧНЫХ СТРАНИЦАХ (READONLY) ===
        try {
            console.log(`[App Config] Попытка загрузки конфигурации с сервера (readonly/user) для ${userAddress}...`);
            
            // Определяем URL для API в зависимости от среды выполнения
            let apiUrl = '';
            if (typeof window !== 'undefined') {
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalhost) {
                    console.log("[App Config] Приложение запущено локально, используем локальный API сервер для загрузки.");
                    apiUrl = '/api/getConfigReadOnly'; // Предполагаемый путь для локального API прокси
                } else {
                    console.log("[App Config] Приложение запущено НЕ локально, используем Netlify Functions для загрузки: /.netlify/functions/getConfigReadOnly");
                    apiUrl = '/.netlify/functions/getConfigReadOnly';
                }
            } else {
                // Для SSR или других сред, предполагаем использование Netlify Functions
                console.log("[App Config] window не определен (SSR), используем Netlify Functions для загрузки: /.netlify/functions/getConfigReadOnly");
                apiUrl = '/.netlify/functions/getConfigReadOnly';
            }
            
            // Подготавливаем заголовки
            const headers = {
                'Content-Type': 'application/json',
            };
            
            // Добавляем заголовок с адресом пользователя, если он есть и определен
            if (userAddress) {
                console.log("[App Config] Добавляем заголовок X-User-Address для Netlify Function:", userAddress);
                headers['X-User-Address'] = userAddress;
            }
            
            // Выполняем запрос к API
            console.log("[App Config] Выполняем запрос к API:", apiUrl);
            const response = await fetch(apiUrl, {
                method: 'GET', // Предполагаем, что getConfigReadOnly использует GET
                headers: headers,
                signal: AbortSignal.timeout(10000) // 10 секунд таймаут
            });
            
            console.log("[App Config] Ответ от сервера (readonly/user):", response.status, response.statusText);
            
            if (response.ok) {
                const serverConfig = await response.json();
                console.log("[App Config] Ответ от сервера (readonly/user) (parsed):", serverConfig);
                
                // Проверяем структуру ответа
                let configData = serverConfig;
                if (serverConfig && typeof serverConfig === 'object' && serverConfig.config) {
                    configData = serverConfig.config;
                }
                
                // Объединяем с дефолтной конфигурацией на случай, если какие-то поля отсутствуют
                const mergedConfig = { ...DEFAULT_ADMIN_CONFIG, ...configData };
                console.log("[App Config] Конфигурация успешно загружена с сервера (readonly/user):", mergedConfig);
                
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
                
                // Обновляем глобальную переменную текущей конфигурации
                CURRENT_APP_CONFIG = mergedConfig;
                return mergedConfig;
            } else if (response.status === 404) {
                console.log("[App Config] Конфигурация на сервере не найдена (readonly/user), будет использована дефолтная или локальная.");
                // Продолжаем к локальной загрузке
            } else {
                const errorText = await response.text();
                console.warn(`[App Config] Сервер вернул ошибку при загрузке конфигурации (readonly/user): ${response.status} ${response.statusText} - ${errorText}`);
                // В случае ошибки сервера, пробуем использовать локальную конфигурацию
            }
        } catch (e) {
            console.error("[App Config] Ошибка сети при загрузке конфигурации с сервера (readonly/user):", e);
            if (e.name === 'AbortError') {
                console.error("[App Config] Таймаут при загрузке конфигурации с сервера (readonly/user)");
                throw new Error("Таймаут при загрузке конфигурации с сервера");
            }
            // Продолжаем к локальной загрузке как резерв
        }
        // === КОНЕЦ ЗАГРУЗКИ НА ОБЫЧНЫХ СТРАНИЦАХ ===
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
                console.log(`[App Config] CACHE_DURATION_MS обновлено из localStorage до: ${CACHE_DURATION_MS}мс (на основе ${parsedConfig.updateIntervalMinutes} минут)`);
            }
            
            // Обновляем глобальную переменную текущей конфигурации
            CURRENT_APP_CONFIG = parsedConfig;
            return parsedConfig;
        } else {
            console.log("[App Config] Конфигурация в localStorage не найдена.");
        }
    } catch (e) {
        console.error("[App Config] Ошибка при загрузке конфигурации из localStorage:", e);
    }
    
    // 3. Возврат дефолтной конфигурации
    console.log("[App Config] Конфигурация не найдена ни на сервере, ни в localStorage, используем дефолтную.");
    
    // Обновляем глобальную константу CACHE_DURATION_MS на основе дефолта
    CACHE_DURATION_MS = DEFAULT_ADMIN_CONFIG.updateIntervalMinutes * 60 * 1000;
    console.log(`[App Config] CACHE_DURATION_MS обновлено до дефолтного: ${CACHE_DURATION_MS}мс (на основе ${DEFAULT_ADMIN_CONFIG.updateIntervalMinutes} минут)`);
    
    // Обновляем глобальную переменную текущей конфигурации
    CURRENT_APP_CONFIG = { ...DEFAULT_ADMIN_CONFIG };
    return { ...DEFAULT_ADMIN_CONFIG };
};
// === КОНЕЦ ОСНОВНОЙ ФУНКЦИИ ЗАГРУЗКИ ===

// === ФУНКЦИЯ СОХРАНЕНИЯ ===
/**
 * Сохраняет конфигурацию администратора.
 * @param {Object} config Объект конфигурации для сохранения
 * @param {string} adminAddress Адрес кошелька администратора
 * @returns {Promise<void>}
 */
export const saveAppConfig = async (config, adminAddress) => {
    console.log("[App Config] Начало сохранения конфигурации", config, adminAddress);
    
    // 1. Попытка сохранения на сервере (локальный API или Netlify Functions)
    if (adminAddress) {
        try {
            console.log(`[App Config] Попытка сохранения конфигурации на сервере (админка) для ${adminAddress}...`);
            
            // Определяем URL для API в зависимости от среды выполнения
            let apiUrl = '';
            if (typeof window !== 'undefined') {
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalhost) {
                    console.log("[App Config] Приложение запущено локально, используем локальный API сервер для сохранения.");
                    apiUrl = '/api/saveConfig'; // Предполагаемый путь для локального API прокси
                } else {
                    console.log("[App Config] Приложение запущено НЕ локально, используем Netlify Functions для сохранения: /.netlify/functions/saveConfig");
                    apiUrl = '/.netlify/functions/saveConfig';
                }
            } else {
                // Для SSR или других сред, предполагаем использование Netlify Functions
                console.log("[App Config] window не определен (SSR), используем Netlify Functions для сохранения: /.netlify/functions/saveConfig");
                apiUrl = '/.netlify/functions/saveConfig';
            }
            
            // Подготавливаем заголовки
            const headers = {
                'Content-Type': 'application/json',
                // Передаем адрес администратора в заголовке
                'X-Admin-Address': adminAddress,
            };
            
            // Выполняем запрос к API
            console.log("[App Config] Выполняем запрос к API:", apiUrl);
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
                
                // Сохраняем в localStorage как резервный вариант
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
                    
                    // Обновляем глобальную переменную текущей конфигурации
                    CURRENT_APP_CONFIG = config;
                    return; // Успешно сохранено на сервере
                } catch (e) {
                    console.error("[App Config] Ошибка при сохранении конфигурации в localStorage:", e);
                    throw new Error("Конфигурация сохранена на сервере, но не в локальном хранилище.");
                }
            } else if (response.status === 403) {
                const errorText = await response.text();
                console.warn(`[App Config] Доступ запрещен при сохранении: ${response.status} ${response.statusText} - ${errorText}`);
                throw new Error(`Доступ запрещен: ${errorText}`);
            } else {
                const errorText = await response.text();
                console.warn(`[App Config] Сервер вернул ошибку при сохранении конфигурации: ${response.status} ${response.statusText} - ${errorText}`);
                throw new Error(`Ошибка сервера при сохранении: ${errorText}`);
            }
        } catch (e) {
            console.error("[App Config] Ошибка сети при сохранении конфигурации на сервере:", e);
            if (e.name === 'AbortError') {
                console.error("[App Config] Таймаут при сохранении конфигурации на сервере");
                throw new Error("Таймаут при сохранении конфигурации на сервере");
            }
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
        
        // Обновляем глобальную переменную текущей конфигурации
        CURRENT_APP_CONFIG = config;
    } catch (e) {
        console.error("[App Config] Ошибка при сохранении конфигурации в localStorage:", e);
        throw new Error("Не удалось сохранить конфигурацию ни на сервере (локальный API или Netlify Functions), ни локально.");
    }
};
// === КОНЕЦ ФУНКЦИИ СОХРАНЕНИЯ ===

// === ФУНКЦИИ ДОСТУПА К КОНКРЕТНЫМ ЧАСТЯМ КОНФИГУРАЦИИ ===
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
    console.log("[App Config] Возврат дефолтной конфигурации токенов:", DEFAULT_ADMIN_CONFIG.tokenServices);
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
    console.log("[App Config] Возврат дефолтной конфигурации цен:", DEFAULT_ADMIN_CONFIG.priceServices);
    return DEFAULT_ADMIN_CONFIG.priceServices;
};

/**
 * Обновляет настройки сервисов для получения токенов в localStorage.
 * @param {Object} newTokenServicesConfig - Новые настройки сервисов токенов
 */
export const updateTokenServicesConfig = (newTokenServicesConfig) => {
    try {
        const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
        let config = DEFAULT_ADMIN_CONFIG;
        if (configStr) {
            config = JSON.parse(configStr);
        }
        
        config.tokenServices = newTokenServicesConfig;
        localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
        console.log("[App Config] Настройки сервисов токенов обновлены в localStorage:", newTokenServicesConfig);
        
        // Отправляем кастомное событие для синхронизации между вкладками
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('appConfigUpdated', { detail: config }));
        }
    } catch (e) {
        console.error("[App Config] Ошибка при обновлении настроек сервисов токенов в localStorage:", e);
    }
};

/**
 * Обновляет настройки сервисов для получения цен в localStorage.
 * @param {Object} newPriceServicesConfig - Новые настройки сервисов цен
 */
export const updatePriceServicesConfig = (newPriceServicesConfig) => {
    try {
        const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
        let config = DEFAULT_ADMIN_CONFIG;
        if (configStr) {
            config = JSON.parse(configStr);
        }
        
        config.priceServices = newPriceServicesConfig;
        localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
        console.log("[App Config] Настройки сервисов цен обновлены в localStorage:", newPriceServicesConfig);
        
        // Отправляем кастомное событие для синхронизации между вкладками
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('appConfigUpdated', { detail: config }));
        }
    } catch (e) {
        console.error("[App Config] Ошибка при обновлении настроек сервисов цен в localStorage:", e);
    }
};

/**
 * Обновляет интервал обновления в localStorage.
 * @param {number} newIntervalMinutes - Новый интервал обновления в минутах
 */
export const updateUpdateIntervalMinutes = (newIntervalMinutes) => {
    try {
        const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
        let config = DEFAULT_ADMIN_CONFIG;
        if (configStr) {
            config = JSON.parse(configStr);
        }
        
        config.updateIntervalMinutes = newIntervalMinutes;
        localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
        console.log("[App Config] Интервал обновления обновлен в localStorage:", newIntervalMinutes);
        
        // Обновляем глобальную константу CACHE_DURATION_MS
        if (typeof newIntervalMinutes === 'number' && newIntervalMinutes > 0) {
            CACHE_DURATION_MS = newIntervalMinutes * 60 * 1000;
            console.log(`[App Config] CACHE_DURATION_MS обновлено до: ${CACHE_DURATION_MS}мс (на основе ${newIntervalMinutes} минут)`);
        }
        
        // Отправляем кастомное событие для синхронизации между вкладками
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('appConfigUpdated', { detail: config }));
        }
    } catch (e) {
        console.error("[App Config] Ошибка при обновлении интервала обновления в localStorage:", e);
    }
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
            // ... (логика для localhost, если есть)
        } else {
            console.log("[App Config] Приложение запущено НЕ локально, используем Netlify Functions или localStorage.");
            
            // Для продакшена или других сред используем Netlify Functions или localStorage
            // Пробуем загрузить конфигурацию через Netlify Functions
            try {
                const headers = {
                    'Content-Type': 'application/json',
                };
                
                // Добавляем заголовок с адресом пользователя, если он есть и определен
                if (finalUserAddress) {
                    console.log("[App Config] Добавляем заголовок X-User-Address для Netlify Function:", finalUserAddress);
                    headers['X-User-Address'] = finalUserAddress;
                }
                
                console.log("[App Config] Выполняем запрос к /.netlify/functions/getConfigReadOnly...");
                const response = await fetch('/.netlify/functions/getConfigReadOnly', {
                    method: 'GET', // Предполагаем GET
                    headers: headers,
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });
                
                if (response.ok) {
                    const serverConfig = await response.json();
                    console.log("[App Config] Ответ от сервера (getConfigReadOnly) (parsed):", serverConfig);
                    
                    // Проверяем структуру ответа
                    let configData = serverConfig;
                    if (serverConfig && typeof serverConfig === 'object' && serverConfig.config) {
                        configData = serverConfig.config;
                    }
                    
                    const interval = configData.updateIntervalMinutes;
                    if (interval !== undefined && typeof interval === 'number' && interval > 0) {
                        console.log("[App Config] Интервал обновления из серверного ответа:", interval);
                        return interval;
                    } else {
                        console.warn(`[App Config] Интервал обновления в ответе некорректен или отсутствует: ${interval}. Продолжаем к localStorage.`);
                    }
                } else {
                    const errorText = await response.text();
                    console.warn(`[App Config] Netlify Functions вернул ошибку при загрузке конфигурации: ${response.status} ${response.statusText} - ${errorText}`);
                }
            } catch (e) {
                console.error("[App Config] Ошибка сети при загрузке конфигурации с Netlify Functions:", e);
                if (e.name === 'AbortError') {
                    console.error("[App Config] Таймаут при загрузке конфигурации с Netlify Functions");
                }
            }
        }
    } else {
        console.log("[App Config] window не определен (SSR), используем localStorage или дефолт.");
    }
    
    // 2. Загрузка из localStorage (резервный вариант)
    try {
        console.log("[App Config] Попытка загрузки интервала из localStorage по ключу:", ADMIN_CONFIG_KEY);
        const configStr = localStorage.getItem(ADMIN_CONFIG_KEY);
        if (configStr) {
            const parsedConfig = JSON.parse(configStr);
            console.log("[App Config] Конфигурация из localStorage (parsed):", JSON.stringify(parsedConfig, null, 2));
            
            const interval = parsedConfig.updateIntervalMinutes;
            if (interval !== undefined && typeof interval === 'number' && interval > 0) {
                console.log("[App Config] Интервал обновления из localStorage:", interval);
                return interval;
            } else {
                console.warn(`[App Config] Интервал обновления в localStorage некорректен или отсутствует: ${interval}`);
            }
        } else {
            console.log("[App Config] Конфигурация в localStorage не найдена по ключу:", ADMIN_CONFIG_KEY);
        }
    } catch (e) {
        console.error("[App Config] Ошибка при загрузке интервала из localStorage:", e);
    }
    
    console.log("[App Config] Интервал обновления не найден ни на сервере, ни в localStorage, используем дефолтный:", DEFAULT_ADMIN_CONFIG.updateIntervalMinutes);
    return DEFAULT_ADMIN_CONFIG.updateIntervalMinutes;
};