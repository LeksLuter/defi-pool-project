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

    // Получаем заголовок X-User-Address (опционально, для будущего использования или логирования)
    const userAddress = event.headers['x-user-address'] || event.headers['X-User-Address'];
    console.log(`[getConfigReadOnly] Запрос конфигурации пользователем: ${userAddress || 'Не указан'}`);

    // Используем подключение только для чтения
    const client = await getClient(true); // true для readonly подключения

    try {
      // ИСПРАВЛЕНО: config_data -> config
      // Получаем конфигурацию из таблицы app_config
      // Предполагаем, что есть одна "публичная" или "дефолтная" конфигурация
      // или последняя сохраненная админом. Здесь выбираем первую запись.
      const query = 'SELECT config FROM app_config LIMIT 1';
      const result = await client.query(query);

      if (result.rowCount > 0) {
        const configData = result.rows[0].config; // ИСПРАВЛЕНО: config
        console.log("[getConfigReadOnly] Конфигурация найдена");
        // Возвращаем найденную конфигурацию
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(configData), // config_data уже является объектом JSONB
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
          body: JSON.stringify(DEFAULT_APP_CONFIG),
        };
      }
    } finally {
      await client.end();
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