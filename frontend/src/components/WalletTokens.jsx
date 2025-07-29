import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';

// Пример адресов токенов (в реальном приложении их можно получить из контракта фабрики или другого источника)
const TOKEN_ADDRESSES = [
  { address: "0xTokenA", name: "TokenA", symbol: "TKA" },
  { address: "0xTokenB", name: "TokenB", symbol: "TKB" },
  { address: "0xTokenC", name: "TokenC", symbol: "TKC" }
];

// ABI для ERC20 токенов (минимальный набор функций)
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
        const tokenBalances = [];

        // Проходим по всем токенам и получаем баланс
        for (const tokenInfo of TOKEN_ADDRESSES) {
          try {
            const tokenContract = new ethers.Contract(
              tokenInfo.address,
              ERC20_ABI,
              provider
            );

            // Получаем символ, имя и количество знаков после запятой
            const [symbol, name, decimals, balance] = await Promise.all([
              tokenContract.symbol(),
              tokenContract.name(),
              tokenContract.decimals(),
              tokenContract.balanceOf(account)
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
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
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
              className="bg-gray-700 bg-opacity-50 rounded-xl p-4 backdrop-blur-sm border border-gray-600 hover:border-cyan-500 transition-all"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {token.symbol.charAt(0)}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">{token.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-900 text-cyan-300">
                      {token.symbol}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 truncate">{token.address}</p>
                  <div className="mt-2">
                    <p className="text-xl font-semibold text-white">
                      {parseFloat(token.balance).toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-500">Баланс</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WalletTokens;