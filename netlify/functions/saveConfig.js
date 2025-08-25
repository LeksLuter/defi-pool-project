import { getClient } from './utils/db.js'; // Импорт общего модуля

exports.handler = async (event, context) => {
  try {
    console.log("=== Save Config Function Called ===");

    // Проверяем метод запроса
    if (event.httpMethod !== 'POST') {
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
    const adminAddress = event.headers['x-admin-address'] || event.headers['X-Admin-Address'];

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

    // Парсим тело запроса
    let configData;
    try {
      configData = JSON.parse(event.body);
    } catch (parseError) {
      console.error("[saveConfig] Ошибка парсинга JSON тела запроса:", parseError);
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

    // Подключение к Neon через администратора (так как это защищенный endpoint)
    const client = await getClient(false); // false для админского подключения

    try {
      // Вставляем или обновляем конфигурацию в таблице app_config
      // Предполагаем, что у администратора может быть только одна конфигурация
      const upsertQuery = `
        INSERT INTO app_config (admin_address, config_data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (admin_address)
        DO UPDATE SET
          config_data = EXCLUDED.config_data,
          updated_at = NOW()
        RETURNING id;
      `;
      const upsertValues = [adminAddress, configData]; // configData будет автоматически сериализован в JSONB

      const result = await client.query(upsertQuery, upsertValues);
      const configId = result.rows[0]?.id;

      console.log(`[saveConfig] Конфигурация сохранена/обновлена для администратора ${adminAddress}, ID: ${configId}`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Конфигурация приложения сохранена в базе данных', updatedBy: adminAddress }),
      };
    } finally {
      await client.end();
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