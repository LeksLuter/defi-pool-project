import { getClient } from './utils/db.js';

exports.handler = async (event, context) => {
  try {
    console.log("=== Save Config Function Called ===");
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
      console.warn("[saveConfig] Заголовок X-Admin-Address не предоставлен");
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется заголовок X-Admin-Address' }),
      };
    }

    console.log(`[saveConfig] Сохранение конфигурации от администратора: ${adminAddress}`);

    // Получаем данные конфигурации из query string (предполагаем, что они там в формате JSON)
    // ВАЖНО: URL-кодирование и длина строки могут быть ограничены
    const configJson = event.queryStringParameters?.config;
    if (!configJson) {
      console.error("[saveConfig] Параметр config не найден в query string");
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Параметр config обязателен в query string' }),
      };
    }

    let configData;
    try {
      configData = JSON.parse(decodeURIComponent(configJson));
    } catch (parseError) {
      console.error("[saveConfig] Ошибка парсинга JSON из query string:", parseError);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Неверный формат JSON в параметре config query string' }),
      };
    }

    console.log("[saveConfig] Полученные данные конфигурации:", configData);

    // Нормализуем адрес администратора
    const normalizedAdminAddress = adminAddress.trim().toLowerCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedAdminAddress)) {
      console.warn(`[saveConfig] Неверный формат адреса Ethereum: ${normalizedAdminAddress}`);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Неверный формат адреса Ethereum в заголовке X-Admin-Address' }),
      };
    }

    // Получаем клиент подключения к БД (полные права для сохранения)
    const client = await getClient(false); // false для админского подключения

    try {
      // Проверка, является ли адрес администратором
      console.log(`[saveConfig] Выполнение проверки прав администратора для адреса ${normalizedAdminAddress}`);
      const adminQuery = 'SELECT 1 FROM admins WHERE address = $1';
      const adminResult = await client.query(adminQuery, [normalizedAdminAddress]);
      console.log(`[saveConfig] Проверка прав администратора выполнена, найдено записей: ${adminResult.rows.length}`);

      if (adminResult.rows.length === 0) {
        console.warn(`[saveConfig] Адрес ${normalizedAdminAddress} не найден в списке администраторов`);
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Доступ запрещен. Адрес не является администратором.', address: normalizedAdminAddress }),
        };
      }

      // Вставка или обновление конфигурации в базе данных
      console.log(`[saveConfig] Выполнение UPSERT конфигурации для адреса ${normalizedAdminAddress}`);
      const upsertQuery = `
        INSERT INTO app_config (admin_address, config, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (admin_address)
        DO UPDATE SET config = EXCLUDED.config, created_at = NOW()
        RETURNING id
      `;
      const upsertResult = await client.query(upsertQuery, [normalizedAdminAddress, configData]);
      const insertedId = upsertResult.rows[0].id;
      console.log(`[saveConfig] Конфигурация успешно сохранена с ID: ${insertedId}`);

      // Возвращаем успешный ответ
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Конфигурация успешно сохранена', id: insertedId }),
      };
    } finally {
      await client.end();
      console.log("[saveConfig] Клиент БД закрыт");
    }
  } catch (error) {
    console.error("Ошибка в saveConfig:", error);
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