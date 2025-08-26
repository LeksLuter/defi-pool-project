const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== removeAdmin Function Called ===");
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

    // Получаем адрес для удаления из query string
    const addressToRemove = event.queryStringParameters?.address;
    if (!addressToRemove) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется параметр address в query string' }),
      };
    }

    // Проверка формата адреса Ethereum
    if (!/^0x[a-fA-F0-9]{40}$/.test(addressToRemove)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Неверный формат адреса Ethereum для удаления' }),
      };
    }

    // Подключение к базе данных
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
    });

    await client.connect();
    console.log("[removeAdmin] Подключение к БД установлено");

    try {
      // Проверка, является ли текущий адрес администратором
      console.log(`[removeAdmin] Проверка прав администратора для адреса: ${adminAddress}`);
      const adminCheckQuery = 'SELECT 1 FROM admins WHERE address = $1';
      const adminCheckResult = await client.query(adminCheckQuery, [adminAddress]);

      if (adminCheckResult.rows.length === 0) {
        console.warn(`[removeAdmin] Адрес ${adminAddress} не является администратором`);
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Доступ запрещен. Адрес не является администратором.' }),
        };
      }

      // Проверка, является ли удаляемый адрес администратором
      console.log(`[removeAdmin] Проверка, является ли адрес ${addressToRemove} администратором`);
      const targetAdminQuery = 'SELECT 1 FROM admins WHERE address = $1';
      const targetAdminResult = await client.query(targetAdminQuery, [addressToRemove]);

      if (targetAdminResult.rows.length === 0) {
        console.warn(`[removeAdmin] Адрес ${addressToRemove} не найден в списке администраторов`);
        return {
          statusCode: 404, // Not Found
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: `Адрес ${addressToRemove} не найден в списке администраторов` }),
        };
      }

      // Удаление администратора
      console.log(`[removeAdmin] Удаление администратора: ${addressToRemove}`);
      const deleteQuery = 'DELETE FROM admins WHERE address = $1';
      await client.query(deleteQuery, [addressToRemove]);

      console.log(`[removeAdmin] Адрес ${addressToRemove} успешно удален из списка администраторов`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Администратор успешно удален', address: addressToRemove }),
      };
    } finally {
      await client.end();
      console.log("[removeAdmin] Подключение к БД закрыто");
    }
  } catch (error) {
    console.error("Ошибка в removeAdmin:", error);
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