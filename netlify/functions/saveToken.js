exports.handler = async (event, context) => {
  // Импортируем необходимые модули
  const { Client } = require('pg');
  require('dotenv').config();

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Метод не разрешен' }),
    };
  }

  try {
    // Получаем тело запроса
    const { symbol, name, coingecko_id } = JSON.parse(event.body);

    if (!coingecko_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Требуется поле coingecko_id' }),
      };
    }

    // Подключаемся к базе данных Neon
    const databaseUrl = process.env.NEON_DATABASE_URL_TOKEN_USER || process.env.NEON_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('NEON_DATABASE_URL или NEON_DATABASE_URL_TOKEN_USER не задан в переменных окружения');
    }

    const client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false } // Neon обычно требует SSL
    });

    await client.connect();

    // Вставка или обновление токена
    const upsertQuery = `
      INSERT INTO tokens (symbol, name, coingecko_id, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (coingecko_id)
      DO UPDATE SET
        symbol = EXCLUDED.symbol,
        name = EXCLUDED.name,
        updated_at = NOW()
      RETURNING id;
    `;
    const upsertValues = [symbol, name, coingecko_id];

    const result = await client.query(upsertQuery, upsertValues);
    await client.end();

    const tokenId = result.rows[0]?.id;
    
    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Токен сохранен', id: tokenId }),
    };
  } catch (error) {
    console.error('Ошибка при сохранении токена:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Внутренняя ошибка сервера', details: error.message }),
    };
  }
};