// netlify/functions/getAdmins.js
const { Client } = require('pg');

// Имитируем DEFAULT_APP_CONFIG для проверки структуры, если нужно
// const DEFAULT_APP_CONFIG = { /* ... */ };

exports.handler = async (event, context) => {
  try {
    console.log("=== getAdmins Function Called ===");
    console.log("Headers:", event.headers);
    console.log("HTTP Method:", event.httpMethod);

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

    // Проверяем переменные окружения
    console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL ? "SET" : "NOT SET");

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

    // Подключение к Neon через администратора (так как это защищенный endpoint)
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("Подключение к Neon через администратора успешно");

    // Проверяем, является ли запрашивающий адрес администратором
    const adminCheckResult = await client.query(
      'SELECT 1 FROM admins WHERE address = $1',
      [adminAddress.toLowerCase()]
    );

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

    // Получаем список всех администраторов
    const result = await client.query(
      'SELECT address FROM admins ORDER BY added_at DESC'
    );

    await client.end();

    const adminsList = result.rows.map(row => row.address);
    console.log("Список администраторов успешно получен:", adminsList);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ admins: adminsList }),
    };
  } catch (error) {
    console.error("Ошибка в getAdmins:", error);
    // Включаем стек ошибок для лучшей отладки на сервере
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Внутренняя ошибка сервера: ' + error.message,
        // stack: error.stack // Можно включить для отладки, но лучше убрать в продакшене
      }),
    };
  }
};