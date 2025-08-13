// netlify/functions/checkAdmin.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== checkAdmin Function Called ===");
    console.log("Query Params:", event.queryStringParameters);
    console.log("Headers:", event.headers);

    // Получаем адрес из query string или headers (для гибкости)
    const userAddress = event.queryStringParameters?.address || event.headers['x-user-address'];
    console.log("User Address to check:", userAddress);

    if (!userAddress) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется параметр address в query string или заголовок X-User-Address' }),
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
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'База данных не настроена: NEON_DATABASE_URL_READONLY или NEON_DATABASE_URL отсутствует',
        }),
      };
    }

    // Подключение к Neon через пользователя с ограниченными правами
    const client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("Подключение к Neon для проверки админа успешно");

    // Проверяем, есть ли адрес в таблице admins
    const result = await client.query(
      'SELECT 1 FROM admins WHERE address = $1',
      [userAddress.toLowerCase()] // Приводим к нижнему регистру для консистентности
    );

    await client.end();

    const isAdmin = result.rows.length > 0;
    console.log(`Проверка isAdmin для ${userAddress}: ${isAdmin}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ isAdmin: isAdmin, address: userAddress }),
    };
  } catch (error) {
    console.error("Ошибка в checkAdmin:", error);
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