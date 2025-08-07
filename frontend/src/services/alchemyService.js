import { Alchemy, Network } from "@alch/alchemy-sdk";
import { ethers } from 'ethers';

// ABI для ERC-20 токенов, используется для получения деталей токена
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)"
];

// Маппинг chainId в Network из Alchemy SDK
const CHAIN_ID_TO_ALCHEMY_NETWORK = {
  1: Network.ETH_MAINNET,
  5: Network.ETH_GOERLI,
  11155111: Network.ETH_SEPOLIA,
  137: Network.MATIC_MAINNET,
  80001: Network.MATIC_MUMBAI,
  42161: Network.ARB_MAINNET,
  421613: Network.ARB_GOERLI,
  10: Network.OPT_MAINNET,
  420: Network.OPT_GOERLI,
};

// Максимальное количество токенов для обработки
const MAX_TOKENS_TO_PROCESS = 100;
const API_TIMEOUT_MS = 15000;

/**
 * Создает экземпляр Alchemy SDK
 * @param {number} chainId ID сети
 * @returns {Alchemy|null} Экземпляр Alchemy или null в случае ошибки
 */
const createAlchemyInstance = (chainId) => {
  try {
    const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY;

    if (!apiKey) {
      console.warn('[Alchemy Service] API ключ Alchemy не найден в переменных окружения (VITE_ALCHEMY_API_KEY)');
      return null;
    }

    const network = CHAIN_ID_TO_ALCHEMY_NETWORK[chainId];
    if (!network) {
      console.warn(`[Alchemy Service] Сеть с chainId ${chainId} не поддерживается Alchemy SDK`);
      return null;
    }

    const settings = {
      apiKey: apiKey,
      network: network,
      maxRetries: 3
    };

    return new Alchemy(settings);
  } catch (error) {
    console.error('[Alchemy Service] Ошибка при создании экземпляра Alchemy:', error.message);
    return null;
  }
};

/**
 * Получает список токенов с использованием Alchemy SDK
 * @param {string} accountAddress Адрес кошелька пользователя
 * @param {ethers.providers.Provider} ethProvider Провайдер ethers.js (не используется напрямую, но сохранен для совместимости)
 * @param {number} chainId ID сети
 * @returns {Promise<Array>} Массив объектов токенов
 */
export const fetchTokens = async (accountAddress, ethProvider, chainId) => {
  console.log(`[Alchemy Service] Получение токенов для адреса: ${accountAddress} в сети с chainId: ${chainId}`);

  // Проверка входных параметров
  if (!accountAddress || !ethProvider || !chainId) {
    console.warn('[Alchemy Service] Некорректные параметры для получения токенов');
    return [];
  }

  try {
    const alchemy = createAlchemyInstance(chainId);
    if (!alchemy) {
      return [];
    }

    // Получаем балансы токенов
    console.log(`[Alchemy Service] Запрос балансов токенов через Alchemy SDK...`);
    const tokenBalancesResponse = await alchemy.core.getTokenBalances(accountAddress, { type: "erc20" });

    const tokenBalances = tokenBalancesResponse.tokenBalances || [];
    console.log(`[Alchemy Service] Получено ${tokenBalances.length} записей о балансах токенов`);

    // Фильтруем токены с нулевыми балансами и ограничиваем количество
    const nonZeroBalances = tokenBalances
      .filter(token => token.tokenBalance !== "0x0" && token.tokenBalance !== "0")
      .slice(0, MAX_TOKENS_TO_PROCESS);

    console.log(`[Alchemy Service] После фильтрации нулевых балансов: ${nonZeroBalances.length} токенов`);

    if (nonZeroBalances.length === 0) {
      console.log('[Alchemy Service] Токены с ненулевым балансом не найдены');
      return [];
    }

    // Получаем детали токенов (имя, символ, десятичные знаки)
    const tokenDetails = [];

    // Последовательно получаем информацию по каждому токену
    for (const token of nonZeroBalances) {
      try {
        const contractAddress = token.contractAddress;
        console.log(`[Alchemy Service] Получение деталей для токена: ${contractAddress}`);

        // Используем провайдер из Alchemy SDK для взаимодействия с контрактом
        const provider = await alchemy.config.getProvider();
        const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

        // Получаем данные токена параллельно
        const [name, symbol, decimals] = await Promise.all([
          tokenContract.name().catch(() => 'Unknown Token'),
          tokenContract.symbol().catch(() => 'UNKNOWN'),
          tokenContract.decimals().catch(() => 18)
        ]);

        // Преобразуем баланс из hex в decimal
        let balance;
        try {
          balance = ethers.BigNumber.from(token.tokenBalance).toString();
        } catch (balanceError) {
          console.warn(`[Alchemy Service] Ошибка при преобразовании баланса для токена ${contractAddress}:`, balanceError.message);
          balance = "0";
        }

        tokenDetails.push({
          contractAddress: contractAddress,
          tokenName: name,
          tokenSymbol: symbol,
          tokenDecimal: decimals.toString(),
          balance: balance
        });

        console.log(`[Alchemy Service] Добавлен токен: ${symbol} (${contractAddress}) с балансом ${balance}`);
      } catch (tokenError) {
        console.warn(`[Alchemy Service] Ошибка при получении деталей токена ${token.contractAddress}:`, tokenError.message);
        // Продолжаем обработку следующих токенов
      }
    }

    console.log(`[Alchemy Service] Успешно обработано ${tokenDetails.length} токенов`);
    return tokenDetails;

  } catch (error) {
    console.error('[Alchemy Service] Критическая ошибка при получении токенов:', error.message);
    return [];
  }
};

/**
 * Получает цену токена. Alchemy SDK напрямую не предоставляет цены токенов в USD.
 * @returns {Promise<number|null>} Цена токена в USD или null
 */
export const fetchTokenPrice = async () => {
  console.log(`[Alchemy Price Service] Получение цены токена напрямую через Alchemy не реализовано. Используйте агрегатор цен.`);
  return null;
};