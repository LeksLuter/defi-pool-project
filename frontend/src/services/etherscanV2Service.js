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
 * Нормализует символ токена для получения правильного CoinGecko ID
 * @param {string} symbol Символ токена
 * @returns {string} Нормализованный символ или null если неизвестен
 */
const normalizeTokenSymbol = (symbol) => {
  if (!symbol) return null;
  
  const normalizedSymbol = symbol.toLowerCase();
  
  // Сопоставление специфических символов с основными
  const symbolMap = {
    'usdt': 'tether',
    'wbtc': 'wrapped-bitcoin',
    'weth': 'weth',
    'matic': 'matic-network', // Для Polygon
    'usdc': 'usd-coin',
    'dai': 'dai',
    'link': 'chainlink',
    'shib': 'shiba-inu',
    'avax': 'avalanche-2',
    'busd': 'binance-usd',
    'uni': 'uniswap',
    'sol': 'solana',
    'dot': 'polkadot',
    'ltc': 'litecoin',
    'etc': 'ethereum-classic',
    'cro': 'crypto-com-chain',
    'atom': 'cosmos',
    'xtz': 'tezos',
    'bch': 'bitcoin-cash',
    'fil': 'filecoin',
    'ada': 'cardano',
    'trx': 'tron',
    'xrp': 'ripple',
    'doge': 'dogecoin',
    'ftm': 'fantom',
    'near': 'near',
    'algo': 'algorand',
    'grt': 'the-graph',
    'comp': 'compound-governance-token',
    'yfi': 'yearn-finance',
    'snx': 'havven',
    'aave': 'aave',
    'crv': 'curve-dao-token',
    'mana': 'decentraland',
    'sand': 'the-sandbox-game',
    'enj': 'enjincoin',
    'theta': 'theta-token',
    'bat': 'basic-attention-token',
    'zrx': '0x',
    'knc': 'kyber-network',
    'ren': 'republic-protocol',
    'uma': 'uma',
    'bal': 'balancer',
    'rlc': 'iexec-rlc',
    'ocean': 'ocean-protocol',
    'cvc': 'civic',
    'storj': 'storj',
    'gno': 'gnosis',
    '1inch': '1inch',
    'sushi': 'sushi',
    'cream': 'cream-2',
    'lrc': 'loopring',
    'band': 'band-protocol',
    'bnt': 'bancor',
    'chz': 'chiliz',
    'hot': 'holotoken',
    'ht': 'huobi-token',
    'okb': 'okb',
    'kcs': 'kucoin-shares',
    'leo': 'bitfinex-leo-token',
    'tusd': 'true-usd',
    'pax': 'paxos-standard',
    'gusd': 'gemini-dollar',
    'eurs': 'stasis-eurs',
    'czrx': 'compound-0x',
    'cbat': 'compound-basic-attention-token',
    'ceth': 'compound-ether',
    'cusdc': 'compound-usd-coin',
    'cusdt': 'compound-usdt',
    'cwbtc': 'compound-wrapped-btc',
    'cuni': 'compound-uniswap',
    'aave_usdt': 'aave-usdt',
    'aave_dai': 'aave-dai',
    'aave_wbtc': 'aave-wbtc',
    'aave_eth': 'aave-ether',
    'aave_link': 'aave-link',
    'aave_wmatic': 'aave-matic',
    'aave_usdc': 'aave-usd-coin',
    'wmatic': 'matic-network',
    'wbnb': 'binancecoin',
    'wavax': 'avalanche-2',
    'wsol': 'solana',
    'polygon-usdt': 'tether',
    'polygon-usdc': 'usd-coin',
    'polygon-wbtc': 'wrapped-bitcoin',
    'polygon-weth': 'ethereum',
    'bsc-usdt': 'tether',
    'bsc-usdc': 'usd-coin',
    'bsc-busd': 'binance-usd',
    'arbitrum-usdt': 'tether',
    'arbitrum-usdc': 'usd-coin',
    'optimism-usdt': 'tether',
    'optimism-usdc': 'usd-coin',
  };

  return symbolMap[normalizedSymbol] || null;
};

/**
 * Отправляет информацию о токене в базу данных Neon
 * @param {Object} tokenData Данные токена
 * @param {number} chainId ID сети
 */
