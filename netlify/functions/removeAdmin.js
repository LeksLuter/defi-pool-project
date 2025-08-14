// netlify/functions/removeAdmin.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== removeAdmin Function Called ===");
    console.log("Headers:", event.headers);
    console.log("Path Parameters:", event.pathParameters);
    console.log("Query String Parameters:", event.queryStringParameters);
    console.log("HTTP Method:", event.httpMethod);

    if (event.httpMethod !== 'DELETE') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Метод не разрешен. Используйте DELETE.' }),
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

    // Получаем адрес для удаления из query string или path parameters
    // В зависимости от того, как вы настроите роутинг в netlify.toml
    // Например: DELETE /.netlify/functions/removeAdmin?address=0x...
    const addressToRemove = event.queryStringParameters?.address || (event.pathParameters ? event.pathParameters['address'] : null);
    
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
    console.log("Подключение к Neon для удаления админа успешно");

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

    // Удаляем администратора
    // Запрещаем админу удалить сам себя
    if (adminAddress.toLowerCase() === addressToRemove.toLowerCase()) {
        await client.end();
        return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Нельзя удалить самого себя из списка администраторов.' }),
        };
    }

    const deleteResult = await client.query(
      'DELETE FROM admins WHERE address = $1',
      [addressToRemove.toLowerCase()]
    );

    await client.end();

    if (deleteResult.rowCount > 0) {
        console.log(`Адрес ${addressToRemove} успешно удален из списка администраторов админом ${adminAddress}`);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ message: `Адрес ${addressToRemove} удален из списка администраторов` }),
        };
    } else {
        console.log(`Адрес ${addressToRemove} не найден в списке администраторов`);
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: `Адрес ${addressToRemove} не найден в списке администраторов` }),
        };
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