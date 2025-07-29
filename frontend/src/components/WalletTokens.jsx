import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

// ABI для ERC20 токенов (минимальный набор функций для получения метаданных)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

const WalletTokens = () => {
  const { provider, account } = useWeb3();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTokenBalances = async () => {
      if (!provider || !account) {
        setTokens([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Получаем баланс MATIC напрямую через провайдер
        const maticBalance = await provider.getBalance(account);
        const formattedMaticBalance = ethers.utils.formatEther(maticBalance);

        // Используем Alchemy API для получения балансов токенов
        // Получаем URL Alchemy из провайдера
        const alchemyUrl = import.meta.env.VITE_ALCHEMY_POLYGON_MAINNET_URL;

        if (!alchemyUrl) {
          throw new Error('ALCHEMY_POLYGON_MAINNET_URL не задан в переменных окружения');
        }

        // Запрашиваем балансы токенов через Alchemy API
        const response = await fetch(alchemyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokenBalances',
            params: [account, 'erc20']
          })
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        const tokenBalances = [{
          address: '0x0000000000000000000000000000000000000000', // Адрес для нативного токена
          symbol: 'MATIC',
          name: 'Matic Token',
          balance: formattedMaticBalance,
          rawBalance: maticBalance,
          decimals: 18
        }];

        // Фильтруем токены с нулевым балансом
        const nonZeroTokens = data.result.tokenBalances.filter(token =>
          token.tokenBalance !== '0x0' && token.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        // Получаем метаданные для каждого токена
        for (const tokenInfo of nonZeroTokens) {
          try {
            // Создаем контракт токена
            const tokenContract = new ethers.Contract(tokenInfo.contractAddress, ERC20_ABI, provider);

            // Получаем символ, имя и десятичные знаки параллельно
            const [symbol, name, decimals] = await Promise.all([
              tokenContract.symbol().catch(() => 'UNKNOWN'),
              tokenContract.name().catch(() => 'Unknown Token'),
              tokenContract.decimals().catch(() => 18)
            ]);

            // Конвертируем баланс из hex в десятичный формат
            const balanceBN = ethers.BigNumber.from(tokenInfo.tokenBalance);
            const formattedBalance = ethers.utils.formatUnits(balanceBN, decimals);

            tokenBalances.push({
              address: tokenInfo.contractAddress,
              symbol: symbol,
              name: name,
              balance: formattedBalance,
              rawBalance: balanceBN.toString(),
              decimals: decimals
            });
          } catch (tokenError) {
            console.warn(`Ошибка при получении данных токена ${tokenInfo.contractAddress}:`, tokenError);
          }
        }

        setTokens(tokenBalances);
      } catch (err) {
        console.error("Ошибка при получении балансов токенов:", err);
        setError(`Не удалось получить балансы токенов: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenBalances();
  }, [provider, account]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-md text-sm"
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Токены кошелька</h2>
      {tokens.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="inline-block h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-300 mb-2">Токены не найдены</h3>
          <p className="text-gray-500">На вашем кошельке пока нет токенов</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((token, index) => (
            <div
              key={`${token.address}-${index}`}
              className="bg-gray-800 bg-opacity-50 p-4 rounded-xl backdrop-blur-sm border border-gray-700 hover:border-cyan-500 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{token.symbol}</h3>
                  <p className="text-gray-400 text-sm">{token.name}</p>
                </div>
                {token.address !== '0x0000000000000000000000000000000000000000' && (
                  <div className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">
                    ERC-20
                  </div>
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-cyan-400">{parseFloat(token.balance).toFixed(4)}</p>
                <p className="text-gray-500 text-xs mt-1 truncate">
                  {token.address === '0x0000000000000000000000000000000000000000'
                    ? 'Нативный токен сети'
                    : token.address}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WalletTokens;