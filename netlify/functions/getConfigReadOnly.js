// netlify/functions/getConfigReadOnly.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== getConfigReadOnly Function Called ===");
    console.log("Headers:", event.headers);
    
    const adminAddress = event.headers['x-admin-address'];
    console.log("Admin Address:", adminAddress);
    
    if (!adminAddress) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Требуется заголовок X-Admin-Address' 
        })
      };
    }

    // Проверяем переменные окружения
    console.log("NEON_DATABASE_URL_READONLY:", process.env.NEON_DATABASE_URL_READONLY ? "SET" : "NOT SET");
    console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL ? "SET" : "NOT SET");
    
    // Используем URL для пользователя с ограниченными правами, если доступен
    const databaseUrl = process.env.NEON_DATABASE_URL_READONLY || process.env.NEON_DATABASE_URL;
    
    if (!databaseUrl) {
      console.error("NEON_DATABASE_URL_READONLY или NEON_DATABASE_URL не установлен");
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'База данных не настроена: NEON_DATABASE_URL_READONLY или NEON_DATABASE_URL отсутствует' 
        })
      };
    }

    // Подключение к Neon через пользователя с ограниченными правами
    const client = new Client({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log("Подключение к Neon через пользователя с ограниченными правами успешно");

    // Пытаемся получить конфигурацию из базы данных
    const result = await client.query(
      'SELECT config FROM admin_configs WHERE address = $1',
      [adminAddress]
    );

    await client.end();

    if (result.rows.length > 0) {
      const config = result.rows[0].config;
      console.log("Конфигурация найдена в базе:", config);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(config)
      };
    } else {
      console.log("Конфигурация не найдена в базе, возвращаем дефолтную");
      // Возвращаем дефолтную конфигурацию
      const defaultConfig = {
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
        updateIntervalMinutes: 10
      };
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(defaultConfig)
      };
    }
  } catch (error) {
    console.error("Ошибка в getConfigReadOnly:", error);
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