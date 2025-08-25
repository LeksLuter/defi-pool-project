const { Client } = require('pg');

// Импортируем дефолтную конфигурацию из общего модуля
// Предполагается, что структура проекта позволяет такой импорт.
// Если прямой импорт затруднён, можно временно оставить локальное определение,
// но лучше стремиться к единственному источнику истины.
// import { DEFAULT_APP_CONFIG } from '../path/to/your/shared/config.js';
// Пока используем временное локальное определение, если импорт сложен.
// Убедитесь, что оно совпадает с frontend/src/constants.js
const DEFAULT_APP_CONFIG = {
  tokenServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
    // CoinMarketCap обычно отключен по умолчанию для токенов
  },
  priceServices: {
    CoinGecko: true,
    // Другие сервисы цен могут быть по умолчанию отключены или включены
    // в зависимости от вашей логики. Уточните в frontend/src/constants.js
    // EtherscanV2: true,
    // Alchemy: true,
    // DefiLlama: true,
    // CoinMarketCap: true,
  },
  updateIntervalMinutes: 5, // Дефолтный интервал 5 минут
};

/**
 * Получает клиент подключения к базе данных Neon.
 * @param {boolean} useReadOnly - Если true, использует URL для пользователя с ограниченными правами (readonly или token_user).
 * @returns {Promise<Client>} - Объект клиента pg.
 * @throws {Error} - Если URL не задан или подключение не удалось.
 */
const getClient = async (useReadOnly = false) => {
  let databaseUrl;
  let connectionType = 'admin';

  if (useReadOnly) {
    // Предпочтение отдается NEON_DATABASE_URL_READONLY для readonly операций
    databaseUrl = process.env.NEON_DATABASE_URL_READONLY || process.env.NEON_DATABASE_URL_TOKEN_USER || process.env.NEON_DATABASE_URL;
    connectionType = process.env.NEON_DATABASE_URL_READONLY ? 'readonly' : (process.env.NEON_DATABASE_URL_TOKEN_USER ? 'token_user' : 'admin (fallback)');
  } else {
    // Для операций записи/админки используем основной URL админа
    databaseUrl = process.env.NEON_DATABASE_URL;
    connectionType = 'admin';
  }

  if (!databaseUrl) {
    const missingEnvVar = useReadOnly
      ? 'NEON_DATABASE_URL_READONLY, NEON_DATABASE_URL_TOKEN_USER или NEON_DATABASE_URL'
      : 'NEON_DATABASE_URL';
    console.error(`[DB] ${missingEnvVar} не задан в переменных окружения`);
    throw new Error(`${missingEnvVar} не задан в переменных окружения`);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false } // Neon обычно требует SSL
  });

  try {
    await client.connect();
    console.log(`[DB] Подключение к Neon (${connectionType}) успешно`);
    return client;
  } catch (error) {
    console.error(`[DB] Ошибка подключения к Neon (${connectionType}):`, error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  try {
    console.log("=== Get Config Function Called (Read Only) ===");

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

    // Получаем заголовок X-User-Address (опционально, для будущего использования или логирования)
    const userAddress = event.headers['x-user-address'] || event.headers['X-User-Address'];
    console.log(`[getConfigReadOnly] Запрос конфигурации пользователем: ${userAddress || 'Не указан'}`);

    // Используем подключение только для чтения
    const client = await getClient(true); // true для readonly подключения

    try {
      // Запрашиваем последнюю конфигурацию из таблицы app_config.
      // Предполагаем, что id - это SERIAL PRIMARY KEY, поэтому ORDER BY id DESC
      // даст нам последнюю вставленную запись.
      console.log("[getConfigReadOnly] Запрос последней конфигурации из БД (ORDER BY id DESC LIMIT 1)...");
      const query = 'SELECT config FROM app_config ORDER BY id DESC LIMIT 1';
      const result = await client.query(query);

      if (result.rowCount > 0) {
        // result.rows[0].config уже является объектом JavaScript (JSONB -> Object)
        const configData = result.rows[0].config;
        console.log("[getConfigReadOnly] Последняя конфигурация найдена и будет возвращена напрямую:", JSON.stringify(configData, null, 2));
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
        console.log("[getConfigReadOnly] Конфигурация в БД не найдена, возврат дефолтной");
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
    console.error("Ошибка в getConfigReadOnly:", error);
    // В случае любой ошибки БД, возвращаем дефолтную конфигурацию как крайнюю меру
    console.log("[getConfigReadOnly] Ошибка БД, возврат дефолтной конфигурации как крайней меры");
    return {
      statusCode: 200, // Или 500, если считаем ошибку критичной. 200 позволяет приложению продолжить работу.
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(DEFAULT_APP_CONFIG), // Возвращаем дефолтную конфигурацию
    };
    // Альтернатива: вернуть ошибку
    /*
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Внутренняя ошибка сервера при загрузке конфигурации' }),
    };
    */
  }
};