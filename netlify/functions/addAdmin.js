// netlify/functions/addAdmin.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== addAdmin Function Called ===");
    console.log("Headers:", event.headers);
    console.log("Body:", event.body);
    console.log("HTTP Method:", event.httpMethod);

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Метод не разрешен. Используйте POST.' }),
      };
    }

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

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error("Ошибка парсинга JSON:", parseError);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Неверный формат JSON в теле запроса' }),
      };
    }

    const newAdminAddress = requestBody.newAdminAddress;
    if (!newAdminAddress) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется поле newAdminAddress в теле запроса' }),
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

    // Подключение к Neon через администратора
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("Подключение к Neon для добавления админа успешно");

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

    // Добавляем нового администратора
    await client.query(
      'INSERT INTO admins (address) VALUES ($1) ON CONFLICT (address) DO NOTHING',
      [newAdminAddress.toLowerCase()]
    );

    await client.end();

    console.log(`Адрес ${newAdminAddress} успешно добавлен в список администраторов админом ${adminAddress}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: `Адрес ${newAdminAddress} добавлен в список администраторов` }),
    };
  } catch (error) {
    console.error("Ошибка в addAdmin:", error);
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