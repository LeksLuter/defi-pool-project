// backend/api/server.js

const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

// Create Express app FIRST
const app = express();

// === КОНСТАНТЫ ===
const DEFAULT_APP_CONFIG = {
  // Настройки сервисов получения токенов
  tokenServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
    CoinMarketCap: true,
  },
  // Настройки сервисов получения цен
  priceServices: {
    EtherscanV2: true,
    Alchemy: true,
    DefiLlama: true,
    CoinGecko: true,
    CoinMarketCap: true,
  },
  // Интервал обновления данных (в минутах)
  updateIntervalMinutes: 5
};

const MIN_UPDATE_INTERVAL_MS = 30000; // 30 секунд
const CACHE_PREFIX = 'defi_pool';
const DEFAULT_CACHE_EXPIRY_MINUTES = 5;
const MIN_TOKEN_VALUE_USD = 0.1;
// === КОНЕЦ КОНСТАНТ ===

// === MIDDLEWARE ===
// Enable CORS for all routes
app.use(cors());

// Parse JSON body
app.use(express.json({ limit: '10mb' })); // Увеличиваем лимит для больших конфигов

// Logging middleware
app.use((req, res, next) => {
  console.log(`[API Server] ${req.method} ${req.path} called`);
  next();
});
// === КОНЕЦ MIDDLEWARE ===

/**
 * Подключается к базе данных Neon.
 * @param {boolean} useReadOnly - Если true, использует NEON_DATABASE_URL_TOKEN_USER, иначе NEON_DATABASE_URL.
 * @returns {Promise<Client>} - Экземпляр клиента pg.
 */
const connectToNeon = async (useReadOnly = false) => {
  // Определяем URL для подключения в зависимости от флага useReadOnly
  let databaseUrl;

  if (useReadOnly) {
    // Приоритет 1: Используем подключение для token_user
    databaseUrl = process.env.NEON_DATABASE_URL_TOKEN_USER;
    console.log("[API Server] Используется NEON_DATABASE_URL_TOKEN_USER для подключения (token_user/read-write)");
  } else {
    // Приоритет 2: Используем основное подключение администратора
    databaseUrl = process.env.NEON_DATABASE_URL;
    console.log("[API Server] Используется NEON_DATABASE_URL для подключения (admin/read-write)");
  }

  // Если URL для readonly не задан, пытаемся использовать основной URL
  if (useReadOnly && !databaseUrl) {
    console.warn("[API Server] NEON_DATABASE_URL_TOKEN_USER не найден, пробуем использовать NEON_DATABASE_URL");
    databaseUrl = process.env.NEON_DATABASE_URL;
  }
  
  if (!databaseUrl) {
    throw new Error(
      useReadOnly ? 'NEON_DATABASE_URL_TOKEN_USER или NEON_DATABASE_URL не задан в переменных окружения' :
      'NEON_DATABASE_URL не задан в переменных окружения'
    );
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false } // Neon обычно требует SSL
  });

  try {
    await client.connect();
    console.log(`[API Server] Подключение к Neon (${useReadOnly ? 'token_user' : 'admin'}) успешно`);
    return client;
  } catch (error) {
    console.error(`[API Server] Ошибка подключения к Neon (${useReadOnly ? 'token_user' : 'admin'}):`, error);
    throw error;
  }
};

/**
 * Создает необходимые таблицы в базе данных, если они еще не существуют.
 * @returns {Promise<void>}
 */
