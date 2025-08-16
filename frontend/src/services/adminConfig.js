// Упрощенный файл для совместимости или других целей
// Все основные функции перенесены в appConfig.js

// Реэкспортируем необходимые функции из appConfig.js
export {
  getTokenServicesConfig,
  getPriceServicesConfig,
  getUpdateIntervalMinutes,
  updateTokenServicesConfig,
  updatePriceServicesConfig,
  updateUpdateIntervalMinutes
} from '../config/appConfig';

// Если в будущем понадобятся специфические функции только для админки, их можно добавить сюда.
// Но в текущей реализации они не нужны.