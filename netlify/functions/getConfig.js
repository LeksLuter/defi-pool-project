// netlify/functions/getConfig.js
const { Client } = require('pg');

// Дефолтная конфигурация
const DEFAULT_APP_CONFIG = {
  tokenServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
    CoinMarketCap: true,
  },
  priceServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
    CoinMarketCap: true,
  },
  updateIntervalMinutes: 5
};

exports.handler = async (event, context) => {
  try {
    console.log("=== getConfig (Admin Read) Function Called ===");
    console.log("Headers:", event.headers);

    const adminAddress = event.headers['x-admin-address'];
    console.log("Admin Address:", adminAddress);

    if (!adminAddress) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется заголовок X-Admin-Address' }),
      };
    }

    if (!process.env.NEON_DATABASE_URL) {
      console.error("NEON_DATABASE_URL не установлен");
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'База данных не настроена: NEON_DATABASE_URL отсутствует',
        }),
      };
    }

    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("Подключение к Neon через администратора успешно");

    // Создаем таблицы если они не существуют
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        id SERIAL PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        address TEXT PRIMARY KEY,
        added_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Проверка прав администратора
    const adminCheckResult = await client.query('SELECT 1 FROM admins WHERE address = $1', [adminAddress]);
    if (adminCheckResult.rows.length === 0) {
        await client.end();
        return {
            statusCode: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Доступ запрещен. Адрес не является администратором.' }),
        };
    }

    // Получаем конфигурацию
    const result = await client.query('SELECT config FROM app_config ORDER BY id DESC LIMIT 1');

    await client.end();

    if (result.rows.length > 0) {
      console.log("Конфигурация приложения найдена в базе:", result.rows[0].config);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result.rows[0].config),
      };
    } else {
      console.log("Конфигурация не найдена, возвращаем дефолтную");
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(DEFAULT_APP_CONFIG),
      };
    }
  } catch (error) {
    console.error("Ошибка в getConfig (Admin Read):", error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Внутренняя ошибка сервера: ' + error.message }),
    };
  }
};