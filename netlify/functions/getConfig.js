// netlify/functions/getConfig.js
import { getClient, DEFAULT_APP_CONFIG } from './utils/db.js';

exports.handler = async (event, context) => {
  let client = null;
  try {
    console.log("=== Get Config Function Called (Admin Read) ===");
    console.log("Event received:", JSON.stringify(event, null, 2));
    
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
    
    client = await getClient(false);
    try {
      // Проверка существования таблицы admins
      console.log("[getConfig] Проверка существования таблицы admins...");
      const checkAdminsTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admins'
        ) AS table_exists;
      `;
      const checkAdminsResult = await client.query(checkAdminsTableQuery);
      const adminsTableExists = checkAdminsResult.rows[0].table_exists;
      console.log(`[getConfig] Существует ли таблица admins: ${adminsTableExists}`);
      
      if (!adminsTableExists) {
        console.error("[getConfig] Таблица admins не найдена в базе данных!");
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
      console.log("[getConfig] Проверка существования таблицы app_config...");
      const checkAppConfigTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'app_config'
        ) AS table_exists;
      `;
      const checkAppConfigResult = await client.query(checkAppConfigTableQuery);
      const appConfigTableExists = checkAppConfigResult.rows[0].table_exists;
      console.log(`[getConfig] Существует ли таблица app_config: ${appConfigTableExists}`);
      
      if (!appConfigTableExists) {
        console.error("[getConfig] Таблица app_config не найдена в базе данных!");
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Таблица конфигурации приложения не найдена в базе данных.' }),
        };
      }
      
      // Выполняем проверку прав администратора
      console.log(`[getConfig] Выполнение проверки прав администратора для адреса ${normalizedAdminAddress}`);
      const adminCheckQuery = 'SELECT 1 FROM admins WHERE address = $1';
      const adminCheckResult = await client.query(adminCheckQuery, [normalizedAdminAddress]);
      console.log(`[getConfig] Результат проверки администратора: найдено записей ${adminCheckResult.rows.length}`);
      
      if (adminCheckResult.rows.length === 0) {
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
    
    client = await getClient(false);
    try {
      // Получаем последнюю конфигурацию из базы данных
      console.log("[getConfig] Выполнение SQL-запроса для получения последней конфигурации");
      // ИСПРАВЛЕНО: Используем правильное имя столбца 'updated_at' вместо 'created_at'
      const query = 'SELECT config FROM app_config ORDER BY updated_at DESC LIMIT 1';
      const result = await client.query(query);
      console.log(`[getConfig] SQL-запрос выполнен, получено строк: ${result.rows.length}`);
      
      if (result.rows.length > 0) {
        const configData = result.rows[0].config;
        if (configData === null) {
          console.log(`[getConfig] Последняя конфигурация в БД равна NULL, возврат дефолтной`);
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(DEFAULT_APP_CONFIG),
          };
        }
        console.log("[getConfig] Последняя конфигурация найдена и будет возвращена напрямую:", JSON.stringify(configData, null, 2));
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(configData),
        };
      } else {
        console.log("[getConfig] Конфигурация в БД не найдена, возврат дефолтной");
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