const createTables = async () => {
  const client = await connectToNeon(false); // Используем основное подключение для создания таблиц
  try {
    // Создание таблицы для конфигурации приложения
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        id SERIAL PRIMARY KEY,
        config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[API Server] Таблица app_config создана или уже существует");

    // Создание таблицы для списка администраторов
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum адрес, 42 символа с '0x'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[API Server] Таблица admins создана или уже существует");
    
    // === СОЗДАНИЕ ТАБЛИЦЫ TOKENS ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        coingecko_id VARCHAR(255) UNIQUE,
        cmc_id VARCHAR(50),
        logo_url TEXT,
        category VARCHAR(100),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("[API Server] Таблица tokens создана или уже существует");
    
    // Создание индексов для таблицы tokens
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tokens_name ON tokens(name);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tokens_coingecko_id ON tokens(coingecko_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tokens_cmc_id ON tokens(cmc_id);`);
    console.log("[API Server] Индексы для таблицы tokens созданы или уже существуют");
    
    // === СОЗДАНИЕ ТАБЛИЦЫ TOKEN_ADDRESSES ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS token_addresses (
        id SERIAL PRIMARY KEY,
        token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
        chain_id INTEGER NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        decimals INTEGER NOT NULL DEFAULT 18,
        address_type VARCHAR(50) DEFAULT 'canonical',
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(chain_id, contract_address),
        UNIQUE(token_id, chain_id)
      );
    `);
    console.log("[API Server] Таблица token_addresses создана или уже существует");
    
    // Создание индексов для таблицы token_addresses
    await client.query(`CREATE INDEX IF NOT EXISTS idx_token_addresses_chain_id ON token_addresses(chain_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_token_addresses_contract_address ON token_addresses(contract_address);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_token_addresses_token_id ON token_addresses(token_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_token_addresses_chain_contract ON token_addresses(chain_id, contract_address);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_token_addresses_token_chain ON token_addresses(token_id, chain_id);`);
    console.log("[API Server] Индексы для таблицы token_addresses созданы или уже существуют");
    
    // === КОНЕЦ СОЗДАНИЯ ТАБЛИЦ TOKENS ===

  } finally {
    await client.end();
  }
};

/**
 * Проверяет, является ли адрес администратором, обращаясь к базе данных.
 * @param {string} address - Адрес кошелька для проверки.
 * @returns {Promise<boolean>} - True, если адрес является администратором, иначе false.
 */
const isAdminInDB = async (address) => {
  if (!address) {
    console.warn('[API Server] Адрес для проверки isAdmin не предоставлен');
    return false;
  }

  let client;
  try {
    console.log(`[API Server] Проверка наличия адреса ${address} в списке администраторов`);
    // Используем подключение только для чтения
    client = await connectToNeon(true);
    const result = await client.query('SELECT 1 FROM admins WHERE address = $1', [address.toLowerCase()]);
    const isAdmin = result.rows.length > 0;
    console.log(`[API Server] Адрес ${address} ${isAdmin ? 'найден' : 'не найден'} в списке администраторов`);
    return isAdmin;
  } catch (error) {
    console.error('[API Server] Ошибка при проверке адреса в списке администраторов:', error);
    return false; // В случае ошибки считаем, что адрес не является админом
  } finally {
    if (client) {
      await client.end();
    }
  }
};

/**
 * Получает список администраторов из базы данных.
 * @returns {Promise<Array<string>>} - Массив адресов администраторов.
 */
