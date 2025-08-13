const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

// Create Express app FIRST
const app = express();

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
 * Создает таблицу admin_configs если она не существует
 */
const createAdminConfigsTable = async () => {
  const client = await connectToNeon(false); // Используем admin подключение для создания таблицы
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_configs (
        address TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[API Server] Таблица admin_configs создана или уже существует');
  } finally {
    await client.end();
  }
};

/**
 * Получает конфигурацию администратора из базы данных
 * @param {string} adminAddress Адрес администратора
 * @param {boolean} useReadOnly Использовать ли подключение только для чтения
 * @returns {Promise<Object>} Объект конфигурации
 */
const getAdminConfigFromDB = async (adminAddress, useReadOnly = false) => {
  const client = await connectToNeon(useReadOnly);
  try {
    const result = await client.query(
      'SELECT config FROM admin_configs WHERE address = $1',
      [adminAddress]
    );

    if (result.rows.length > 0) {
      console.log(`[API Server] Конфигурация найдена в базе для адреса ${adminAddress}`);
      return result.rows[0].config;
    } else {
      console.log(`[API Server] Конфигурация не найдена в базе для адреса ${adminAddress}, возвращаем дефолтную`);
      return DEFAULT_ADMIN_CONFIG;
    }
  } finally {
    await client.end();
  }
};

/**
 * Сохраняет конфигурацию администратора в базу данных
 * @param {string} adminAddress Адрес администратора
 * @param {Object} configData Объект конфигурации
 */
const saveAdminConfigToDB = async (adminAddress, configData) => {
  // Только админ может сохранять конфигурацию, используем основное подключение
  const client = await connectToNeon(false);
  try {
    await client.query(
      `INSERT INTO admin_configs (address, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (address)
       DO UPDATE SET config = $2, updated_at = NOW()`,
      [adminAddress, configData]
    );
    console.log(`[API Server] Конфигурация сохранена в базе для адреса ${adminAddress}`);
  } finally {
    await client.end();
  }
};

// === КОНЕЦ ФУНКЦИЙ РАБОТЫ С БАЗОЙ ДАННЫХ ===

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

// GET /api/admin/config - Получить конфигурацию администратора (только для админки)
app.get('/api/admin/config', async (req, res) => {
  const adminAddress = req.headers['x-admin-address'];
  console.log(`[API Server] GET /api/admin/config called with adminAddress: ${adminAddress}`);

  if (!adminAddress) {
    console.warn('[API Server] X-Admin-Address header is missing');
    return res.status(400).json({ error: 'Требуется заголовок X-Admin-Address' });
  }

  try {
    // Создаем таблицу если она не существует
    await createAdminConfigsTable();

    // Получаем конфигурацию из базы данных (используем основное подключение)
    const config = await getAdminConfigFromDB(adminAddress, false);

    console.log(`[API Server] Successfully retrieved config for ${adminAddress}`);
    res.status(200).json(config);
  } catch (error) {
    console.error('[API Server] Error retrieving config:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера при получении конфигурации',
      details: error.message
    });
  }
});

// GET /api/admin/config/read-only - Получить конфигурацию администратора (для чтения обычными пользователями)
app.get('/api/admin/config/read-only', async (req, res) => {
  const userAddress = req.headers['x-user-address'];
  const targetAdminAddress = req.headers['x-target-admin-address'] || req.query.targetAdminAddress;

  console.log(`[API Server] GET /api/admin/config/read-only called with userAddress: ${userAddress}, targetAdminAddress: ${targetAdminAddress}`);

  if (!userAddress) {
    console.warn('[API Server] X-User-Address header is missing');
    return res.status(400).json({ error: 'Требуется заголовок X-User-Address' });
  }

  if (!targetAdminAddress) {
    console.warn('[API Server] X-Target-Admin-Address header or targetAdminAddress query param is missing');
    return res.status(400).json({ error: 'Требуется заголовок X-Target-Admin-Address или параметр targetAdminAddress в query string' });
  }

  try {
    // Создаем таблицу если она не существует (на всякий случай, хотя это должен делать только админ)
    await createAdminConfigsTable();

    // Получаем конфигурацию из базы данных (используем подключение только для чтения)
    const config = await getAdminConfigFromDB(targetAdminAddress, true);

    console.log(`[API Server] Successfully retrieved config (readonly) for target admin ${targetAdminAddress} by user ${userAddress}`);
    res.status(200).json(config);
  } catch (error) {
    console.error('[API Server] Error retrieving config (readonly):', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера при получении конфигурации (readonly)',
      details: error.message
    });
  }
});

// POST /api/admin/config - Сохранить конфигурацию администратора (только для админки)
app.post('/api/admin/config', async (req, res) => {
  const adminAddress = req.headers['x-admin-address'];
  const configData = req.body;
  console.log(`[API Server] POST /api/admin/config called with adminAddress: ${adminAddress}`);
  console.log('[API Server] Config data:', configData);

  if (!adminAddress) {
    console.warn('[API Server] X-Admin-Address header is missing');
    return res.status(400).json({ error: 'Требуется заголовок X-Admin-Address' });
  }

  if (!configData || typeof configData !== 'object') {
    console.warn('[API Server] Invalid config data format');
    return res.status(400).json({ error: 'Неверный формат данных конфигурации' });
  }

  try {
    // Создаем таблицу если она не существует
    await createAdminConfigsTable();

    // Сохраняем конфигурацию в базу данных (используем основное подключение)
    await saveAdminConfigToDB(adminAddress, configData);

    console.log(`[API Server] Successfully saved config for ${adminAddress}`);
    res.status(200).json({
      message: 'Конфигурация сохранена в базе данных',
      address: adminAddress
    });
  } catch (error) {
    console.error('[API Server] Error saving config:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера при сохранении конфигурации',
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

    // Создаем таблицу при запуске сервера
    await createAdminConfigsTable();

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`[API Server] Локальный API сервер запущен на порту ${PORT}`);
      console.log(`[API Server] Health check endpoint: http://localhost:${PORT}/api/health`);
      console.log(`[API Server] Admin config endpoints:`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/admin/config`);
      console.log(`[API Server] POST http://localhost:${PORT}/api/admin/config`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/admin/config/read-only`);
    });
  } catch (error) {
    console.error('[API Server] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();