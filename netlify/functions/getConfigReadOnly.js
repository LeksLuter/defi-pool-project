// netlify/functions/getConfigReadOnly.js
import { getClient, DEFAULT_APP_CONFIG } from './utils/db.js'; // Импорт общего модуля

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

    // Получаем заголовок X-User-Address (опционально, для логирования)
    const userAddress = event.headers['x-user-address'] || event.headers['X-User-Address'];
    console.log(`[getConfigReadOnly] Запрос конфигурации пользователем: ${userAddress || 'Не указан'}`);

    // Используем подключение только для чтения
    const client = await getClient(true); // true для readonly подключения

    try {
      // ИСПРАВЛЕНО: config_data -> config (в предыдущем исправлении)
      // Запрашиваем конфигурацию. Предполагаем, что в таблице app_config
      // есть одна запись или мы берем последнюю/первую.
      // ВАЖНО: Возвращаем САМУ конфигурацию, а не объект { config: ... }
      const query = 'SELECT config FROM app_config LIMIT 1'; // Или ORDER BY updated_at DESC LIMIT 1
      const result = await client.query(query);

      if (result.rowCount > 0) {
        // result.rows[0].config уже является объектом JavaScript (JSONB -> Object)
        const configData = result.rows[0].config;
        console.log("[getConfigReadOnly] Конфигурация найдена и будет возвращена напрямую:", JSON.stringify(configData, null, 2));
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
        console.log("[getConfigReadOnly] Конфигурация не найдена, возврат дефолтной");
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