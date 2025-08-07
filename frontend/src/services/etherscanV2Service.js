import { ethers } from 'ethers';
import { SUPPORTED_CHAINS } from '../config/supportedChains';

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];

const MAX_TOKENS_FROM_API = 50;
const MAX_TOKENS_TO_PROCESS = 100; // Увеличил лимит для обработки всех токенов
const API_TIMEOUT_MS = 15000;

/**
 * Получает список токенов с Etherscan V2 API (включая токены с нулевым балансом)
 * @param {string} accountAddress Адрес кошелька пользователя
 * @param {ethers.providers.Provider} ethProvider Провайдер ethers.js
 * @param {number} chainId ID сети
 * @returns {Promise<Array>} Массив объектов токенов
 */
export const fetchTokens = async (accountAddress, ethProvider, chainId) => {
  console.log(`[Etherscan V2 Service] Получение токенов для адреса: ${accountAddress} в сети с chainId: ${chainId}`);

  const networkConfig = SUPPORTED_CHAINS[chainId];
  if (!networkConfig) {
    console.warn(`[Etherscan V2 Service] Конфигурация сети ${chainId} не найдена в SUPPORTED_CHAINS`);
    return [];
  }

  const apiKey = networkConfig.explorerApiKey || import.meta.env.VITE_ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.warn(`[Etherscan V2 Service] API ключ для сети ${chainId} не найден`);
    return [];
  }

  const apiUrl = networkConfig.apiUrl;
  if (!apiUrl) {
    console.warn(`[Etherscan V2 Service] URL API для сети ${chainId} не найден`);
    return [];
  }

  // Формируем URL для запроса к Etherscan V2 API с обязательным параметром chainid
  // Убираем фильтрацию по умолчанию на стороне API, если это возможно
  // Некоторые API могут не иметь параметра для отключения фильтрации
  // В таком случае, получаем все доступные транзакции
  const url = `${apiUrl}?module=account&action=tokentx&address=${accountAddress}&chainid=${chainId}&sort=desc&page=1&offset=${MAX_TOKENS_FROM_API}&apikey=${apiKey}`;

  try {
    console.log(`[Etherscan V2 Service] URL запроса: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Etherscan V2 Service] HTTP ошибка: ${response.status}`, errorText);
      return [];
    }

    const data = await response.json();

    if (data.status !== "1") {
      console.warn(`[Etherscan V2 Service] API ошибка: ${data?.message || 'NOTOK'}`);
      return [];
    }

    if (!Array.isArray(data.result)) {
      console.warn(`[Etherscan V2 Service] Неверный формат ответа:`, data);
      return [];
    }

    console.log(`[Etherscan V2 Service] Получено ${data.result.length} записей`);

    // Собираем все уникальные адреса токенов из транзакций
    const uniqueTokens = new Set();
    const tokenSampleData = {};

    data.result.slice(0, MAX_TOKENS_FROM_API).forEach(tx => {
      const contractAddress = tx.contractAddress?.toLowerCase();
      if (!contractAddress || !ethers.utils.isAddress(contractAddress)) return;

      uniqueTokens.add(contractAddress);
      if (!tokenSampleData[contractAddress]) {
        tokenSampleData[contractAddress] = {
          tokenName: tx.tokenName || 'Unknown Token',
          tokenSymbol: tx.tokenSymbol || '???',
          tokenDecimal: parseInt(tx.tokenDecimal, 10) || 18
        };
      }
    });

    console.log(`[Etherscan V2 Service] Найдено ${uniqueTokens.size} уникальных токенов`);

    const tokenDetails = [];
    let tokenCount = 0;

    // Обрабатываем нативный токен отдельно
    try {
      const nativeBalance = await ethProvider.getBalance(accountAddress);
      const nativeTokenAddress = '0x0000000000000000000000000000000000000000';
      tokenDetails.push({
        contractAddress: nativeTokenAddress,
        tokenName: networkConfig.nativeTokenName || 'Native Token',
        tokenSymbol: networkConfig.nativeTokenSymbol || 'NATIVE',
        tokenDecimal: '18',
        balance: nativeBalance.toString()
      });
      tokenCount++;
      console.log(`[Etherscan V2 Service] Нативный токен добавлен с балансом: ${nativeBalance.toString()}`);
    } catch (err) {
      console.warn("[Etherscan V2 Service] Ошибка при получении баланса нативного токена:", err.message);
    }

    // Обрабатываем ERC20 токены
    // === ВАЖНОЕ ИЗМЕНЕНИЕ ===
    // Теперь мы не фильтруем токены по балансу > 0
    // Вместо этого получаем баланс для каждого уникального токена
    for (const tokenAddress of Array.from(uniqueTokens)) {
      // Пропускаем нативный токен, так как он уже добавлен
      if (tokenAddress === '0x0000000000000000000000000000000000000000') continue;

      if (tokenCount >= MAX_TOKENS_TO_PROCESS) {
        console.warn(`[Etherscan V2 Service] Достигнут лимит обработки токенов (${MAX_TOKENS_TO_PROCESS})`);
        break;
      }

      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethProvider);
        // Получаем баланс для каждого токена, включая 0
        const balance = await tokenContract.balanceOf(accountAddress);

        tokenDetails.push({
          contractAddress: tokenAddress,
          tokenName: tokenSampleData[tokenAddress]?.tokenName || 'Unknown Token',
          tokenSymbol: tokenSampleData[tokenAddress]?.tokenSymbol || '???',
          tokenDecimal: tokenSampleData[tokenAddress]?.tokenDecimal?.toString() || '18',
          balance: balance.toString() // Может быть "0"
        });

        tokenCount++;
        console.log(`[Etherscan V2 Service] Токен ${tokenSampleData[tokenAddress]?.tokenSymbol || tokenAddress} добавлен с балансом: ${balance.toString()}`);
      } catch (error) {
        console.warn(`[Etherscan V2 Service] Ошибка при обработке токена ${tokenAddress}:`, error.message);
        // Даже при ошибке получения баланса можно добавить токен с балансом 0
        // или пропустить его. Выберем второй вариант для простоты.
      }
    }

    console.log(`[Etherscan V2 Service] Успешно обработано ${tokenDetails.length} токенов (включая с нулевым балансом)`);
    return tokenDetails;

  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[Etherscan V2 Service] Критическая ошибка:', error.message);
    } else {
      console.warn('[Etherscan V2 Service] Таймаут запроса');
    }
    return [];
  }
};

