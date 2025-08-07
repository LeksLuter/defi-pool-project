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

    const configData = JSON.parse(event.body);
    
    // Сохраняем в Neon базу данных
    // const neonUrl = process.env.NEON_DATABASE_URL;
    // const { Client } = require('pg');
    // const client = new Client(neonUrl);
    // await client.connect();
    // await client.query(
    //   'INSERT INTO admin_configs (address, config) VALUES ($1, $2) ON CONFLICT (address) DO UPDATE SET config = $2',
    //   [adminAddress, JSON.stringify(configData)]
    // );
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'Конфигурация сохранена' })
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