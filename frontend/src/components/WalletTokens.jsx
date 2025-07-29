import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

// ABI для ERC20 токенов (минимальный набор функций для получения баланса)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

const WalletTokens = () => {
  const { provider, account } = useWeb3();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Список токенов для отображения (в реальном приложении можно получать динамически)
  // Используем адреса из переменных окружения
  const tokenList = [
    {
      address: import.meta.env.VITE_TOKEN_A_ADDRESS || '0x0000000000000000000000000000000000000000',
      name: 'Token A',
      symbol: 'TKA'
    },
    {
      address: import.meta.env.VITE_TOKEN_B_ADDRESS || '0x0000000000000000000000000000000000000000',
      name: 'Token B',
      symbol: 'TKB'
    },
    // Можно добавить больше токенов по необходимости
  ];

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

        const tokenBalances = [{
          address: '0x0000000000000000000000000000000000000000', // Адрес для нативного токена
          symbol: 'MATIC',
          name: 'Matic Token',
          balance: formattedMaticBalance,
          rawBalance: maticBalance,
          decimals: 18
        }];

        // Проходим по всем токенам и получаем баланс
        for (const tokenInfo of tokenList) {
          // Пропускаем токены без адреса
          if (!tokenInfo.address || tokenInfo.address === '0x0000000000000000000000000000000000000000' || tokenInfo.address === 'Не задан') {
            continue;
          }

          try {
            const tokenContract = new ethers.Contract(tokenInfo.address, ERC20_ABI, provider);

            // Получаем символ, имя, десятичные знаки и баланс параллельно
            const [symbol, name, decimals, balance] = await Promise.all([
              tokenContract.symbol().catch(() => tokenInfo.symbol || 'UNKNOWN'),
              tokenContract.name().catch(() => tokenInfo.name || 'Unknown Token'),
              tokenContract.decimals().catch(() => 18),
              tokenContract.balanceOf(account).catch(() => ethers.BigNumber.from(0))
            ]);

            // Форматируем баланс с учетом десятичных знаков
            const formattedBalance = ethers.utils.formatUnits(balance, decimals);

            tokenBalances.push({
              address: tokenInfo.address,
              symbol: symbol || tokenInfo.symbol,
              name: name || tokenInfo.name,
              balance: formattedBalance,
              rawBalance: balance,
              decimals: decimals
            });
          } catch (tokenError) {
            console.warn(`Ошибка при получении данных токена ${tokenInfo.address}:`, tokenError);
            // Добавляем токен с нулевым балансом, если не удалось получить данные
            tokenBalances.push({
              address: tokenInfo.address,
              symbol: tokenInfo.symbol || 'UNKNOWN',
              name: tokenInfo.name || 'Unknown Token',
              balance: "0",
              rawBalance: "0",
              decimals: 18
            });
          }
        }

        setTokens(tokenBalances);
      } catch (err) {
        console.error("Ошибка при получении балансов токенов:", err);
        setError("Не удалось получить балансы токенов");
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
                <p className="text-2xl font-bold text-cyan-400">{token.balance}</p>
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