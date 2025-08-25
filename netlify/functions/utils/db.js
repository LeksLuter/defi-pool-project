// Общий модуль для работы с подключением к базе данных

import { Client } from 'pg';

// Дефолтная конфигурация приложения
export const DEFAULT_APP_CONFIG = {
  tokenServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
  },
  priceServices: {
    CoinGecko: true,
    CoinMarketCap: true,
  },
  updateIntervalMinutes: 5, // Дефолтный интервал 5 минут
};

/**
 * Получает клиент подключения к базе данных Neon.
 * @param {boolean} useReadOnly - Если true, использует URL для пользователя с ограниченными правами (readonly или token_user).
 * @returns {Promise<Client>} - Объект клиента pg.
 * @throws {Error} - Если URL не задан или подключение не удалось.
 */
export const getClient = async (useReadOnly = false) => {
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