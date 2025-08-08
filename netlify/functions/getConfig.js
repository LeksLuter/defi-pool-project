const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== getConfig Function Called ===");
    
    const adminAddress = event.headers['x-admin-address'];
    
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
    if (!process.env.NEON_DATABASE_URL) {
      console.error("NEON_DATABASE_URL не установлен");
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'База данных не настроена' 
        })
      };
    }

    // Подключение к Neon
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log("Подключение к Neon успешно");

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
    console.error("Ошибка в getConfig:", error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Внутренняя ошибка сервера: ' + error.message 
      })
    };
  }
};