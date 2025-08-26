import { getClient, DEFAULT_APP_CONFIG } from './utils/db.js';

exports.handler = async (event, context) => {
  let client = null;
  try {
    console.log("=== Get Config Function Called (Admin Read) ===");
    console.log("Event received:", JSON.stringify(event, null, 2));

    // Проверяем метод запроса - теперь только GET
    if (event.httpMethod !== 'GET') {
      console.warn(`[getConfig] Неверный метод HTTP: ${event.httpMethod}`);
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Метод не разрешен' }),
      };
    }

    // Извлекаем заголовок X-Admin-Address (только для админки)
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

    console.log(`[getConfig] Извлеченный adminAddress: '${adminAddress}'`);

    if (!adminAddress || adminAddress.trim() === '') {
      console.warn("[getConfig] Заголовок X-Admin-Address не предоставлен или пуст");
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Заголовок X-Admin-Address обязателен и не должен быть пустым' }),
      };
    }

    const normalizedAdminAddress = adminAddress.trim().toLowerCase();
    console.log(`[getConfig] Нормализованный adminAddress: '${normalizedAdminAddress}'`);

    if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedAdminAddress)) {
      console.warn(`[getConfig] Неверный формат адреса Ethereum: ${normalizedAdminAddress}`);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Неверный формат адреса Ethereum в заголовке X-Admin-Address' }),
      };
    }

    // Получаем клиент подключения к БД (полные права для чтения конфига админа)
    client = await getClient(false); // false для админского подключения

    // Проверка, является ли адрес администратором
    try {
      console.log(`[getConfig] Выполнение проверки прав администратора для адреса ${normalizedAdminAddress}`);
      const query = 'SELECT 1 FROM admins WHERE address = $1';
      const result = await client.query(query, [normalizedAdminAddress]);
      console.log(`[getConfig] Проверка прав администратора выполнена, найдено записей: ${result.rows.length}`);

      if (result.rows.length === 0) {
        console.warn(`[getConfig] Адрес ${normalizedAdminAddress} не найден в списке администраторов`);
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Доступ запрещен. Адрес не является администратором.', address: normalizedAdminAddress }),
        };
      }
    } catch (adminCheckError) {
      console.error("[getConfig] Ошибка при проверке прав администратора в БД:", adminCheckError);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Внутренняя ошибка сервера при проверке прав администратора' }),
      };
    } finally {
      if (client) {
        await client.end();
        console.log("[getConfig] Клиент БД закрыт после проверки прав администратора");
      }
    }

    // Повторно открываем клиент для получения конфигурации
    client = await getClient(false); // false для админского подключения

    try {
      console.log(`[getConfig] Выполнение SQL-запроса для адреса ${normalizedAdminAddress}`);
      const query = 'SELECT config FROM app_config WHERE admin_address = $1 ORDER BY id DESC LIMIT 1';
      const result = await client.query(query, [normalizedAdminAddress]);
      console.log(`[getConfig] SQL-запрос выполнен, получено строк: ${result.rows.length}`);

      if (result.rows.length > 0) {
        const configData = result.rows[0].config;
        if (configData === null) {
          console.log(`[getConfig] Конфигурация в БД для ${normalizedAdminAddress} равна NULL, возвращаем дефолтную`);
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(DEFAULT_APP_CONFIG),
          };
        } else {
          console.log("[getConfig] Конфигурация найдена и будет возвращена:", JSON.stringify(configData, null, 2));
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(configData),
          };
        }
      } else {
        console.log(`[getConfig] Конфигурация в БД для ${normalizedAdminAddress} не найдена, возврат дефолтной`);
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
      if (client) {
        await client.end();
        console.log("[getConfig] Клиент БД закрыт после получения конфигурации");
      }
    }
  } catch (error) {
    console.error("Ошибка в getConfig:", error);
    // Убедимся, что клиент БД закрыт в случае ошибки
    if (client) {
      try {
        await client.end();
        console.log("[getConfig] Клиент БД закрыт из-за ошибки");
      } catch (closeError) {
        console.error("[getConfig] Ошибка при закрытии клиента БД:", closeError);
      }
    }
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