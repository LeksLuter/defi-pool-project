// netlify/functions/saveConfig.js
// netlify/functions/saveConfig.js
import { getClient } from './utils/db.js';
exports.handler = async (event, context) => {
  try {
    console.log("=== Save Config Function Called ===");
    console.log("Event received:", JSON.stringify(event, null, 2));
    
    // ИЗМЕНЕНО: Проверяем метод запроса - теперь только POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Метод не разрешен. Используйте POST.' }),
      };
    }
    
    let adminAddress = null;
    const headers = event.headers || {};
    const multiValueHeaders = event.multiValueHeaders || {};
    
    for (const key in headers) {
      if (key === 'X-Admin-Address') {
        adminAddress = headers[key];
        break;
      }
    }
    
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
    
    // ИЗМЕНЕНО: Получаем данные из тела запроса, а не из query string
    let configData;
    try {
      if (!event.body) {
        throw new Error("Тело запроса отсутствует");
      }
      
      if (typeof event.body === 'string') {
        configData = JSON.parse(event.body);
      } else {
        configData = event.body;
      }
    } catch (parseError) {
      console.error("[saveConfig] Ошибка парсинга JSON из тела запроса:", parseError);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Неверный формат JSON в теле запроса' }),
      };
    }
    
    console.log("[saveConfig] Полученные данные конфигурации:", configData);
    
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
    
    const client = await getClient(false);
    try {
      // Проверка существования таблицы admins
      console.log("[saveConfig] Проверка существования таблицы admins...");
      const checkAdminsTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admins'
        ) AS table_exists;
      `;
      const checkAdminsResult = await client.query(checkAdminsTableQuery);
      const adminsTableExists = checkAdminsResult.rows[0].table_exists;
      console.log(`[saveConfig] Существует ли таблица admins: ${adminsTableExists}`);
      
      if (!adminsTableExists) {
        console.error("[saveConfig] Таблица admins не найдена в базе данных!");
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Таблица администраторов не найдена в базе данных.' }),
        };
      }
      
      // Проверка существования таблицы app_config
      console.log("[saveConfig] Проверка существования таблицы app_config...");
      const checkAppConfigTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'app_config'
        ) AS table_exists;
      `;
      const checkAppConfigResult = await client.query(checkAppConfigTableQuery);
      const appConfigTableExists = checkAppConfigResult.rows[0].table_exists;
      console.log(`[saveConfig] Существует ли таблица app_config: ${appConfigTableExists}`);
      
      if (!appConfigTableExists) {
        console.error("[saveConfig] Таблица app_config не найдена в базе данных!");
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Таблица конфигурации приложения не найдена в базе данных.' }),
        };
      }
      
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
        INSERT INTO app_config (config, updated_at)
        VALUES ($1, NOW())
        ON CONFLICT (id)
        DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
        RETURNING id
      `;
      const upsertResult = await client.query(upsertQuery, [configData]);
      const insertedId = upsertResult.rows[0].id;
      console.log(`[saveConfig] Конфигурация успешно сохранена с ID: ${insertedId}`);
      
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