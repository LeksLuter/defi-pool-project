import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';

// 1. Создаем контекст
const TokenContext = createContext();

// 2. Создаем хук для удобства
export const useTokens = () => {
  // Всегда возвращаем безопасное значение по умолчанию
  // Это предотвратит "белый экран" если хук будет вызван вне провайдера
  const context = useContext(TokenContext);
  if (!context) {
    console.warn('useTokens() вызван вне TokenProvider. Возвращаю заглушку.');
    return {
      tokens: [],
      loading: false,
      error: null,
      refreshTokens: () => console.log('refreshTokens: заглушка'),
    };
  }
  return context;
};

// 3. Создаем провайдер
export const TokenProvider = ({ children }) => {
  const { account } = useWeb3();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 4. Простая функция обновления (заглушка)
  const refreshTokens = () => {
    console.log('TokenProvider: refreshTokens вызван');
    // Здесь будет логика получения токенов
    // Пока что просто симулируем
    setLoading(true);
    setError(null);
    setTimeout(() => {
      // Имитация получения данных
      if (account) {
        setTokens([
          { address: '0x0000000000000000000000000000000000000000', symbol: 'POL', name: 'Polygon', balance: '100.5', price: '0.8', value: '80.40' },
          { address: '0xTokenA', symbol: 'TKA', name: 'Token A', balance: '50.0', price: '2.0', value: '100.00' },
        ]);
      } else {
        setTokens([]);
      }
      setLoading(false);
    }, 500);
  };

  // 5. Вызываем refresh при изменении аккаунта
  useEffect(() => {
    console.log('TokenProvider: account changed, вызываю refreshTokens');
    refreshTokens();
  }, [account]);

  // 6. Провайдер возвращает контекст
  return (
    <TokenContext.Provider value={{ tokens, loading, error, refreshTokens }}>
      {children}
    </TokenContext.Provider>
  );
};