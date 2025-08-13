// netlify/functions/getConfigReadOnly.js
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
    console.log("=== getConfigReadOnly Function Called ===");
    console.log("Headers:", event.headers);

    const userAddress = event.headers['x-user-address'];
    console.log("User Address:", userAddress);

    if (!userAddress) {
        console.warn('[API Server] X-User-Address header is missing');
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Требуется заголовок X-User-Address' }),
        };
    }

    console.log("NEON_DATABASE_URL_READONLY:", process.env.NEON_DATABASE_URL_READONLY ? "SET" : "NOT SET");
    console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL ? "SET" : "NOT SET");

    const databaseUrl = process.env.NEON_DATABASE_URL_READONLY || process.env.NEON_DATABASE_URL;

    if (!databaseUrl) {
      console.error("NEON_DATABASE_URL_READONLY или NEON_DATABASE_URL не установлен");
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'База данных не настроена: NEON_DATABASE_URL_READONLY или NEON_DATABASE_URL отсутствует',
        }),
      };
    }

    const client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("Подключение к Neon через пользователя с ограниченными правами успешно");

    // Создаем таблицы если они не существуют (на всякий случай)
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
    console.error("Ошибка в getConfigReadOnly:", error);
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