/**
 * Получает цену токена с Etherscan V2 Stats API
 * @param {string} contractAddress Адрес контракта токена
 * @param {number} chainId ID сети
 * @returns {Promise<number|null>} Цена токена в USD или null
 */
export const fetchTokenPrice = async (contractAddress, chainId) => {
  console.log(`[Etherscan V2 Price Service] Получение цены для токена: ${contractAddress} в сети с chainId: ${chainId}`);

  const networkConfig = SUPPORTED_CHAINS[chainId];
  if (!networkConfig) {
    console.warn(`[Etherscan V2 Price Service] Конфигурация сети ${chainId} не найдена в SUPPORTED_CHAINS`);
    return null;
  }

  const apiKey = networkConfig.explorerApiKey || import.meta.env.VITE_ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.warn(`[Etherscan V2 Price Service] API ключ для сети ${chainId} не найден`);
    return null;
  }

  const apiUrl = networkConfig.apiUrl;
  if (!apiUrl) {
    console.warn(`[Etherscan V2 Price Service] URL API для сети ${chainId} не найден`);
    return null;
  }

  // Формируем URL для запроса к Etherscan V2 Stats API
  const url = `${apiUrl}?module=stats&action=tokenthadata&contractaddress=${contractAddress}&chainid=${chainId}&apikey=${apiKey}`;

  try {
    console.log(`[Etherscan V2 Price Service] URL запроса: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Etherscan V2 Price Service] HTTP ошибка: ${response.status}`, errorText);
      return null;
    }

    const data = await response.json();

    if (data.status !== "1") {
      console.warn(`[Etherscan V2 Price Service] API ошибка: ${data?.message || 'NOTOK'}`);
      return null;
    }

    const priceStr = data.result?.tokenPriceUSD;
    if (priceStr === undefined || priceStr === null) {
      console.warn(`[Etherscan V2 Price Service] Цена не найдена в ответе для токена ${contractAddress}`);
      return null;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price)) {
      console.warn(`[Etherscan V2 Price Service] Невозможно преобразовать цену "${priceStr}" в число для токена ${contractAddress}`);
      return null;
    }

    console.log(`[Etherscan V2 Price Service] Цена для токена ${contractAddress}: $${price.toFixed(4)}`);
    return price;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[Etherscan V2 Price Service] Критическая ошибка:', error.message);
    } else {
      console.warn('[Etherscan V2 Price Service] Таймаут запроса');
    }
    return null;
  }
};