// frontend/src/constants.js

/**
 * Дефолтная конфигурация приложения.
 * Используется, если конфигурация не найдена в localStorage или на сервере.
 * Эта конфигурация теперь глобальная для всего приложения.
 */
export const DEFAULT_ADMIN_CONFIG = {
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
  updateIntervalMinutes: 5 // Установим дефолт 5 минут, как в server.js
};

// Если в проекте используются и другие константы, их можно добавить сюда позже.