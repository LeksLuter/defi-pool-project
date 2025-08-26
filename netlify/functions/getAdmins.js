const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== getAdmins Function Called ===");
    console.log("Headers:", event.headers);

    // Проверяем метод запроса - теперь только GET
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

    // Получаем заголовок X-Admin-Address
    let adminAddress = null;
    const headers = event.headers || {};
    const multiValueHeaders = event.multiValueHeaders || {};

    // Поиск X-Admin-Address в headers (регистронезависимо, но ожидаем верхний регистр)
    for (const key in headers) {
      if (key === 'X-Admin-Address') {
        adminAddress = headers[key];
        break;
      }
    }

    // Если не найден в headers, проверяем в multiValueHeaders
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

    // Подключение к базе данных
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
    });

    await client.connect();
    console.log("[getAdmins] Подключение к БД установлено");

    try {
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
      const query = 'SELECT address FROM admins ORDER BY created_at ASC';
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
        // stack: error.stack // Можно включить для отладки, но лучше убрать в продакшене
      }),
    };
  }
};