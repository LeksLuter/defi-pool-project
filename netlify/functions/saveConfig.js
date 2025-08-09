// netlify/functions/saveConfig.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  console.log("=== saveConfig Function Called ===");
  console.log("Full Event Object:", JSON.stringify(event, null, 2)); // Логируем весь event

  try {
    console.log("Headers received:", event.headers);
    console.log("Body received:", event.body);

    const adminAddress = event.headers['x-admin-address'] || event.headers['X-Admin-Address'];
    console.log("Admin Address extracted:", adminAddress);

    if (!adminAddress) {
      console.error("X-Admin-Address header is missing or empty");
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Address', // Убедитесь, что заголовок разрешен
        },
        body: JSON.stringify({ error: 'Требуется заголовок X-Admin-Address' })
      };
    }

    if (!event.body) {
      console.error("Request body is missing");
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Address',
        },
        body: JSON.stringify({ error: 'Тело запроса отсутствует' })
      };
    }

    let configData;
    try {
      configData = JSON.parse(event.body);
      console.log("Parsed config data:", configData);
    } catch (parseError) {
      console.error("Failed to parse request body as JSON:", parseError.message);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Address',
        },
        body: JSON.stringify({ error: 'Неверный формат JSON в теле запроса' })
      };
    }

    if (!process.env.NEON_DATABASE_URL) {
      console.error("NEON_DATABASE_URL environment variable is not set");
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Address',
        },
        body: JSON.stringify({ error: 'Серверная ошибка: База данных не настроена' })
      };
    }

    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log("Connected to Neon DB");

    // Логируем SQL-запрос перед выполнением
    console.log("Executing query for address:", adminAddress);
    const queryText = `INSERT INTO admin_configs (address, config, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (address) DO UPDATE SET config = $2, updated_at = NOW()`;
    const queryParams = [adminAddress, configData];
    console.log("Query text:", queryText);
    console.log("Query params:", queryParams);

    await client.query(queryText, queryParams);

    await client.end();
    console.log("Configuration saved successfully for address:", adminAddress);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Address', // Добавляем разрешение заголовков
      },
      body: JSON.stringify({ message: 'Конфигурация сохранена в базе данных', address: adminAddress })
    };

  } catch (error) {
    console.error("Detailed error in saveConfig:", error);
    // Логируем стек вызовов для лучшего понимания ошибки
    console.error("Error stack:", error.stack);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Address',
      },
      body: JSON.stringify({
        error: 'Внутренняя ошибка сервера при сохранении конфигурации',
        // Включаем детали ошибки только для отладки, не в продакшене!
        // details: error.message // Убрать в продакшене
      })
    };
  }
};