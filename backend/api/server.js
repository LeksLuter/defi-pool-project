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

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Увеличиваем лимит для больших конфигов

// === ФУНКЦИИ РАБОТЫ С БАЗОЙ ДАННЫХ ===

/**
 * Подключается к базе данных Neon
 * @param {boolean} useReadOnly - Использовать ли подключение только для чтения
 * @returns {Promise<Client>} Подключенный клиент PostgreSQL
 */
const connectToNeon = async (useReadOnly = false) => {
  const databaseUrl = useReadOnly
    ? (process.env.NEON_DATABASE_URL_READONLY || process.env.NEON_DATABASE_URL)
    : process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(useReadOnly
      ? 'NEON_DATABASE_URL_READONLY или NEON_DATABASE_URL не установлен в переменных окружения'
      : 'NEON_DATABASE_URL не установлен в переменных окружения'
    );
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log(`[API Server] Подключение к Neon ${useReadOnly ? '(readonly)' : '(admin)'} успешно`);
  return client;
};

/**
 * Создает таблицы app_config и admins если они не существуют
 */
const createTables = async () => {
  const client = await connectToNeon(false); // Используем admin подключение для создания таблиц
  try {
    // Создание таблицы app_config
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        id SERIAL PRIMARY KEY, -- Уникальный ID для простоты
        config JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[API Server] Таблица app_config создана или уже существует');

    // Создание таблицы admins
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        address TEXT PRIMARY KEY,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[API Server] Таблица admins создана или уже существует');

    // Добавление дефолтной конфигурации, если её нет
    const configResult = await client.query('SELECT COUNT(*) FROM app_config');
    if (parseInt(configResult.rows[0].count) === 0) {
        await client.query(
            'INSERT INTO app_config (config) VALUES ($1)',
            [DEFAULT_APP_CONFIG]
        );
        console.log('[API Server] Дефолтная конфигурация добавлена в app_config');
    }
  } finally {
    await client.end();
  }
};

/**
 * Получает глобальную конфигурацию приложения из базы данных
 * @param {boolean} useReadOnly Использовать ли подключение только для чтения
 * @returns {Promise<Object>} Объект конфигурации
 */
const getAppConfigFromDB = async (useReadOnly = false) => {
  const client = await connectToNeon(useReadOnly);
  try {
    const result = await client.query('SELECT config FROM app_config ORDER BY id DESC LIMIT 1');

    if (result.rows.length > 0) {
      console.log(`[API Server] Конфигурация приложения найдена в базе`);
      return result.rows[0].config;
    } else {
      console.log(`[API Server] Конфигурация приложения не найдена в базе, возвращаем дефолтную`);
      return DEFAULT_APP_CONFIG;
    }
  } finally {
    await client.end();
  }
};

/**
 * Сохраняет глобальную конфигурацию приложения в базу данных
 * @param {Object} configData Объект конфигурации
 */
const saveAppConfigToDB = async (configData) => {
  // Только админ может сохранять конфигурацию, используем основное подключение
  const client = await connectToNeon(false);
  try {
    // Обновляем последнюю запись или вставляем новую, если таблица пуста
    await client.query(
      `INSERT INTO app_config (config, updated_at)
       VALUES ($1, NOW())
       ON CONFLICT (id) -- Предполагаем, что id - SERIAL PRIMARY KEY
       DO UPDATE SET config = $1, updated_at = NOW()`,
      [configData]
    );
    console.log(`[API Server] Конфигурация приложения сохранена в базе`);
  } finally {
    await client.end();
  }
};

/**
 * Проверяет, является ли адрес администратором
 * @param {string} address Адрес кошелька
 * @returns {Promise<boolean>} true если адрес в списке админов
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
 * Получает список всех администраторов
 * @returns {Promise<Array>} Массив адресов администраторов
 */
const getAdminsFromDB = async () => {
    const client = await connectToNeon(false); // Админ подключение для чтения списка
    try {
        const result = await client.query('SELECT address FROM admins ORDER BY added_at DESC');
        return result.rows.map(row => row.address);
    } finally {
        await client.end();
    }
};

/**
 * Добавляет нового администратора
 * @param {string} address Адрес кошелька
 */
const addAdminToDB = async (address) => {
    const client = await connectToNeon(false); // Только админ может добавлять
    try {
        await client.query(
            'INSERT INTO admins (address) VALUES ($1) ON CONFLICT (address) DO NOTHING',
            [address.toLowerCase()]
        );
        console.log(`[API Server] Адрес ${address} добавлен в список администраторов`);
    } finally {
        await client.end();
    }
};

