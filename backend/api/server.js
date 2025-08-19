// backend/api/server.js

const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

// Create Express app FIRST
const app = express();

// === КОНСТАНТЫ ===
const DEFAULT_APP_CONFIG = {
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
  // Интервал обновления данных (в минутах)
  updateIntervalMinutes: 5
};

// === КОНЕЦ КОНСТАНТ ===

// === MIDDLEWARE ===
// Включаем CORS для всех маршрутов
app.use(cors());

// Парсим JSON тело запроса
app.use(express.json());

// Логирование всех входящих запросов
app.use((req, res, next) => {
  console.log(`[API Server] ${req.method} ${req.path} called`);
  console.log(`[API Server] Headers:`, req.headers);
  console.log(`[API Server] Query:`, req.query);
  console.log(`[API Server] Body:`, req.body);
  next();
});

/**
 * Подключается к базе данных Neon.
 * @param {boolean} useReadOnly - Если true, использует NEON_DATABASE_URL_READONLY, иначе NEON_DATABASE_URL.
 * @returns {Promise<Client>} - Экземпляр клиента pg.
 */
const connectToNeon = async (useReadOnly = false) => {
  // Определяем URL для подключения в зависимости от флага useReadOnly
  let databaseUrl;
  if (useReadOnly) {
    databaseUrl = process.env.NEON_DATABASE_URL_READONLY;
    console.log("[API Server] Используется NEON_DATABASE_URL_READONLY для подключения (readonly)");
  } else {
    databaseUrl = process.env.NEON_DATABASE_URL;
    console.log("[API Server] Используется NEON_DATABASE_URL для подключения (admin/read-write)");
  }

  if (!databaseUrl) {
    // Если URL для readonly не задан, пытаемся использовать основной URL
    if (useReadOnly) {
      console.warn("[API Server] NEON_DATABASE_URL_READONLY не найден, пробуем использовать NEON_DATABASE_URL");
      databaseUrl = process.env.NEON_DATABASE_URL;
    }
    
    if (!databaseUrl) {
      throw new Error('NEON_DATABASE_URL не задан в переменных окружения');
    }
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log(`[API Server] Подключение к Neon (${useReadOnly ? 'readonly' : 'admin'}) успешно`);
    return client;
  } catch (error) {
    console.error(`[API Server] Ошибка подключения к Neon (${useReadOnly ? 'readonly' : 'admin'}):`, error);
    throw error;
  }
};

/**
 * Создает необходимые таблицы в базе данных, если они еще не существуют.
 * @returns {Promise<void>}
 */
const createTables = async () => {
  const client = await connectToNeon(false); // Используем основное подключение для создания таблиц
  try {
    // Создание таблицы для конфигурации приложения
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        id SERIAL PRIMARY KEY,
        config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[API Server] Таблица app_config создана или уже существует");

    // Создание таблицы для списка администраторов
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum адрес, 42 символа с '0x'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[API Server] Таблица admins создана или уже существует");
  } finally {
    await client.end();
  }
};

/**
 * Получает конфигурацию приложения из базы данных.
 * @param {boolean} useReadOnly - Если true, использует подключение только для чтения.
 * @returns {Promise<Object>} - Объект конфигурации приложения.
 */
const getAppConfigFromDB = async (useReadOnly = true) => {
  const client = await connectToNeon(useReadOnly);
  try {
    const result = await client.query('SELECT config FROM app_config ORDER BY id DESC LIMIT 1');
    if (result.rows.length > 0) {
      console.log("[API Server] Конфигурация приложения успешно получена из БД");
      return result.rows[0].config;
    } else {
      console.log("[API Server] Конфигурация в БД не найдена, возвращаем дефолтную");
      return DEFAULT_APP_CONFIG;
    }
  } finally {
    await client.end();
  }
};

/**
 * Сохраняет конфигурацию приложения в базу данных.
 * @param {Object} configData - Объект конфигурации для сохранения.
 * @returns {Promise<void>}
 */
const saveAppConfigToDB = async (configData) => {
  const client = await connectToNeon(false); // Используем основное подключение для записи
  try {
    // Обновляем существующую запись или вставляем новую
    // Используем INSERT ... ON CONFLICT для обновления
    await client.query(
      `INSERT INTO app_config (config) 
       VALUES ($1) 
       ON CONFLICT (id) 
       DO UPDATE SET config = $1, updated_at = CURRENT_TIMESTAMP`,
      [configData]
    );
    console.log("[API Server] Конфигурация приложения сохранена в базе");
  } finally {
    await client.end();
  }
};

/**
 * Получает список администраторов из базы данных.
 * @returns {Promise<Array<string>>} - Массив адресов администраторов.
 */
const getAdminsFromDB = async () => {
  // Исправлено: используем основное подключение (не readonly) для получения списка админов
  // Это соответствует логике, что список админов запрашивается в контексте админки
  const client = await connectToNeon(false); // Используем основное подключение
  try {
    // Исправлено: используем правильное имя столбца added_at вместо created_at
    const result = await client.query('SELECT address FROM admins ORDER BY added_at ASC');
    const admins = result.rows.map(row => row.address);
    console.log("[API Server] Список администраторов успешно получен из БД");
    return admins;
  } finally {
    await client.end();
  }
};

