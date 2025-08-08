// netlify/functions/testConnection.js
exports.handler = async (event, context) => {
  try {
    console.log("=== Test Connection Function Called ===");
    
    // Проверяем переменные окружения
    console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL ? "SET" : "NOT SET");
    
    if (!process.env.NEON_DATABASE_URL) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'NEON_DATABASE_URL не установлен',
          status: 'ERROR'
        })
      };
    }

    // Проверяем подключение к базе данных
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log("Подключение к Neon успешно");
    
    // Проверяем существование таблицы
    const tableCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_configs')"
    );
    
    await client.end();
    
    const tableExists = tableCheck.rows[0].exists;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'Подключение к базе данных успешно',
        table_exists: tableExists,
        status: 'SUCCESS'
      })
    };
  } catch (error) {
    console.error("Ошибка в testConnection:", error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Ошибка подключения к базе данных: ' + error.message,
        status: 'ERROR'
      })
    };
  }
};