const getAdminsFromDB = async () => {
  let client;
  try {
    console.log(`[API Server] Получение списка администраторов из БД`);
    // Используем подключение только для чтения
    client = await connectToNeon(true);
    // ИСПРАВЛЕНИЕ: Используем правильное имя столбца added_at вместо created_at
    const result = await client.query('SELECT address FROM admins ORDER BY added_at ASC');
    await client.end();
    
    // ИСПРАВЛЕНИЕ: Извлекаем адреса из каждой строки результата
    const admins = result.rows.map(row => row.address);
    console.log(`[API Server] Список администраторов успешно получен из БД:`, admins);
    return admins;
  } catch (error) {
    console.error('[API Server] Ошибка при получении списка администраторов из БД:', error);
    // Пробрасываем ошибку для обработки в вызывающем коде
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
};

/**
 * Добавляет адрес в список администраторов.
 * @param {string} address - Адрес для добавления.
 * @returns {Promise<void>}
 */
const addAdminToDB = async (address) => {
  let client;
  try {
    console.log(`[API Server] Добавление адреса ${address} в список администраторов`);
    // Используем основное подключение для записи
    client = await connectToNeon(false);
    await client.query('INSERT INTO admins (address) VALUES ($1) ON CONFLICT (address) DO NOTHING', [address.toLowerCase()]);
    await client.end();
    
    console.log(`[API Server] Адрес ${address} успешно добавлен в список администраторов`);
  } catch (error) {
    console.error(`[API Server] Ошибка при добавлении адреса ${address} в список администраторов:`, error);
    // Пробрасываем ошибку для обработки в вызывающем коде
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
};

/**
 * Удаляет адрес из списка администраторов.
 * @param {string} address - Адрес для удаления.
 * @returns {Promise<void>}
 */
const removeAdminFromDB = async (address) => {
  let client;
  try {
    console.log(`[API Server] Удаление адреса ${address} из списка администраторов`);
    // Используем основное подключение для записи
    client = await connectToNeon(false);
    await client.query('DELETE FROM admins WHERE address = $1', [address.toLowerCase()]);
    await client.end();
    
    console.log(`[API Server] Адрес ${address} успешно удален из списка администраторов`);
  } catch (error) {
    console.error(`[API Server] Ошибка при удалении адреса ${address} из списка администраторов:`, error);
    // Пробрасываем ошибку для обработки в вызывающем коде
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
};

// === MIDDLEWARE ДЛЯ ПРОВЕРКИ АДМИНИСТРАТОРА ===
/**
 * Middleware для проверки прав администратора.
 * Проверяет заголовок X-Admin-Address и сверяет адрес с БД.
 */
const requireAdmin = async (req, res, next) => {
  try {
    const adminAddress = req.headers['x-admin-address'];
    console.log(`[API Server] Middleware requireAdmin called with address: ${adminAddress}`);

    if (!adminAddress) {
      console.warn('[API Server] Заголовок X-Admin-Address отсутствует');
      return res.status(400).json({ error: 'Требуется заголовок X-Admin-Address' });
    }

    const isAdmin = await isAdminInDB(adminAddress);
    if (!isAdmin) {
      console.warn(`[API Server] Адрес ${adminAddress} не найден в списке администраторов`);
      return res.status(403).json({ error: 'Доступ запрещен. Адрес не является администратором.' });
    }

    // Добавляем адрес администратора в объект запроса для дальнейшего использования
    req.adminAddress = adminAddress;
    console.log(`[API Server] Адрес ${adminAddress} подтвержден как администратор`);
    next();
  } catch (error) {
    console.error('[API Server] Ошибка проверки прав администратора:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при проверке прав администратора', details: error.message });
  }
};
// === КОНЕЦ MIDDLEWARE ===

// === ENDPOINTS ===

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('[API Server] Health check endpoint called');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Локальный API сервер работает'
  });
});

