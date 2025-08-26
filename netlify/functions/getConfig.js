import { getClient, DEFAULT_APP_CONFIG } from './utils/db.js'; // Импорт общего модуля

exports.handler = async (event, context) => {
  try {
    console.log("=== Get Config Function Called (Admin Read) ===");
    console.log("Event received:", JSON.stringify(event, null, 2)); // Логируем весь event для отладки

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

    // === ИСПРАВЛЕНИЕ: Улучшенная обработка заголовка X-Admin-Address ===
    let adminAddress = null;
    const headers = event.headers || {};
    const multiValueHeaders = event.multiValueHeaders || {};

    // Проверяем в headers (case-insensitive)
    for (const key in headers) {
      if (key.toLowerCase() === 'x-admin-address') {
        adminAddress = headers[key];
        break;
      }
    }

    // Если не найден в headers, проверяем в multiValueHeaders
    if (!adminAddress) {
      for (const key in multiValueHeaders) {
        if (key.toLowerCase() === 'x-admin-address' && multiValueHeaders[key].length > 0) {
          adminAddress = multiValueHeaders[key][0]; // Берем первый элемент
          break;
        }
      }
    }

    console.log(`[getConfig] Извлеченный adminAddress: ${adminAddress}`);

    if (!adminAddress) {
      console.warn("[getConfig] Заголовок X-Admin-Address не предоставлен или пуст");
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Заголовок X-Admin-Address обязателен' }),
      };
    }

    // Нормализуем адрес перед использованием
    const normalizedAdminAddress = adminAddress.toLowerCase();
    console.log(`[getConfig] Нормализованный adminAddress: ${normalizedAdminAddress}`);

    // Получаем клиент подключения к БД (полные права для чтения конфига админа)
    const client = await getClient(false); // false - полные права
    console.log("[getConfig] Подключение к базе данных установлено");

    // === ИСПРАВЛЕНИЕ: Проверка существования администратора в БД ===
    try {
      const adminCheckResult = await client.query(
        'SELECT 1 FROM admins WHERE address = $1',
        [normalizedAdminAddress]
      );
      console.log(`[getConfig] Результат проверки администратора: найдено записей ${adminCheckResult.rows.length}`);
      if (adminCheckResult.rows.length === 0) {
        await client.end();
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
      await client.end();
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Ошибка проверки прав администратора', details: adminCheckError.message }),
      };
    }

    // Запрашиваем конфигурацию из БД для данного администратора
    const query = `
      SELECT config_data
      FROM app_configs
      WHERE admin_address = $1
    `;
    console.log(`[getConfig] Выполнение SQL-запроса для адреса ${normalizedAdminAddress}`);
    const result = await client.query(query, [normalizedAdminAddress]);
    console.log(`[getConfig] SQL-запрос выполнен, получено строк: ${result.rows.length}`);

    await client.end();
    console.log("[getConfig] Подключение к базе данных закрыто");

    if (result.rows.length > 0) {
      // Конфигурация найдена
      const configData = result.rows[0].config_data;
      console.log("[getConfig] Конфигурация найдена в БД:", JSON.stringify(configData, null, 2));
      // Отправляем сам объект конфигурации напрямую, как ожидает фронтенд
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(configData), // ВАЖНО: Возвращаем configData напрямую
      };
    } else {
      // Конфигурация не найдена, возвращаем дефолтную
      console.log("[getConfig] Конфигурация в БД не найдена, возвращаем дефолтную");
      return {
        statusCode: 200, // 200 OK, просто дефолтные данные
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(DEFAULT_APP_CONFIG), // ВАЖНО: Возвращаем DEFAULT_APP_CONFIG напрямую
      };
    }

  } catch (error) {
    console.error("[getConfig] Необработанная ошибка:", error);
    // Возвращаем 500 с деталями ошибки для отладки (в продакшене лучше скрывать stack)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Внутренняя ошибка сервера при получении конфигурации',
        message: error.message,
        // stack: error.stack // Можно включить для отладки, но лучше убрать в продакшене
      }),
    };
  }
};