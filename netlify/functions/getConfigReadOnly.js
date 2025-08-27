// netlify/functions/getConfigReadOnly.js
import { Client } from 'pg';

// Дефолтная конфигурация приложения
const DEFAULT_APP_CONFIG = {
  tokenServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
    CoinMarketCap: true,
  },
  priceServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
    CoinMarketCap: true,
  },
  updateIntervalMinutes: 5, // Дефолтный интервал 5 минут
};

exports.handler = async (event, context) => {
  let client = null;
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
    
    // Поиск X-User-Address в headers
    for (const key in headers) {
      if (key.toLowerCase() === 'x-user-address') {
        userAddress = headers[key];
        break;
      }
    }
    
    // Если не найден в headers, проверяем в multiValueHeaders
    if (!userAddress) {
      for (const key in multiValueHeaders) {
        if (key.toLowerCase() === 'x-user-address' && Array.isArray(multiValueHeaders[key]) && multiValueHeaders[key].length > 0) {
          userAddress = multiValueHeaders[key][0];
          break;
        }
      }
    }
    
    console.log(`[getConfigReadOnly] Запрос конфигурации пользователем: ${userAddress || 'Не указан'}`);

    // Проверяем переменные окружения
    if (!process.env.NEON_DATABASE_URL) {
      console.error("[getConfigReadOnly] NEON_DATABASE_URL не задан в переменных окружения");
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Ошибка конфигурации сервера: база данных не настроена' }),
      };
    }

    // Используем подключение только для чтения
    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log("[getConfigReadOnly] Подключение к БД установлено");

      // Проверяем существование таблицы app_config
      console.log("[getConfigReadOnly] Проверка существования таблицы app_config...");
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'app_config'
        ) AS table_exists;
      `;
      
      const checkTableResult = await client.query(checkTableQuery);
      const tableExists = checkTableResult.rows[0].table_exists;
      console.log(`[getConfigReadOnly] Существует ли таблица app_config: ${tableExists}`);

      if (!tableExists) {
        console.warn("[getConfigReadOnly] Таблица app_config не найдена в базе данных!");
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(DEFAULT_APP_CONFIG),
        };
      }

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
        
        console.log("[getConfigReadOnly] Последняя конфигурация найдена и будет возвращена");
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
        console.log("[getConfigReadOnly] Клиент БД закрыт");
      }
    }
  } catch (error) {
    console.error("Ошибка в getConfigReadOnly:", error);
    
    if (client) {
      try {
        await client.end();
        console.log("[getConfigReadOnly] Клиент БД закрыт из-за ошибки");
      } catch (closeError) {
        console.error("[getConfigReadOnly] Ошибка при закрытии клиента БД:", closeError);
      }
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Внутренняя ошибка сервера: ' + error.message,
        stack: error.stack 
      }),
    };
  }
};