// GET /api/app/config - Получить конфигурацию приложения (для чтения всеми пользователями)
app.get('/api/app/config', async (req, res) => {
  const userAddress = req.headers['x-user-address'] || req.headers['x-admin-address'];
  console.log(`[API Server] GET /api/app/config called with userAddress: ${userAddress}`);
  if (!userAddress) {
    console.warn('[API Server] X-User-Address or X-Admin-Address header is missing');
    return res.status(400).json({ error: 'Требуется заголовок X-User-Address или X-Admin-Address' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();
    
    // Получаем конфигурацию из базы данных (используем подключение только для чтения)
    const client = await connectToNeon(true);
    const result = await client.query('SELECT config FROM app_config ORDER BY id DESC LIMIT 1');
    await client.end();
    
    if (result.rows.length > 0) {
      console.log(`[API Server] Successfully retrieved app config for user ${userAddress}`);
      res.status(200).json(result.rows[0].config);
    } else {
      console.log(`[API Server] App config not found for user ${userAddress}, returning default`);
      res.status(200).json(DEFAULT_APP_CONFIG);
    }
  } catch (error) {
    console.error('[API Server] Error retrieving app config:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при получении конфигурации приложения', details: error.message });
  }
});

// POST /api/app/config - Сохранить конфигурацию приложения (только для админки)
app.post('/api/app/config', requireAdmin, async (req, res) => {
  const adminAddress = req.adminAddress; // Берем из middleware
  const configData = req.body;
  console.log(`[API Server] POST /api/app/config called with adminAddress: ${adminAddress}`);
  console.log('[API Server] Config Data:', configData);

  if (!configData || typeof configData !== 'object') {
    console.warn('[API Server] Invalid config data format');
    return res.status(400).json({ error: 'Неверный формат данных конфигурации' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();

    // Сохраняем конфигурацию в базу данных (используем основное подключение)
    const client = await connectToNeon(false); // Используем основное подключение для записи
    // Обновляем существующую запись или вставляем новую
    // Используем INSERT ... ON CONFLICT для обновления
    await client.query(
      `INSERT INTO app_config (config) 
       VALUES ($1) 
       ON CONFLICT (id) 
       DO UPDATE SET config = $1, updated_at = CURRENT_TIMESTAMP`,
      [configData]
    );
    await client.end();
    
    console.log(`[API Server] Successfully saved app config by admin ${adminAddress}`);
    res.status(200).json({
      message: 'Конфигурация приложения сохранена в базе данных',
      updatedBy: adminAddress
    });
  } catch (error) {
    console.error('[API Server] Error saving app config:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при сохранении конфигурации приложения', details: error.message });
  }
});

// GET /api/admins - Получить список администраторов (только для админки)
app.get('/api/admins', requireAdmin, async (req, res) => {
  const adminAddress = req.adminAddress; // Берем из middleware
  console.log(`[API Server] GET /api/admins called by admin: ${adminAddress}`);

  try {
    // Создаем таблицы если они не существуют
    await createTables();
    
    // ИСПРАВЛЕНИЕ: Используем обновленную функцию getAdminsFromDB
    const admins = await getAdminsFromDB();
    console.log(`[API Server] Successfully retrieved admins list for admin ${adminAddress}`);
    res.status(200).json({ admins });
  } catch (error) {
    console.error('[API Server] Error retrieving admins list:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при получении списка администраторов', details: error.message });
  }
});

// === ИСПРАВЛЕННЫЙ ENDPOINT ДЛЯ ПРОВЕРКИ АДМИНИСТРАТОРА ===
/**
 * GET /api/admins/check - Проверить, является ли адрес администратором
 * Ожидает адрес в query параметре `address`
 * Возвращает JSON { isAdmin: boolean, address: string }
 */
app.get('/api/admins/check', async (req, res) => {
  // Адрес для проверки берется из query параметра
  const addressToCheck = req.query.address;
  console.log(`[API Server] GET /api/admins/check called with address to check: ${addressToCheck}`);

  if (!addressToCheck) {
    console.warn('[API Server] Address query parameter is missing');
    return res.status(400).json({ error: 'Требуется параметр address в query string' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();
    
    // Проверяем, является ли адрес администратором
    const isAdmin = await isAdminInDB(addressToCheck);
    
    console.log(`[API Server] isAdmin check result for ${addressToCheck}: ${isAdmin}`);
    // Возвращаем результат в формате, ожидаемом фронтендом
    res.status(200).json({ isAdmin, address: addressToCheck });
  } catch (error) {
    console.error('[API Server] Error checking admin status:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при проверке прав администратора', details: error.message });
  }
});
// === КОНЕЦ ИСПРАВЛЕННОГО ENDPOINT ===

// POST /api/admins - Добавить администратора (только для админки)
app.post('/api/admins', requireAdmin, async (req, res) => {
  const adminAddress = req.adminAddress; // Берем из middleware
  const { newAdminAddress } = req.body;
  console.log(`[API Server] POST /api/admins called by admin: ${adminAddress} to add: ${newAdminAddress}`);

  if (!newAdminAddress) {
    return res.status(400).json({ error: 'Требуется поле newAdminAddress в теле запроса' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();
    
    // ИСПРАВЛЕНИЕ: Используем обновленную функцию addAdminToDB
    await addAdminToDB(newAdminAddress);
    console.log(`[API Server] Successfully added admin ${newAdminAddress} by admin ${adminAddress}`);
    res.status(200).json({ message: `Адрес ${newAdminAddress} добавлен в список администраторов` });
  } catch (error) {
    console.error('[API Server] Error adding admin:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при добавлении администратора', details: error.message });
  }
});

// DELETE /api/admins/:address - Удалить администратора (только для админки)
app.delete('/api/admins/:address', requireAdmin, async (req, res) => {
  const adminAddress = req.adminAddress; // Берем из middleware
  const addressToRemove = req.params.address;
  console.log(`[API Server] DELETE /api/admins/:address called by admin: ${adminAddress} to remove: ${addressToRemove}`);

  if (!addressToRemove) {
    return res.status(400).json({ error: 'Требуется адрес в URL' });
  }

  // Запрещаем админу удалить сам себя
  if (adminAddress.toLowerCase() === addressToRemove.toLowerCase()) {
    console.warn(`[API Server] Admin ${adminAddress} tried to remove themselves`);
    return res.status(400).json({ error: 'Нельзя удалить самого себя из списка администраторов' });
  }

  try {
    // Создаем таблицы если они не существуют
    await createTables();
    
    // ИСПРАВЛЕНИЕ: Используем обновленную функцию removeAdminFromDB
    await removeAdminFromDB(addressToRemove);
    console.log(`[API Server] Successfully removed admin ${addressToRemove} by admin ${adminAddress}`);
    res.status(200).json({ message: `Адрес ${addressToRemove} удален из списка администраторов` });
  } catch (error) {
    console.error('[API Server] Error removing admin:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при удалении администратора', details: error.message });
  }
});


// === НОВЫЕ ENDPOINTS ДЛЯ TOKENS (с использованием token_user) ===

/**
 * Получает токен по символу
 * GET /api/tokens/symbol/:symbol
 */
app.get('/api/tokens/symbol/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        console.log(`[API Server - Tokens] Получение токена по символу: ${symbol}`);

        const client = await connectToNeon(true); // Используем подключение TOKEN_USER для чтения
        // Запрос с JOIN для получения всех данных токена и его адресов
        const query = `
            SELECT t.*, 
                   json_agg(
                       json_build_object(
                           'chain_id', ta.chain_id,
                           'contract_address', ta.contract_address,
                           'decimals', ta.decimals,
                           'address_type', ta.address_type
                       ) ORDER BY ta.chain_id
                   ) AS addresses
            FROM tokens t
            LEFT JOIN token_addresses ta ON t.id = ta.token_id
            WHERE LOWER(t.symbol) = LOWER($1)
            GROUP BY t.id
        `;
        const values = [symbol];

        const result = await client.query(query, values);
        await client.end();

        if (result.rows.length === 0) {
            console.log(`[API Server - Tokens] Токен с символом ${symbol} не найден`);
            return res.status(404).json({ error: 'Токен не найден' });
        }

        // Форматируем результат: первый элемент - токен, addresses - массив адресов
        const token = result.rows[0];
        // Если нет адресов, addresses будет [null], заменяем на []
        if (!token.addresses || token.addresses.length === 0 || token.addresses[0] === null) {
            token.addresses = [];
        }
        
        console.log(`[API Server - Tokens] Токен ${symbol} найден:`, { id: token.id, symbol: token.symbol, coingecko_id: token.coingecko_id });
        res.status(200).json(token);
    } catch (error) {
        console.error('[API Server - Tokens] Ошибка при получении токена по символу:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
    }
});

/**
 * Получает токен по CoinGecko ID
 * GET /api/tokens/coingecko/:coingeckoId
 */
app.get('/api/tokens/coingecko/:coingeckoId', async (req, res) => {
    try {
        const { coingeckoId } = req.params;
        console.log(`[API Server - Tokens] Получение токена по CoinGecko ID: ${coingeckoId}`);

        const client = await connectToNeon(true); // Используем подключение TOKEN_USER для чтения
        // Запрос с JOIN для получения всех данных токена и его адресов
        const query = `
            SELECT t.*, 
                   json_agg(
                       json_build_object(
                           'chain_id', ta.chain_id,
                           'contract_address', ta.contract_address,
                           'decimals', ta.decimals,
                           'address_type', ta.address_type
                       ) ORDER BY ta.chain_id
                   ) AS addresses
            FROM tokens t
            LEFT JOIN token_addresses ta ON t.id = ta.token_id
            WHERE LOWER(t.coingecko_id) = LOWER($1)
            GROUP BY t.id
        `;
        const values = [coingeckoId];

        const result = await client.query(query, values);
        await client.end();

        if (result.rows.length === 0) {
            console.log(`[API Server - Tokens] Токен с CoinGecko ID ${coingeckoId} не найден`);
            return res.status(404).json({ error: 'Токен не найден' });
        }

        // Форматируем результат
        const token = result.rows[0];
        if (!token.addresses || token.addresses.length === 0 || token.addresses[0] === null) {
            token.addresses = [];
        }
        
        console.log(`[API Server - Tokens] Токен с CoinGecko ID ${coingeckoId} найден:`, { id: token.id, symbol: token.symbol });
        res.status(200).json(token);
    } catch (error) {
        console.error('[API Server - Tokens] Ошибка при получении токена по CoinGecko ID:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
    }
});

/**
 * Получает токен по адресу контракта и chainId
 * GET /api/tokens/address/:chainId/:contractAddress
 */
app.get('/api/tokens/address/:chainId/:contractAddress', async (req, res) => {
    try {
        const { chainId, contractAddress } = req.params;
        const chainIdInt = parseInt(chainId, 10);
        console.log(`[API Server - Tokens] Получение токена по адресу: ${contractAddress} в сети ${chainIdInt}`);

        // Валидация входных данных
        if (isNaN(chainIdInt)) {
            console.warn(`[API Server - Tokens] Некорректный chainId: ${chainId}`);
            return res.status(400).json({ error: 'Некорректный chainId' });
        }
        
        if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
            console.warn(`[API Server - Tokens] Некорректный адрес контракта: ${contractAddress}`);
            return res.status(400).json({ error: 'Некорректный адрес контракта' });
        }

        const client = await connectToNeon(true); // Используем подключение TOKEN_USER для чтения
        // Запрос с JOIN для получения всех данных токена и его адресов
        const query = `
            SELECT t.*, 
                   json_agg(
                       json_build_object(
                           'chain_id', ta.chain_id,
                           'contract_address', ta.contract_address,
                           'decimals', ta.decimals,
                           'address_type', ta.address_type
                       ) ORDER BY ta.chain_id
                   ) AS addresses
            FROM tokens t
            JOIN token_addresses ta ON t.id = ta.token_id
            WHERE ta.chain_id = $1 AND LOWER(ta.contract_address) = LOWER($2)
            GROUP BY t.id
        `;
        const values = [chainIdInt, contractAddress];

        const result = await client.query(query, values);
        await client.end();

        if (result.rows.length === 0) {
            console.log(`[API Server - Tokens] Токен с адресом ${contractAddress} в сети ${chainIdInt} не найден`);
            return res.status(404).json({ error: 'Токен не найден' });
        }

        // Форматируем результат
        const token = result.rows[0];
        if (!token.addresses || token.addresses.length === 0 || token.addresses[0] === null) {
            token.addresses = [];
        }
        
        console.log(`[API Server - Tokens] Токен с адресом ${contractAddress} в сети ${chainIdInt} найден:`, { id: token.id, symbol: token.symbol, coingecko_id: token.coingecko_id });
        res.status(200).json(token);
    } catch (error) {
        console.error('[API Server - Tokens] Ошибка при получении токена по адресу:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
    }
});

/**
 * Получает список токенов с пагинацией и фильтрацией (опционально)
 * GET /api/tokens
 */
app.get('/api/tokens', async (req, res) => {
    try {
        const { page = 1, limit = 50, symbol, chainId } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        
        console.log(`[API Server - Tokens] Получение списка токенов: page=${pageNum}, limit=${limitNum}, symbol=${symbol}, chainId=${chainId}`);

        // Валидация параметров пагинации
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: 'Некорректный номер страницы' });
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({ error: 'Некорректный лимит (1-100)' });
        }

        const client = await connectToNeon(true); // Используем подключение TOKEN_USER для чтения
        
        let baseQuery = `
            SELECT t.*, 
                   COUNT(*) OVER() AS total_count,
                   json_agg(
                       json_build_object(
                           'chain_id', ta.chain_id,
                           'contract_address', ta.contract_address,
                           'decimals', ta.decimals,
                           'address_type', ta.address_type
                       ) ORDER BY ta.chain_id
                   ) AS addresses
            FROM tokens t
        `;
        let joinClause = "LEFT JOIN token_addresses ta ON t.id = ta.token_id";
        let whereClauses = [];
        let values = [];
        let valueIndex = 1;

        // Добавляем фильтры
        if (symbol) {
            whereClauses.push(`LOWER(t.symbol) LIKE LOWER($${valueIndex})`);
            values.push(`%${symbol}%`);
            valueIndex++;
        }
        
        if (chainId) {
            const chainIdInt = parseInt(chainId, 10);
            if (isNaN(chainIdInt)) {
                await client.end();
                return res.status(400).json({ error: 'Некорректный chainId' });
            }
            // Если фильтр по chainId, то JOIN должен быть INNER, чтобы получить только токены в этой сети
            joinClause = "JOIN token_addresses ta ON t.id = ta.token_id";
            whereClauses.push(`ta.chain_id = $${valueIndex}`);
            values.push(chainIdInt);
            valueIndex++;
        }

        let query = baseQuery;
        if (whereClauses.length > 0) {
            query += ` ${joinClause} WHERE ${whereClauses.join(' AND ')}`;
        } else {
            query += ` ${joinClause}`;
        }
        
        // Группировка по токену
        query += " GROUP BY t.id";
        
        // Добавляем ORDER BY и LIMIT/OFFSET
        query += ` ORDER BY t.symbol`;
        query += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
        values.push(limitNum, (pageNum - 1) * limitNum);

        const result = await client.query(query, values);
        await client.end();

        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
        const totalPages = Math.ceil(totalCount / limitNum);

        // Форматируем результаты
        const tokens = result.rows.map(row => {
            if (!row.addresses || row.addresses.length === 0 || row.addresses[0] === null) {
                row.addresses = [];
            }
            delete row.total_count; // Удаляем служебное поле
            return row;
        });

        console.log(`[API Server - Tokens] Получено ${tokens.length} токенов из ${totalCount} (страница ${pageNum}/${totalPages})`);
        res.status(200).json({
            tokens,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                pageSize: limitNum
            }
        });
    } catch (error) {
        console.error('[API Server - Tokens] Ошибка при получении списка токенов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
    }
});

