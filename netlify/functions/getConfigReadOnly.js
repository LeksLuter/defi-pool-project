const { Client } = require('pg');

exports.handler = async (event, context) => {
  try {
    console.log("=== getConfigReadOnly Function Called ===");
    console.log("Headers:", event.headers);

    // На страницах, доступных всем, используем user address и readonly подключение
    const userAddress = event.headers['x-user-address'];
    console.log("User Address:", userAddress);

    // Проверяем, предоставлен ли адрес пользователя
    if (!userAddress) {
      console.warn('[API Server] X-User-Address header is missing');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется заголовок X-User-Address' }),
      };
    }

    // Определяем адрес администратора, чью конфигурацию нужно получить
    // Предполагается, что логика получения targetAddress определяется на стороне клиента
    // и передается как параметр или заголовок. Здесь мы используем userAddress
    // как идентификатор для поиска конфигурации конкретного админа (например, по умолчанию).
    // Для демонстрации будем использовать userAddress как targetAddress.
    // В реальной системе это может быть фиксированный адрес админа или определяться иначе.
    // !!! ВАЖНО: Этот подход подразумевает, что пользователь знает адрес админа,
    // чью конфигурацию он хочет получить. Это нужно реализовать на клиенте.
    // Ниже показана логика с заглушкой - получение конфигурации для userAddress,
    // что не совсем соответствует ТЗ. Правильнее передавать targetAdminAddress
    // отдельно (например, в query string или body).
    // Допустим, для всех пользователей мы хотим показывать конфигурацию админа по умолчанию.
    // const DEFAULT_ADMIN_ADDRESS = "0x..."; // Установите реальный адрес
    // const targetAddress = DEFAULT_ADMIN_ADDRESS || userAddress; // fallback на userAddress если default не задан

    // Для корректной реализации ТЗ, предположим, что targetAdminAddress передается в query string
    const urlParams = new URLSearchParams(event.queryStringParameters || {});
    const targetAdminAddress = urlParams.get('targetAdminAddress');

    if (!targetAdminAddress) {
      console.warn('[API Server] targetAdminAddress query parameter is missing');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Требуется параметр targetAdminAddress в query string' }),
      };
    }

    console.log("Target Admin Address (to read config for):", targetAdminAddress);

    // Проверяем переменные окружения
    console.log("NEON_DATABASE_URL_READONLY:", process.env.NEON_DATABASE_URL_READONLY ? "SET" : "NOT SET");
    console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL ? "SET" : "NOT SET");

    // Используем URL для пользователя с ограниченными правами, если доступен
    const databaseUrl = process.env.NEON_DATABASE_URL_READONLY || process.env.NEON_DATABASE_URL;

    if (!databaseUrl) {
      console.error("NEON_DATABASE_URL_READONLY или NEON_DATABASE_URL не установлен");
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'База данных не настроена: NEON_DATABASE_URL_READONLY или NEON_DATABASE_URL отсутствует',
        }),
      };
    }

    // Подключение к Neon через пользователя с ограниченными правами
    const client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("Подключение к Neon через пользователя с ограниченными правами успешно");

    // Пытаемся получить конфигурацию из базы данных для targetAdminAddress
    const result = await client.query(
      'SELECT config FROM admin_configs WHERE address = $1',
      [targetAdminAddress]
    );

    await client.end();

    if (result.rows.length > 0) {
      console.log("Конфигурация найдена в базе:", result.rows[0].config);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result.rows[0].config),
      };
    } else {
      console.log("Конфигурация не найдена в базе");
      // Возвращаем 404, чтобы клиент знал, что конфигурации нет
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Конфигурация не найдена' }),
      };
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