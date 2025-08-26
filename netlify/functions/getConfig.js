// Этот файл отвечает за загрузку конфигурации администратора по его адресу.
// Он вызывается только из админки и требует заголовок X-Admin-Address.

import { getClient, DEFAULT_APP_CONFIG } from './utils/db.js'; // Импорт общего модуля

exports.handler = async (event, context) => {
  let client = null; // Инициализируем клиент как null

  try {
    console.log("=== Get Config Function Called (Admin Read) ===");
    console.log("Event received:", JSON.stringify(event, null, 2)); // Логируем весь event для отладки

    // Проверяем метод запроса
    if (event.httpMethod !== 'GET') {
      console.warn(`[getConfig] Неверный метод HTTP: ${event.httpMethod}`);
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Метод не разрешен' }),
      };
    }

    // === ИСПРАВЛЕНИЕ: Улучшенная и более надежная обработка заголовка X-Admin-Address ===
    let adminAddress = null;
    const headers = event.headers || {};
    const multiValueHeaders = event.multiValueHeaders || {};

    // Проверяем в headers (case-insensitive)
    for (const key in headers) {
      // Используем строгое сравнение по нижнему регистру
      if (key.toLowerCase() === 'x-admin-address') {
        adminAddress = headers[key];
        break;
      }
    }

    // Если не найден в headers, проверяем в multiValueHeaders
    if (!adminAddress) {
      for (const key in multiValueHeaders) {
        // Используем строгое сравнение по нижнему регистру
        if (key.toLowerCase() === 'x-admin-address' && Array.isArray(multiValueHeaders[key]) && multiValueHeaders[key].length > 0) {
          adminAddress = multiValueHeaders[key][0]; // Берем первый элемент
          break;
        }
      }
    }

    console.log(`[getConfig] Извлеченный adminAddress: '${adminAddress}'`);

    // Проверка, что adminAddress предоставлен и не пустая строка
    if (!adminAddress || adminAddress.trim() === '') {
      console.warn("[getConfig] Заголовок X-Admin-Address не предоставлен или пуст");
      return {
        statusCode: 400, // Bad Request - клиент не предоставил необходимые данные
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Заголовок X-Admin-Address обязателен и не должен быть пустым' }),
      };
    }

    // Нормализуем адрес перед использованием (убираем пробелы, приводим к нижнему регистру)
    const normalizedAdminAddress = adminAddress.trim().toLowerCase();
    console.log(`[getConfig] Нормализованный adminAddress: '${normalizedAdminAddress}'`);

    // Проверка формата Ethereum адреса (простая)
    if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedAdminAddress)) {
      console.warn(`[getConfig] Неверный формат адреса Ethereum: ${normalizedAdminAddress}`);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Неверный формат адреса Ethereum в заголовке X-Admin-Address' }),
      };
    }


    // Получаем клиент подключения к БД (полные права для чтения конфига админа)
    client = await getClient(false); // false - полные права
    console.log("[getConfig] Подключение к базе данных установлено");

    // === ИСПРАВЛЕНИЕ: Проверка существования администратора в БД ===
    // Это предотвращает попытки получить конфигурацию несуществующего админа
    try {
      const adminCheckResult = await client.query(
        'SELECT 1 FROM admins WHERE address = $1',
        [normalizedAdminAddress]
      );
      console.log(`[getConfig] Результат проверки администратора: найдено записей ${adminCheckResult.rows.length}`);
      if (adminCheckResult.rows.length === 0) {
        // Не закрываем клиент здесь, он будет закрыт в finally
        console.warn(`[getConfig] Адрес ${normalizedAdminAddress} не найден в списке администраторов`);
        return {
          statusCode: 403, // Forbidden - адрес известен, но не имеет прав
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Доступ запрещен. Адрес не является администратором.', address: normalizedAdminAddress }),
        };
      }
    } catch (adminCheckError) {
      console.error("[getConfig] Ошибка при проверке прав администратора в БД:", adminCheckError);
      // Не закрываем клиент здесь, он будет закрыт в finally
      // Возвращаем 500, так как это внутренняя ошибка БД при проверке
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Ошибка проверки прав администратора', details: adminCheckError.message }),
      };
    }

    // Запрашиваем конфигурацию из БД для данного администратора
    // === КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Изменено имя таблицы с app_configs на app_config ===
    const query = `
      SELECT config
      FROM app_config
      WHERE admin_address = $1
    `;
    console.log(`[getConfig] Выполнение SQL-запроса для адреса ${normalizedAdminAddress}`);
    const result = await client.query(query, [normalizedAdminAddress]);
    console.log(`[getConfig] SQL-запрос выполнен, получено строк: ${result.rows.length}`);

    // Клиент будет закрыт в блоке finally

    if (result.rows.length > 0) {
      // Конфигурация найдена
      const configData = result.rows[0].config;

      // Дополнительная проверка на случай, если config в БД NULL
      if (configData === null) {
        console.log(`[getConfig] Конфигурация в БД для ${normalizedAdminAddress} равна NULL, возвращаем дефолтную`);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(DEFAULT_APP_CONFIG),
        };
      }

      console.log("[getConfig] Конфигурация найдена в БД:", JSON.stringify(configData, null, 2));
      // Отправляем сам объект конфигурации напрямую, как ожидает фронтенд
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(configData), // ВАЖНО: Возвращаем configData напрямую
      };
    } else {
      // Конфигурация не найдена, возвращаем дефолтную
      console.log("[getConfig] Конфигурация в БД не найдена, возвращаем дефолтную");
      return {
        statusCode: 200, // 200 OK, просто дефолтные данные
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(DEFAULT_APP_CONFIG), // ВАЖНО: Возвращаем DEFAULT_APP_CONFIG напрямую
      };
    }

  } catch (error) {
    console.error("[getConfig] Необработанная ошибка:", error);
    // Возвращаем 500 с деталями ошибки для отладки (в продакшене лучше скрывать stack)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Внутренняя ошибка сервера при получении конфигурации',
        message: error.message,
        // stack: error.stack // Можно включить для отладки, но лучше убрать в продакшене
      }),
    };
  } finally {
    // === ИСПРАВЛЕНИЕ: Безопасное закрытие клиента ===
    // Закрываем соединение с БД в блоке finally, чтобы оно закрывалось в любом случае
    if (client) {
      try {
        await client.end();
        console.log("[getConfig] Подключение к базе данных закрыто");
      } catch (closeError) {
        console.error("[getConfig] Ошибка при закрытии подключения к БД:", closeError);
        // Не возвращаем ошибку, так как основная операция уже завершена
      }
    } else {
      console.log("[getConfig] Клиент БД не был инициализирован, закрытие не требуется");
    }
  }
};