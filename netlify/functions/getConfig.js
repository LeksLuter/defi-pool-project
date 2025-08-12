// netlify/functions/getConfig.js
const { Client } = require('pg');

// === КОНСТАНТЫ ===
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

// === ФУНКЦИИ РАБОТЫ С БАЗОЙ ДАННЫХ ===
/**
 * Подключается к базе данных Neon
 * @returns {Promise<Client>} Клиент базы данных
 */
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

/**
 * Создает таблицу admin_configs если она не существует
 */
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

/**
 * Получает конфигурацию администратора из базы данных
 * @param {string} adminAddress Адрес администратора
 * @returns {Promise<Object>} Объект конфигурации
 */
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

/**
 * Сохраняет конфигурацию администратора в базу данных
 * @param {string} adminAddress Адрес администратора
 * @param {Object} config Объект конфигурации
 */
const saveAdminConfigToDB = async (adminAddress, config) => {
  const client = await connectToNeon();
  try {
    await client.query(
      `INSERT INTO admin_configs (address, config, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (address) 
       DO UPDATE SET config = $2, updated_at = NOW()`,
      [adminAddress, config]
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

// GET /api/admin/config - Получить конфигурацию администратора
app.get('/api/admin/config', async (req, res) => {
  const adminAddress = req.headers['x-admin-address'];
  
  console.log(`[API Server] GET /api/admin/config called with adminAddress: ${adminAddress}`);
  
  if (!adminAddress) {
    return res.status(400).json({ error: 'Требуется заголовок X-Admin-Address' });
  }

  try {
    // Создаем таблицу если она не существует
    await createAdminConfigsTable();
    
    // Получаем конфигурацию из базы данных
    const config = await getAdminConfigFromDB(adminAddress);
    
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

// POST /api/admin/config - Сохранить конфигурацию администратора
app.post('/api/admin/config', async (req, res) => {
  const adminAddress = req.headers['x-admin-address'];
  const configData = req.body;
  
  console.log(`[API Server] POST /api/admin/config called with adminAddress: ${adminAddress}`);
  console.log('[API Server] Config ', configData);
  
  if (!adminAddress) {
    return res.status(400).json({ error: 'Требуется заголовок X-Admin-Address' });
  }

  if (!configData || typeof configData !== 'object') {
    return res.status(400).json({ error: 'Неверный формат данных конфигурации' });
  }

  try {
    // Создаем таблицу если она не существует
    await createAdminConfigsTable();
    
    // Сохраняем конфигурацию в базу данных
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

module.exports = { 
  connectToNeon, 
  createAdminConfigsTable, 
  getAdminConfigFromDB, 
  saveAdminConfigToDB,
  DEFAULT_ADMIN_CONFIG
};