import { getClient, DEFAULT_APP_CONFIG } from './utils/db.js';

exports.handler = async (event, context) => {
  try {
    console.log("=== Get Config Function Called (Read Only) ===");
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

    // Получаем заголовок X-User-Address (только для readonly)
    let userAddress = null;
    const headers = event.headers || {};
    const multiValueHeaders = event.multiValueHeaders || {};

    // Поиск X-User-Address в headers (регистронезависимо, но ожидаем верхний регистр)
    for (const key in headers) {
      if (key === 'X-User-Address') {
        userAddress = headers[key];
        break;
      }
    }

    // Если не найден в headers, проверяем в multiValueHeaders
    if (!userAddress) {
      for (const key in multiValueHeaders) {
        if (key === 'X-User-Address' && Array.isArray(multiValueHeaders[key]) && multiValueHeaders[key].length > 0) {
          userAddress = multiValueHeaders[key][0];
          break;
        }
      }
    }

    console.log(`[getConfigReadOnly] Запрос конфигурации пользователем: ${userAddress || 'Не указан'}`);

    // Используем подключение только для чтения
    const client = await getClient(true); // true для readonly подключения

    try {
      // Получаем последнюю конфигурацию из базы данных
      console.log("[getConfigReadOnly] Выполнение SQL-запроса для получения последней конфигурации");
      const query = 'SELECT config FROM app_config ORDER BY created_at DESC LIMIT 1';
      const result = await client.query(query);
      console.log(`[getConfigReadOnly] SQL-запрос выполнен, получено строк: ${result.rows.length}`);

      if (result.rows.length > 0) {
        const configData = result.rows[0].config;
        if (configData === null) {
          console.log("[getConfigReadOnly] Последняя конфигурация в БД равна NULL, возврат дефолтной");
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(DEFAULT_APP_CONFIG),
          };
        }
        console.log("[getConfigReadOnly] Последняя конфигурация найдена и будет возвращена напрямую:", JSON.stringify(configData, null, 2));
        // Возвращаем сам объект конфигурации напрямую в теле ответа
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(configData),
        };
      } else {
        console.log("[getConfigReadOnly] Конфигурация в БД не найдена, возврат дефолтной");
        // Если конфигурация не найдена, возвращаем дефолтную
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(DEFAULT_APP_CONFIG),
        };
      }
    } finally {
      await client.end();
      console.log("[getConfigReadOnly] Клиент БД закрыт");
    }
  } catch (error) {
    console.error("Ошибка в getConfigReadOnly:", error);
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