import { getClient } from './utils/db.js';

const isAdminInDB = async (address) => {
  // Используем подключение только для чтения
  const client = await getClient(true);
  try {
    console.log(`[isAdminInDB] Проверка наличия адреса ${address} в списке администраторов`);
    const query = 'SELECT 1 FROM admins WHERE address = $1';
    const result = await client.query(query, [address]);
    console.log(`[isAdminInDB] Результат проверки: найдено записей: ${result.rows.length}`);
    return result.rows.length > 0;
  } finally {
    await client.end();
    console.log("[isAdminInDB] Клиент БД закрыт");
  }
};

exports.handler = async (event, context) => {
  try {
    console.log("=== checkAdmin Function Called ===");
    console.log("Event received:", JSON.stringify(event, null, 2));

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

    // Получаем адрес из query string
    const address = event.queryStringParameters?.address;
    if (!address) {
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
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Неверный формат адреса Ethereum' }),
      };
    }

    // Проверяем, является ли адрес администратором
    console.log(`[checkAdmin] Проверка, является ли адрес ${address} администратором`);
    const isAdmin = await isAdminInDB(address);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ isAdmin, address }),
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