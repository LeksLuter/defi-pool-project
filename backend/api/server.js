// backend/api/server.js
const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к Neon
const connectToNeon = async () => {
  if (!process.env.NEON_DATABASE_URL) {
    throw new Error('NEON_DATABASE_URL не установлен в переменных окружения');
  }

  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();
  console.log('[API Server] Подключение к Neon успешно');
  return client;
};

// Создание таблицы admin_configs если она не существует
const createAdminConfigsTable = async () => {
  const client = await connectToNeon();
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

// Получение конфигурации администратора из базы данных
const getAdminConfigFromDB = async (adminAddress) => {
  const client = await connectToNeon();
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

// Сохранение конфигурации администратора в базу данных
const saveAdminConfigToDB = async (adminAddress, configData) => {
  const client = await connectToNeon();
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


// GET /api/admin/config - Получить конфигурацию администратора или пользователя
app.get('/api/admin/config', async (req, res) => {
  const adminAddress = req.headers['x-admin-address'];
  const userAddress = req.headers['x-user-address'];
  
  console.log(`[API Server] GET /api/admin/config called with adminAddress: ${adminAddress}, userAddress: ${userAddress}`);
  
  // Если нет адреса администратора, но есть адрес пользователя, используем его
  const targetAddress = adminAddress || userAddress || 'default_user';
  
  // Если адрес пользователя не указан, это может быть запрос от обычного пользователя
  if (!adminAddress && !userAddress) {
    console.log('[API Server] Запрос без адреса пользователя, возвращаем дефолтную конфигурацию');
    return res.status(200).json(DEFAULT_ADMIN_CONFIG);
  }

  try {
    // Создаем таблицу если она не существует
    await createAdminConfigsTable();
    
    // Получаем конфигурацию из базы данных
    const config = await getAdminConfigFromDB(targetAddress);
    
    console.log(`[API Server] Successfully retrieved config for ${targetAddress}`);
    res.status(200).json(config);
  } catch (error) {
    console.error('[API Server] Error retrieving config:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при получении конфигурации',
      details: error.message
    });
  }
});

// POST /api/admin/config - Сохранить конфигурацию администратора или пользователя
app.post('/api/admin/config', async (req, res) => {
  const adminAddress = req.headers['x-admin-address'];
  const userAddress = req.headers['x-user-address'];
  const configData = req.body;
  
  console.log(`[API Server] POST /api/admin/config called with adminAddress: ${adminAddress}, userAddress: ${userAddress}`);
  console.log('[API Server] Config data:', configData);
  
  // Для сохранения нужен адрес администратора
  const targetAddress = adminAddress || userAddress;
  
  if (!targetAddress) {
    console.warn('[API Server] X-Admin-Address or X-User-Address header is missing');
    return res.status(400).json({ 
      error: 'Требуется заголовок X-Admin-Address или X-User-Address' 
    });
  }

  if (!configData || typeof configData !== 'object') {
    console.warn('[API Server] Invalid config data format');
    return res.status(400).json({ 
      error: 'Неверный формат данных конфигурации' 
    });
  }

  try {
    // Создаем таблицу если она не существует
    await createAdminConfigsTable();
    
    // Сохраняем конфигурацию в базу данных
    await saveAdminConfigToDB(targetAddress, configData);
    
    console.log(`[API Server] Конфигурация успешно сохранена в базе для адреса ${targetAddress}`);
    res.status(200).json({ 
      message: 'Конфигурация сохранена в базе данных',
      address: targetAddress
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
    
    // Создаем таблицу при запуске сервера
    await createAdminConfigsTable();
    
    app.listen(PORT, () => {
      console.log(`[API Server] Локальный API сервер запущен на порту ${PORT}`);
      console.log(`[API Server] Health check endpoint: http://localhost:${PORT}/api/health`);
      console.log(`[API Server] Admin config endpoints:`);
      console.log(`[API Server]   GET  http://localhost:${PORT}/api/admin/config`);
      console.log(`[API Server]   POST http://localhost:${PORT}/api/admin/config`);
    });
  } catch (error) {
    console.error('[API Server] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
// === КОНЕЦ ЗАПУСКА СЕРВЕРА ===

module.exports = app;