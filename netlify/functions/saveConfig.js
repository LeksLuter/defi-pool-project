// netlify/functions/saveConfig.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== saveConfig Function Called ===");
    console.log("Headers:", event.headers);
    console.log("Body:", event.body);

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

    let configData;
    try {
      configData = JSON.parse(event.body);
      console.log("Config Data to Save:", configData);
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

    if (!process.env.NEON_DATABASE_URL) {
      console.error("NEON_DATABASE_URL не установлен");
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'База данных не настроена' }),
      };
    }

    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("Подключение к Neon для сохранения успешно");

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

    // Сохраняем конфигурацию
    await client.query(
      `INSERT INTO app_config (config, updated_at)
       VALUES ($1, NOW())
       ON CONFLICT (id) -- Предполагаем, что id - SERIAL PRIMARY KEY
       DO UPDATE SET config = $1, updated_at = NOW()`,
      [configData]
    );

    await client.end();

    console.log("Конфигурация приложения успешно сохранена в базе администратором:", adminAddress);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Конфигурация приложения сохранена в базе данных', updatedBy: adminAddress }),
    };
  } catch (error) {
    console.error("Ошибка в saveConfig:", error);
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