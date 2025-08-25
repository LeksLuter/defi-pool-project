import { getClient } from './utils/db.js'; // Импорт общего модуля

/**
 * Проверяет, является ли указанный адрес администратором.
 * @param {string} address - Адрес Ethereum для проверки.
 * @returns {Promise<boolean>} - True, если адрес является администратором.
 */
const isAdminInDB = async (address) => {
  // Используем подключение только для чтения
  const client = await getClient(true);
  try {
    console.log(`[checkAdmin - DB] Проверка адреса ${address} в списке администраторов`);
    const query = 'SELECT 1 FROM admins WHERE address = $1';
    const result = await client.query(query, [address]);
    const isAdmin = result.rowCount > 0;
    console.log(`[checkAdmin - DB] Адрес ${address} ${isAdmin ? 'найден' : 'не найден'} в списке администраторов`);
    return isAdmin;
  } finally {
    await client.end();
  }
};

exports.handler = async (event, context) => {
  try {
    console.log("=== Check Admin Function Called ===");

    // Проверяем метод запроса
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
    const urlParams = new URLSearchParams(event.queryStringParameters || {});
    const addressToCheck = urlParams.get('address');

    if (!addressToCheck) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется параметр адреса (address)' }),
      };
    }

    console.log(`[checkAdmin] Проверка адреса: ${addressToCheck}`);

    // Проверяем, является ли адрес администратором
    const isAdmin = await isAdminInDB(addressToCheck);
    console.log(`[checkAdmin] Результат проверки для ${addressToCheck}: ${isAdmin}`);

    // Возвращаем результат в формате, ожидаемом фронтендом
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ isAdmin, address: addressToCheck }),
    };

  } catch (error) {
    console.error("Ошибка в checkAdmin:", error);
    // Включаем стек ошибок для лучшей отладки на сервере
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