/**
 * POST /api/tokens - Создать или обновить токен
 * Использует подключение NEON_DATABASE_URL_TOKEN_USER для записи
 */
app.post('/api/tokens', async (req, res) => {
    try {
        const { symbol, name, coingecko_id } = req.body;
        console.log(`[API Server - Tokens] POST /api/tokens called with `, req.body);

        if (!coingecko_id) {
           return res.status(400).json({ error: 'Требуется поле coingecko_id' });
        }

        // Используем подключение TOKEN_USER для записи
        const client = await connectToNeon(false); 
        
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
        console.log(`[API Server - Tokens] Токен с coingecko_id ${coingecko_id} сохранен/обновлен через TOKEN_USER, ID: ${tokenId}`);
        res.status(201).json({ message: 'Токен сохранен', id: tokenId });
        
    } catch (error) {
        console.error('[API Server - Tokens] Ошибка при сохранении токена:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
    }
});

/**
 * POST /api/token-addresses - Создать адрес токена
 * Использует подключение NEON_DATABASE_URL_TOKEN_USER для записи
 */
app.post('/api/token-addresses', async (req, res) => {
  try {
    const { token_id, chain_id, contract_address, decimals = 18, address_type = 'canonical' } = req.body;
    console.log(`[API Server - Token Addresses] POST /api/token-addresses called with `, req.body);

    if (!token_id || !chain_id || !contract_address) {
       return res.status(400).json({ error: 'Требуются поля token_id, chain_id и contract_address' });
    }

    // Используем подключение TOKEN_USER для записи
    const client = await connectToNeon(false); 
    
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
    console.log(`[API Server - Token Addresses] Адрес токена ${contract_address} для chain_id ${chain_id} сохранен/обновлен через TOKEN_USER, ID: ${addressId}`);
    res.status(201).json({ message: 'Адрес токена сохранен', id: addressId });
    
  } catch (error) {
    console.error('[API Server - Token Addresses] Ошибка при сохранении адреса токена:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
  }
});

// === КОНЕЦ НОВЫХ ENDPOINTS ===


// Обработчик для всех остальных маршрутов
app.use('*', (req, res) => {
  console.log(`[API Server] Route not found: ${req.originalUrl}`);
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error('[API Server] Unhandled error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера', details: err.message });
});

// === КОНЕЦ ENDPOINTS ===

// === ЗАПУСК СЕРВЕРА ===
const startServer = async () => {
  try {
    // Проверяем наличие NEON_DATABASE_URL
    if (!process.env.NEON_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL не задан в переменных окружения. Пожалуйста, проверьте ваш .env файл.');
    }

    // Проверяем наличие NEON_DATABASE_URL_TOKEN_USER
    if (!process.env.NEON_DATABASE_URL_TOKEN_USER) {
      console.warn('[API Server] WARNING: NEON_DATABASE_URL_TOKEN_USER not set in environment variables. Will use NEON_DATABASE_URL for token operations.');
    } else {
      console.log('[API Server] NEON_DATABASE_URL_TOKEN_USER is set');
    }

    // Создаем таблицы при запуске сервера
    console.log("[API Server] Создание таблиц при запуске...");
    await createTables();
    console.log("[API Server] Таблицы успешно созданы или уже существовали");

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`[API Server] Локальный API сервер запущен на порту ${PORT}`);
      console.log(`[API Server] Health check endpoint: http://localhost:${PORT}/api/health`);
      console.log(`[API Server] App config endpoints:`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/app/config`);
      console.log(`[API Server] POST http://localhost:${PORT}/api/app/config`);
      console.log(`[API Server] Admin management endpoints:`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/admins`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/admins/check`);
      console.log(`[API Server] POST http://localhost:${PORT}/api/admins`);
      console.log(`[API Server] DELETE http://localhost:${PORT}/api/admins/:address`);
      // Новые endpoints
      console.log(`[API Server] Token management endpoints:`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/tokens/symbol/:symbol`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/tokens/coingecko/:coingeckoId`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/tokens/address/:chainId/:contractAddress`);
      console.log(`[API Server] GET http://localhost:${PORT}/api/tokens`);
      console.log(`[API Server] POST http://localhost:${PORT}/api/tokens`);
      console.log(`[API Server] POST http://localhost:${PORT}/api/token-addresses`);
    });
  } catch (error) {
    console.error('[API Server] Ошибка при запуске сервера:', error);
    process.exit(1);
  }
};

// Запускаем сервер
startServer();

module.exports = {
  // Экспортируем функции для использования в других модулях (например, для тестов)
  connectToNeon,
  createTables,
  isAdminInDB,
  getAdminsFromDB, // Экспортируем для использования в других модулях
  addAdminToDB,    // Экспортируем для использования в других модулях
  removeAdminFromDB // Экспортируем для использования в других модулях
};