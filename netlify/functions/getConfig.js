exports.handler = async (event, context) => {
  try {
    const adminAddress = event.headers['x-admin-address'];
    
    if (!adminAddress) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Требуется заголовок X-Admin-Address' })
      };
    }

    // Подключение к Neon через environment variables
    const neonUrl = process.env.NEON_DATABASE_URL;
    
    // Здесь будет ваш код для работы с Neon базой
    // Например, через pg (PostgreSQL client)
    // const { Client } = require('pg');
    // const client = new Client(neonUrl);
    // await client.connect();
    // const result = await client.query('SELECT config FROM admin_configs WHERE address = $1', [adminAddress]);
    
    // Для примера возвращаем пустой объект
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ tokenServices: {}, priceServices: {}, updateIntervalMinutes: 10 })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Внутренняя ошибка сервера' })
    };
  }
};