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

    // Парсим тело запроса
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

    // Подключение к Neon
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("Подключение к Neon для сохранения успешно");

    // Создаем таблицу если она не существует
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_configs (
        address TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Сохраняем конфигурацию в базу данных
    await client.query(
      `INSERT INTO admin_configs (address, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (address)
       DO UPDATE SET config = $2, updated_at = NOW()`,
      [adminAddress, configData]
    );

    await client.end();

    console.log("Конфигурация успешно сохранена в базе для адреса:", adminAddress);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Конфигурация сохранена в базе данных', address: adminAddress }),
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