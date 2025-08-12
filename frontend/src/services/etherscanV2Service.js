// frontend/src/services/etherscanV2Service.js
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS } from '../config/supportedChains';

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];

const MAX_TOKENS_FROM_API = 50;
const MAX_TOKENS_TO_PROCESS = 100;
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
  
  // Проверка входных параметров
  if (!accountAddress || !ethProvider || !chainId) {
    console.warn('[Etherscan V2 Service] Некорректные параметры для получения токенов');
    return [];
  }

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

  try {
    // Формируем URL запроса
    const url = `${apiUrl}?module=account&action=tokentx&address=${accountAddress}&chainid=${chainId}&sort=desc&page=1&offset=50&apikey=${apiKey}`;
    console.log(`[Etherscan V2 Service] URL запроса: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(url, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Etherscan V2 Service] Ошибка HTTP: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    console.log(`[Etherscan V2 Service] Получено ${data.result ? data.result.length : 0} записей`);

    if (!data || !data.result || !Array.isArray(data.result)) {
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
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
        balance: nativeBalance.toString(),
        chainId: chainId
      });
      console.log(`[Etherscan V2 Service] Добавлен нативный токен ETH`);
    } catch (nativeError) {
      console.warn(`[Etherscan V2 Service] Ошибка получения баланса нативного токена:`, nativeError);
    }

    // Обрабатываем токены с балансами
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
        
        const tokenInfo = tokenSampleData[tokenAddress] || {
          tokenName: 'Unknown Token',
          tokenSymbol: '???',
          tokenDecimal: 18
        };

        tokenDetails.push({
          contractAddress: tokenAddress,
          name: tokenInfo.tokenName,
          symbol: tokenInfo.tokenSymbol,
          decimals: tokenInfo.tokenDecimal,
          balance: balance.toString(),
          chainId: chainId
        });
        
        tokenCount++;
      } catch (error) {
        console.warn(`[Etherscan V2 Service] Ошибка получения баланса для токена ${tokenAddress}:`, error);
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
 * Получает цену токена через Etherscan V2 (заглушка)
 * @param {string} contractAddress - Адрес контракта токена
 * @param {number} chainId - ID сети
 * @param {string} apiKey - API ключ
 * @returns {Promise<number|null>} Цена токена или null
 */
export const fetchTokenPrice = async (contractAddress, chainId, apiKey) => {
  console.log(`[Etherscan V2 Price Service] Получение цены для токена: ${contractAddress} в сети с chainId: ${chainId}`);
  
  // В настоящий момент Etherscan V2 не предоставляет API для получения цен
  // Это заглушка, которая может быть реализована позже
  console.log(`[Etherscan V2 Price Service] Получение цены токена напрямую через Etherscan V2 не реализовано. Используйте агрегатор цен.`);
  return null;
};