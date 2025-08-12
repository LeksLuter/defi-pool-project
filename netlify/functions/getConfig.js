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
  console.log("Проверка переменных окружения:");
  console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL ? "SET" : "NOT SET");
  
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
// === КОНЕЦ ФУНКЦИЙ РАБОТЫ С БАЗОЙ ДАННЫХ ===

// === ОСНОВНАЯ ФУНКЦИЯ HANDLER ===
exports.handler = async (event, context) => {
  try {
    console.log("=== getConfig Function Called ===");
    console.log("Headers:", event.headers);
    
    const adminAddress = event.headers['x-admin-address'];
    const userAddress = event.headers['x-user-address'];
    
    console.log("Admin Address:", adminAddress);
    console.log("User Address:", userAddress);
    
    // Если есть адрес администратора, используем его
    const targetAddress = adminAddress || userAddress;
    
    if (!targetAddress) {
      console.warn('[API Server] X-Admin-Address or X-User-Address header is missing');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Требуется заголовок X-Admin-Address или X-User-Address' 
        })
      };
    }

    // Проверяем переменные окружения
    console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL ? "SET" : "NOT SET");
    
    if (!process.env.NEON_DATABASE_URL) {
      console.error("NEON_DATABASE_URL не установлен");
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'База данных не настроена: NEON_DATABASE_URL отсутствует' 
        })
      };
    }

    // Создаем таблицу если она не существует
    await createAdminConfigsTable();
    
    // Пытаемся получить конфигурацию из базы данных
    const result = await getAdminConfigFromDB(targetAddress);

    console.log("Конфигурация найдена в базе:", result);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error("Ошибка в getConfig:", error);
    console.error("Стек ошибки:", error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Внутренняя ошибка сервера: ' + error.message,
        stack: error.stack
      })
    };
  }
};
// === КОНЕЦ ОСНОВНОЙ ФУНКЦИИ HANDLER ===