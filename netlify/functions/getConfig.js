const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== getConfig Function Called ===");
    console.log("Headers:", event.headers);

    const adminAddress = event.headers['x-admin-address'];
    console.log("Admin Address:", adminAddress);

    // Только админ может читать/писать свои настройки через эту функцию
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

    // Подключение к Neon через администратора
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("Подключение к Neon через администратора успешно");

    // Создаем таблицу если она не существует
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_configs (
        address TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Пытаемся получить конфигурацию из базы данных
    const result = await client.query(
      'SELECT config FROM admin_configs WHERE address = $1',
      [adminAddress]
    );

    await client.end();

    if (result.rows.length > 0) {
      console.log("Конфигурация найдена в базе:", result.rows[0].config);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result.rows[0].config),
      };
    } else {
      console.log("Конфигурация не найдена в базе");
      // Возвращаем 404, чтобы клиент знал, что конфигурации нет
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Конфигурация не найдена' }),
      };
    }
  } catch (error) {
    console.error("Ошибка в getConfig:", error);
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