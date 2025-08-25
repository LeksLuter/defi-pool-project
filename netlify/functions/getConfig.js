// netlify/functions/getConfig.js
import { getClient, DEFAULT_APP_CONFIG } from './utils/db.js'; // Импорт общего модуля

exports.handler = async (event, context) => {
  try {
    console.log("=== Get Config Function Called (Admin Read) ===");

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

    // Получаем заголовок X-Admin-Address
    const adminAddress = event.headers['x-admin-address'] || event.headers['X-Admin-Address'];

    if (!adminAddress) {
      console.warn("[getConfig] Заголовок X-Admin-Address не предоставлен");
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется заголовок X-Admin-Address' }),
      };
    }

    console.log(`[getConfig] Запрос конфигурации от администратора: ${adminAddress}`);

    // Подключение к Neon через администратора (так как это защищенный endpoint)
    const client = await getClient(false); // false для админского подключения

    try {
      // ИСПРАВЛЕНО: config_data -> config (в предыдущем исправлении)
      const query = 'SELECT config FROM app_config WHERE admin_address = $1';
      const result = await client.query(query, [adminAddress]);

      if (result.rowCount > 0) {
        // result.rows[0].config уже является объектом JavaScript (JSONB -> Object)
        const configData = result.rows[0].config;
        console.log(`[getConfig] Конфигурация найдена для администратора ${adminAddress} и будет возвращена напрямую:`, JSON.stringify(configData, null, 2));
        // Возвращаем сам объект конфигурации напрямую в теле ответа
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(configData), // Возвращаем сам объект конфигурации
        };
      } else {
        console.log(`[getConfig] Конфигурация не найдена для администратора ${adminAddress}, возврат дефолтной`);
        // Если конфигурация не найдена, возвращаем дефолтную
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(DEFAULT_APP_CONFIG), // Возвращаем дефолтную конфигурацию напрямую
        };
      }
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error("Ошибка в getConfig (Admin Read):", error);
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