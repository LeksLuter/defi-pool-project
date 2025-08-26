const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== getAdmins Function Called ===");
    console.log("Headers:", event.headers);

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Метод не разрешен' }),
      };
    }

    let adminAddress = null;
    const headers = event.headers || {};
    const multiValueHeaders = event.multiValueHeaders || {};

    for (const key in headers) {
      if (key === 'X-Admin-Address') {
        adminAddress = headers[key];
        break;
      }
    }

    if (!adminAddress) {
      for (const key in multiValueHeaders) {
        if (key === 'X-Admin-Address' && Array.isArray(multiValueHeaders[key]) && multiValueHeaders[key].length > 0) {
          adminAddress = multiValueHeaders[key][0];
          break;
        }
      }
    }

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

    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
    });

    await client.connect();
    console.log("[getAdmins] Подключение к БД установлено");

    try {
      // Проверка существования таблицы admins
      console.log("[getAdmins] Проверка существования таблицы admins...");
      const checkAdminsTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admins'
        ) AS table_exists;
      `;
      const checkAdminsResult = await client.query(checkAdminsTableQuery);
      const adminsTableExists = checkAdminsResult.rows[0].table_exists;
      console.log(`[getAdmins] Существует ли таблица admins: ${adminsTableExists}`);

      if (!adminsTableExists) {
        console.error("[getAdmins] Таблица admins не найдена в базе данных!");
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Таблица администраторов не найдена в базе данных.' }),
        };
      }

      // Проверка, является ли адрес администратором
      console.log(`[getAdmins] Проверка прав администратора для адреса: ${adminAddress}`);
      const adminCheckQuery = 'SELECT 1 FROM admins WHERE address = $1';
      const adminCheckResult = await client.query(adminCheckQuery, [adminAddress]);

      if (adminCheckResult.rows.length === 0) {
        console.warn(`[getAdmins] Адрес ${adminAddress} не является администратором`);
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Доступ запрещен. Адрес не является администратором.' }),
        };
      }

      // Получение списка всех администраторов
      console.log("[getAdmins] Получение списка всех администраторов");
      const query = 'SELECT address FROM admins ORDER BY added_at ASC'; // Используем правильное имя столбца
      const result = await client.query(query);

      const adminsList = result.rows.map(row => row.address);
      console.log("[getAdmins] Список администраторов получен:", adminsList);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ admins: adminsList }),
      };
    } finally {
      await client.end();
      console.log("[getAdmins] Подключение к БД закрыто");
    }
  } catch (error) {
    console.error("Ошибка в getAdmins:", error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Внутренняя ошибка сервера: ' + error.message,
      }),
    };
  }
};