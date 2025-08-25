import { getClient } from './utils/db.js'; // Импорт общего модуля

exports.handler = async (event, context) => {
  try {
    console.log("=== Test Connection Function Called ===");

    // Проверяем переменные окружения
    console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL ? "SET" : "NOT SET");
    console.log("NEON_DATABASE_URL_READONLY:", process.env.NEON_DATABASE_URL_READONLY ? "SET" : "NOT SET");
    console.log("NEON_DATABASE_URL_TOKEN_USER:", process.env.NEON_DATABASE_URL_TOKEN_USER ? "SET" : "NOT SET");

    // Используем getClient для подключения с правами readonly
    // Это демонстрирует использование нового модуля
    const client = await getClient(true); // true для readonly подключения

    // Выполняем простой запрос для проверки
    const result = await client.query('SELECT version();');
    await client.end();

    console.log("Подключение к базе данных успешно проверено.");
    console.log("Версия PostgreSQL:", result.rows[0].version);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Подключение к базе данных успешно',
        status: 'OK',
        postgresVersion: result.rows[0].version
      }),
    };

  } catch (error) {
    console.error("Ошибка в testConnection:", error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Ошибка подключения к базе данных: ' + error.message,
        status: 'ERROR'
      }),
    };
  }
};