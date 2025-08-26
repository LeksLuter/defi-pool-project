const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== addAdmin Function Called ===");
    console.log("Event received:", JSON.stringify(event, null, 2));

    // Проверяем метод запроса - теперь только GET (параметры в query string)
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

    // Получаем заголовок X-Admin-Address (адрес текущего админа)
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

    // Получаем адрес нового админа из query string
    const newAdminAddress = event.queryStringParameters?.newAdminAddress;
    if (!newAdminAddress) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется параметр newAdminAddress в query string' }),
      };
    }

    // Проверка формата адреса Ethereum
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAdminAddress)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Неверный формат адреса Ethereum для нового администратора' }),
      };
    }

    // Подключение к базе данных
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
    });

    await client.connect();
    console.log("[addAdmin] Подключение к БД установлено");

    try {
      // Проверка, является ли текущий адрес администратором
      console.log(`[addAdmin] Проверка прав администратора для адреса: ${adminAddress}`);
      const adminCheckQuery = 'SELECT 1 FROM admins WHERE address = $1';
      const adminCheckResult = await client.query(adminCheckQuery, [adminAddress]);

      if (adminCheckResult.rows.length === 0) {
        console.warn(`[addAdmin] Адрес ${adminAddress} не является администратором`);
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Доступ запрещен. Адрес не является администратором.' }),
        };
      }

      // Проверка, не является ли новый адрес уже администратором
      console.log(`[addAdmin] Проверка, не является ли адрес ${newAdminAddress} уже администратором`);
      const existingAdminQuery = 'SELECT 1 FROM admins WHERE address = $1';
      const existingAdminResult = await client.query(existingAdminQuery, [newAdminAddress]);

      if (existingAdminResult.rows.length > 0) {
        console.warn(`[addAdmin] Адрес ${newAdminAddress} уже является администратором`);
        return {
          statusCode: 409, // Conflict
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Адрес уже является администратором' }),
        };
      }

      // Добавление нового администратора
      console.log(`[addAdmin] Добавление нового администратора: ${newAdminAddress}`);
      const insertQuery = 'INSERT INTO admins (address, created_at) VALUES ($1, NOW())';
      await client.query(insertQuery, [newAdminAddress]);

      console.log(`[addAdmin] Адрес ${newAdminAddress} успешно добавлен как администратор`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Администратор успешно добавлен', address: newAdminAddress }),
      };
    } finally {
      await client.end();
      console.log("[addAdmin] Подключение к БД закрыто");
    }
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