/**
 * Удаляет администратора
 * @param {string} address Адрес кошелька
 */
const removeAdminFromDB = async (address) => {
    const client = await connectToNeon(false); // Только админ может удалять
    try {
        await client.query('DELETE FROM admins WHERE address = $1', [address.toLowerCase()]);
        console.log(`[API Server] Адрес ${address} удален из списка администраторов`);
    } finally {
        await client.end();
    }
};

// === КОНЕЦ ФУНКЦИЙ РАБОТЫ С БАЗОЙ ДАННЫХ ===

// === MIDDLEWARE ДЛЯ ПРОВЕРКИ АДМИНСТРАТОРА ===
const requireAdmin = async (req, res, next) => {
    const adminAddress = req.headers['x-admin-address'];
    if (!adminAddress) {
        return res.status(400).json({ error: 'Требуется заголовок X-Admin-Address' });
    }
    try {
        const isAdmin = await isAdminInDB(adminAddress);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Доступ запрещен. Адрес не является администратором.' });
        }
        req.adminAddress = adminAddress.toLowerCase(); // Передаем адрес дальше
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

// GET /api/app/config - Получить конфигурацию приложения (для чтения всеми пользователями)
app.get('/api/app/config', async (req, res) => {
  const userAddress = req.headers['x-user-address'];
  console.log(`[API Server] GET /api/app/config called with userAddress: ${userAddress}`);

  if (!userAddress) {
    console.warn('[API Server] X-User-Address header is missing');
    return res.status(400).json({ error: 'Требуется заголовок X-User-Address' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();

    // Получаем конфигурацию из базы данных (используем подключение только для чтения)
    const config = await getAppConfigFromDB(true);

    console.log(`[API Server] Successfully retrieved app config for user ${userAddress}`);
    res.status(200).json(config);
  } catch (error) {
    console.error('[API Server] Error retrieving app config (readonly):', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера при получении конфигурации приложения (readonly)',
      details: error.message
    });
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
    res.status(500).json({
      error: 'Внутренняя ошибка сервера при сохранении конфигурации приложения',
      details: error.message
    });
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
        res.status(200).json({ admins });
    } catch (error) {
        console.error('[API Server] Error retrieving admins list:', error);
        res.status(500).json({
            error: 'Внутренняя ошибка сервера при получении списка администраторов',
            details: error.message
        });
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
    // Создаем таблицы если они не существуют (на всякий случай)
    await createTables();

    // Проверяем, является ли адрес админом
    const isAdmin = await isAdminInDB(userAddress);

    console.log(`[API Server] isAdmin check for ${userAddress}: ${isAdmin}`);
    res.status(200).json({ isAdmin: isAdmin, address: userAddress });
  } catch (error) {
    console.error('[API Server] Error checking isAdmin:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера при проверке прав администратора',
      details: error.message
    });
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
        res.status(200).json({ message: `Адрес ${newAdminAddress} добавлен в список администраторов` });
    } catch (error) {
        console.error('[API Server] Error adding admin:', error);
        res.status(500).json({
            error: 'Внутренняя ошибка сервера при добавлении администратора',
            details: error.message
        });
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
        res.status(200).json({ message: `Адрес ${addressToRemove} удален из списка администраторов` });
    } catch (error) {
        console.error('[API Server] Error removing admin:', error);
        res.status(500).json({
            error: 'Внутренняя ошибка сервера при удалении администратора',
            details: error.message
        });
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
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    details: err.message
  });
});

// === КОНЕЦ ENDPOINTS ===

// === ЗАПУСК СЕРВЕРА ===
const startServer = async () => {
  try {
    // Проверяем наличие NEON_DATABASE_URL
    if (!process.env.NEON_DATABASE_URL) {
      console.warn('[API Server] WARNING: NEON_DATABASE_URL not set in environment variables');
      console.warn('[API Server] Please set NEON_DATABASE_URL in your .env file');
    } else {
      console.log('[API Server] NEON_DATABASE_URL is set');
    }

    // Проверяем наличие NEON_DATABASE_URL_READONLY
    if (process.env.NEON_DATABASE_URL_READONLY) {
      console.log('[API Server] NEON_DATABASE_URL_READONLY is set');
    } else {
      console.log('[API Server] NEON_DATABASE_URL_READONLY is not set, will use NEON_DATABASE_URL for readonly operations');
    }

    // Создаем таблицы при запуске сервера
    await createTables();

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
    console.error('[API Server] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();