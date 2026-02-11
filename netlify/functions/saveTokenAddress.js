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
    const { token_id, chain_id, contract_address, decimals = 18, address_type = 'canonical' } = JSON.parse(event.body);

    if (!token_id || !chain_id || !contract_address) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Требуются поля token_id, chain_id и contract_address' }),
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

    // Вставка адреса токена
    const insertQuery = `
      INSERT INTO token_addresses (token_id, chain_id, contract_address, decimals, address_type, added_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (chain_id, contract_address)
      DO UPDATE SET
        token_id = EXCLUDED.token_id,
        decimals = EXCLUDED.decimals,
        address_type = EXCLUDED.address_type,
        added_at = NOW()
      RETURNING id;
    `;
    const insertValues = [token_id, chain_id, contract_address, decimals, address_type];

    const result = await client.query(insertQuery, insertValues);
    await client.end();

    const addressId = result.rows[0]?.id;
    
    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Адрес токена сохранен', id: addressId }),
    };
  } catch (error) {
    console.error('Ошибка при сохранении адреса токена:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Внутренняя ошибка сервера', details: error.message }),
    };
  }
};