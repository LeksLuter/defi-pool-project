// frontend/src/services/cacheService.js
// frontend/src/services/cacheService.js
const CACHE_PREFIX = 'walletTokens';
const DEFAULT_CACHE_EXPIRY_MINUTES = 10;

const getCacheKey = (account, chainId) => `${CACHE_PREFIX}_${chainId}_${account}`;
const getLastUpdateKey = (account, chainId) => `${CACHE_PREFIX}_lastUpdate_${chainId}_${account}`;

export const isCacheExpired = (timestamp, maxAgeMinutes = DEFAULT_CACHE_EXPIRY_MINUTES) => {
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  return (now - timestamp) > maxAgeMs;
};

export const getCachedTokens = (account, chainId) => {
  if (!account || !chainId) return null;
  
  try {
    const cacheKey = getCacheKey(account, chainId);
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { tokens, timestamp } = JSON.parse(cachedData);
      if (!isCacheExpired(timestamp)) {
        console.log('[Кэш] Загружены токены из кэша');
        return tokens;
      } else {
        console.log('[Кэш] Кэш устарел');
      }
    }
  } catch (error) {
    console.error('[Кэш] Ошибка при чтении кэша токенов:', error);
  }
  
  return null;
};

export const saveTokensToCache = (account, chainId, tokens) => {
  if (!account || !tokens || !chainId) return;
  
  try {
    const cacheKey = getCacheKey(account, chainId);
    const dataToCache = {
      tokens,
      timestamp: Date.now()
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
    console.log("[Кэш] Токены сохранены в кэш");
  } catch (error) {
    console.error("[Кэш] Ошибка при сохранении токенов в кэш:", error);
  }
};

export const setLastUpdateTime = (account, chainId) => {
  if (!account || !chainId) return;
  
  try {
    const lastUpdateKey = getLastUpdateKey(account, chainId);
    localStorage.setItem(lastUpdateKey, Date.now().toString());
  } catch (error) {
    console.error('[Кэш] Ошибка при сохранении времени последнего обновления:', error);
  }
};

export const canPerformBackgroundUpdate = (account, chainId, minIntervalMs) => {
  try {
    const lastUpdateKey = getLastUpdateKey(account, chainId);
    const lastUpdateStr = localStorage.getItem(lastUpdateKey);
    
    if (!lastUpdateStr) return true;
    
    const lastUpdate = parseInt(lastUpdateStr, 10);
    if (isNaN(lastUpdate)) return true;
    
    const now = Date.now();
    const timeDiff = now - lastUpdate;
    
    if (timeDiff < minIntervalMs) {
      console.warn(`[Обновление] Фоновое обновление отложено: прошло только ${timeDiff}мс из ${minIntervalMs}мс`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Обновление] Ошибка при проверке возможности фонового обновления:', error);
    return true;
  }
};