const sendTokenToDatabase = async (tokenData, chainId) => {
  try {
    console.log(`[Etherscan V2 Service] Отправка токена в базу данных:`, tokenData);

    // Сначала создаем или обновляем токен в таблице tokens
    const tokenPayload = {
      symbol: tokenData.symbol,
      name: tokenData.name,
      coingecko_id: tokenData.coingecko_id || normalizeTokenSymbol(tokenData.symbol)
    };

    // Только если у нас есть coingecko_id, отправляем токен
    if (tokenPayload.coingecko_id) {
      // Используем тот же подход, что и в других сервисах - сначала пробуем Netlify Functions
      let tokenResponse;
      try {
        tokenResponse = await fetch('/.netlify/functions/saveToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tokenPayload),
        });
      } catch (fetchError) {
        console.warn(`[Etherscan V2 Service] Ошибка при вызове Netlify Functions, пробуем локальный API:`, fetchError.message);
        
        // Если Netlify Functions не доступен, пробуем локальный API
        try {
          tokenResponse = await fetch('/api/tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(tokenPayload),
          });
        } catch (localError) {
          console.error(`[Etherscan V2 Service] Ошибка при вызове локального API:`, localError.message);
          return; // Прерываем выполнение, если оба варианта не работают
        }
      }

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`[Etherscan V2 Service] Ошибка при сохранении токена в базу данных:`, errorText);
      } else {
        const tokenResult = await tokenResponse.json();
        console.log(`[Etherscan V2 Service] Токен сохранен в базу данных, ID:`, tokenResult.id);

        // Теперь создаем или обновляем адрес токена в таблице token_addresses
        const addressPayload = {
          token_id: tokenResult.id,
          chain_id: chainId,
          contract_address: tokenData.contractAddress,
          decimals: tokenData.decimals,
          address_type: 'canonical'
        };

        let addressResponse;
        try {
          addressResponse = await fetch('/.netlify/functions/saveTokenAddress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(addressPayload),
          });
        } catch (fetchError) {
          console.warn(`[Etherscan V2 Service] Ошибка при вызове Netlify Functions для адреса, пробуем локальный API:`, fetchError.message);
          
          // Если Netlify Functions не доступен, пробуем локальный API
          try {
            addressResponse = await fetch('/api/token-addresses', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(addressPayload),
            });
          } catch (localError) {
            console.error(`[Etherscan V2 Service] Ошибка при вызове локального API для адреса:`, localError.message);
            return; // Прерываем выполнение, если оба варианта не работают
          }
        }

        if (!addressResponse.ok) {
          const errorText = await addressResponse.text();
          console.error(`[Etherscan V2 Service] Ошибка при сохранении адреса токена в базу данных:`, errorText);
        } else {
          const addressResult = await addressResponse.json();
          console.log(`[Etherscan V2 Service] Адрес токена сохранен в базу данных, ID:`, addressResult.id);
        }
      }
    } else {
      console.log(`[Etherscan V2 Service] Пропуск сохранения токена ${tokenData.symbol} - нет coingecko_id`);
    }
  } catch (error) {
    console.error('[Etherscan V2 Service] Ошибка при отправке токена в базу данных:', error);
  }
};

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
      const nativeTokenSymbol = chainId === 137 ? 'MATIC' : 'ETH'; // Для Polygon используем MATIC
      const nativeTokenName = chainId === 137 ? 'Matic Token' : 'Ether';
      const nativeTokenCGId = chainId === 137 ? 'matic-network' : 'ethereum';
      
      const nativeToken = {
        contractAddress: nativeTokenAddress,
        name: nativeTokenName,
        symbol: nativeTokenSymbol,
        decimals: 18,
        balance: nativeBalance.toString(),
        chainId: chainId,
        coingecko_id: nativeTokenCGId
      };
      
      tokenDetails.push(nativeToken);
      console.log(`[Etherscan V2 Service] Добавлен нативный токен ${nativeTokenSymbol}`);
      
      // Отправляем нативный токен в базу данных
      await sendTokenToDatabase(nativeToken, chainId);
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

        const token = {
          contractAddress: tokenAddress,
          name: tokenInfo.tokenName,
          symbol: tokenInfo.tokenSymbol,
          decimals: tokenInfo.tokenDecimal,
          balance: balance.toString(),
          chainId: chainId
        };

        tokenDetails.push(token);

        // Отправляем токен в базу данных
        await sendTokenToDatabase(token, chainId);

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