/**
 * Добавляет адрес в список администраторов.
 * @param {string} address - Адрес для добавления.
 * @returns {Promise<void>}
 */
const addAdminToDB = async (address) => {
  const client = await connectToNeon(false); // Используем основное подключение для записи
  try {
    await client.query('INSERT INTO admins (address) VALUES ($1) ON CONFLICT (address) DO NOTHING', [address.toLowerCase()]);
    console.log(`[API Server] Адрес ${address} добавлен в список администраторов`);
  } finally {
    await client.end();
  }
};

/**
 * Удаляет адрес из списка администраторов.
 * @param {string} address - Адрес для удаления.
 * @returns {Promise<void>}
 */
const removeAdminFromDB = async (address) => {
  const client = await connectToNeon(false); // Используем основное подключение для записи
  try {
    await client.query('DELETE FROM admins WHERE address = $1', [address.toLowerCase()]);
    console.log(`[API Server] Адрес ${address} удален из списка администраторов`);
  } finally {
    await client.end();
  }
};

/**
 * Проверяет, является ли адрес администратором.
 * @param {string} address - Адрес для проверки.
 * @returns {Promise<boolean>} - true если адрес в списке админов.
 */
const isAdminInDB = async (address) => {
  if (!address) return false;
  // Можно использовать readonly для проверки
  const client = await connectToNeon(true);
  try {
    const result = await client.query('SELECT 1 FROM admins WHERE address = $1', [address.toLowerCase()]);
    return result.rows.length > 0;
  } finally {
    await client.end();
  }
};

/**
 * Middleware для проверки прав администратора.
 * Проверяет заголовок X-Admin-Address и сверяет адрес с БД.
 */
const requireAdmin = async (req, res, next) => {
  try {
    const adminAddress = req.headers['x-admin-address'];
    console.log(`[API Server] Middleware requireAdmin called with address: ${adminAddress}`);

    if (!adminAddress) {
      console.warn('[API Server] Заголовок X-Admin-Address отсутствует');
      return res.status(400).json({ error: 'Требуется заголовок X-Admin-Address' });
    }

    const isAdmin = await isAdminInDB(adminAddress);
    if (!isAdmin) {
      console.warn(`[API Server] Адрес ${adminAddress} не найден в списке администраторов`);
      return res.status(403).json({ error: 'Доступ запрещен. Адрес не является администратором.' });
    }

    // Добавляем адрес администратора в объект запроса для дальнейшего использования
    req.adminAddress = adminAddress;
    console.log(`[API Server] Адрес ${adminAddress} подтвержден как администратор`);
    next();
  } catch (error) {
    console.error('[API Server] Ошибка проверки прав администратора:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при проверке прав администратора' });
  }
};

// === КОНЕЦ MIDDLEWARE ===

// === ENDPOINTS ===

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('[API Server] Health check endpoint called');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Локальный API сервер работает'
  });
});

// GET /api/app/config - Получить конфигурацию приложения (для чтения всеми пользователями или админами)
app.get('/api/app/config', async (req, res) => {
  // Пытаемся получить адрес из заголовка пользователя или администратора
  const userAddress = req.headers['x-user-address'];
  const adminAddress = req.headers['x-admin-address'];
  
  // Определяем, какой адрес использовать
  const effectiveAddress = userAddress || adminAddress;
  
  console.log(`[API Server] GET /api/app/config called with userAddress: ${userAddress}, adminAddress: ${adminAddress}`);
  console.log(`[API Server] Effective address for config request: ${effectiveAddress}`);
  
  if (!effectiveAddress) {
    console.warn('[API Server] X-User-Address or X-Admin-Address header is missing');
    return res.status(400).json({ error: 'Требуется заголовок X-User-Address или X-Admin-Address' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();
    
    // Получаем конфигурацию из базы данных (используем подключение только для чтения)
    // Админ может использовать этот же эндпоинт, просто передавая свой адрес в X-Admin-Address
    const config = await getAppConfigFromDB(true);
    console.log(`[API Server] Successfully retrieved app config for effective address ${effectiveAddress}`);
    
    res.status(200).json(config);
  } catch (error) {
    console.error('[API Server] Error retrieving app config:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при получении конфигурации приложения', details: error.message });
  }
});

// POST /api/app/config - Сохранить конфигурацию приложения (только для админки)
app.post('/api/app/config', requireAdmin, async (req, res) => {
  const adminAddress = req.adminAddress; // Берем из middleware
  const configData = req.body;
  console.log(`[API Server] POST /api/app/config called with adminAddress: ${adminAddress}`);
  console.log('[API Server] Config ', configData);

  if (!configData || typeof configData !== 'object') {
    console.warn('[API Server] Invalid config data format');
    return res.status(400).json({ error: 'Неверный формат данных конфигурации' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();

    // Сохраняем конфигурацию в базу данных (используем основное подключение)
    await saveAppConfigToDB(configData);
    console.log(`[API Server] Successfully saved app config by admin ${adminAddress}`);

    res.status(200).json({
      message: 'Конфигурация приложения сохранена в базе данных',
      updatedBy: adminAddress
    });
  } catch (error) {
    console.error('[API Server] Error saving app config:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при сохранении конфигурации приложения', details: error.message });
  }
});

// GET /api/admins - Получить список администраторов (только для админки)
app.get('/api/admins', requireAdmin, async (req, res) => {
  const adminAddress = req.adminAddress; // Берем из middleware
  console.log(`[API Server] GET /api/admins called by admin: ${adminAddress}`);

  try {
    // Создаем таблицы если они не существуют
    await createTables();
    
    const admins = await getAdminsFromDB();
    console.log(`[API Server] Successfully retrieved admins list for admin ${adminAddress}`);
    res.status(200).json({ admins });
  } catch (error) {
    console.error('[API Server] Error retrieving admins list:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при получении списка администраторов', details: error.message });
  }
});

// GET /api/admins/check - Проверить, является ли адрес администратором (для чтения всеми)
app.get('/api/admins/check', async (req, res) => {
  const userAddress = req.query.address;
  console.log(`[API Server] GET /api/admins/check called with address: ${userAddress}`);

  if (!userAddress) {
    console.warn('[API Server] address query param is missing');
    return res.status(400).json({ error: 'Требуется параметр address в query string' });
  }

  try {
    const isAdmin = await isAdminInDB(userAddress);
    console.log(`[API Server] isAdmin check result for ${userAddress}: ${isAdmin}`);
    res.status(200).json({ isAdmin, address: userAddress });
  } catch (error) {
    console.error('[API Server] Error checking admin status:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при проверке прав администратора', details: error.message });
  }
});

// POST /api/admins - Добавить администратора (только для админки)
app.post('/api/admins', requireAdmin, async (req, res) => {
  const adminAddress = req.adminAddress; // Берем из middleware
  const { newAdminAddress } = req.body;
  console.log(`[API Server] POST /api/admins called by admin: ${adminAddress} to add: ${newAdminAddress}`);

  if (!newAdminAddress) {
    return res.status(400).json({ error: 'Требуется поле newAdminAddress в теле запроса' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();
    
    await addAdminToDB(newAdminAddress);
    console.log(`[API Server] Successfully added admin ${newAdminAddress} by admin ${adminAddress}`);
    res.status(200).json({ message: `Адрес ${newAdminAddress} добавлен в список администраторов` });
  } catch (error) {
    console.error('[API Server] Error adding admin:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при добавлении администратора', details: error.message });
  }
});

// DELETE /api/admins/:address - Удалить администратора (только для админки)
app.delete('/api/admins/:address', requireAdmin, async (req, res) => {
  const adminAddress = req.adminAddress; // Берем из middleware
  const addressToRemove = req.params.address;
  console.log(`[API Server] DELETE /api/admins/:address called by admin: ${adminAddress} to remove: ${addressToRemove}`);

  if (!addressToRemove) {
    return res.status(400).json({ error: 'Требуется адрес в URL' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();
    
    await removeAdminFromDB(addressToRemove);
    console.log(`[API Server] Successfully removed admin ${addressToRemove} by admin ${adminAddress}`);
    res.status(200).json({ message: `Адрес ${addressToRemove} удален из списка администраторов` });
  } catch (error) {
    console.error('[API Server] Error removing admin:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при удалении администратора', details: error.message });
  }
});

// Обработчик для всех остальных маршрутов
app.use('*', (req, res) => {
  console.log(`[API Server] Route not found: ${req.originalUrl}`);
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error('[API Server] Unhandled error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера', details: err.message });
});

// === КОНЕЦ ENDPOINTS ===

// === ЗАПУСК СЕРВЕРА ===
const startServer = async () => {
  try {
    // Проверяем наличие NEON_DATABASE_URL
    if (!process.env.NEON_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL не задан в переменных окружения. Пожалуйста, проверьте ваш .env файл.');
    }

    // Создаем таблицы при запуске сервера
    console.log("[API Server] Создание таблиц при запуске...");
    await createTables();
    console.log("[API Server] Таблицы успешно созданы или уже существовали");

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`[API Server] Локальный API сервер запущен на порту ${PORT}`);
      console.log(`[API Server] Health check endpoint: http://localhost:${PORT}/api/health`);
      console.log(`[API Server] App config endpoints:`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/app/config`);
      console.log(`[API Server] POST http://localhost:${PORT}/api/app/config`);
      console.log(`[API Server] Admin management endpoints:`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/admins`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/admins/check`);
      console.log(`[API Server] POST http://localhost:${PORT}/api/admins`);
      console.log(`[API Server] DELETE http://localhost:${PORT}/api/admins/:address`);
    });
  } catch (error) {
    console.error('[API Server] Ошибка при запуске сервера:', error);
    process.exit(1);
  }
};

// Запускаем сервер
startServer();

module.exports = {
  // Экспортируем функции для использования в других модулях (например, для тестов)
  connectToNeon,
  createTables,
  getAppConfigFromDB,
  saveAppConfigToDB,
  getAdminsFromDB,
  addAdminToDB,
  removeAdminFromDB,
  isAdminInDB
};