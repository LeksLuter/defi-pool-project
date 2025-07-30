import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Адреса администраторов
const ADMIN_ADDRESSES = ["0xe00Fb1e7E860C089503D2c842C683a7A3E57b614", "0x40A7e95F9DaEcDeEA9Ae823aC234af2C616C2D10"];

const Web3Context = createContext();

// Экспортируем хук для удобства использования
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // Состояние для проверки администратора
  const [error, setError] = useState(null);

  // Функция для подключения кошелька
  const connectWallet = async () => {
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask не установлен!');
      }

      // Запрашиваем доступ к аккаунтам
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chain = await window.ethereum.request({ method: 'eth_chainId' });

      // Создаем провайдер ethers
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();

      setProvider(newProvider);
      setSigner(newSigner);
      setAccount(accounts[0]);
      setChainId(parseInt(chain, 16)); // Преобразуем hex в decimal
      setIsConnected(true);

      // Проверяем, является ли адрес администратором
      const isUserAdmin = ADMIN_ADDRESSES.includes(accounts[0]);
      setIsAdmin(isUserAdmin);

    } catch (err) {
      console.error("Ошибка подключения кошелька:", err);
      setError(err.message);
      // Сбрасываем состояние в случае ошибки
      setProvider(null);
      setSigner(null);
      setAccount(null);
      setChainId(null);
      setIsConnected(false);
      setIsAdmin(false);
    }
  };

  // Функция для отключения кошелька
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setIsAdmin(false);
    setError(null);
  };

  // Эффект для обработки событий MetaMask
  useEffect(() => {
    if (window.ethereum) {
      // Обработчик изменения аккаунта
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          // Проверяем, является ли новый адрес администратором
          const isUserAdmin = ADMIN_ADDRESSES.includes(accounts[0]);
          setIsAdmin(isUserAdmin);
          // Пересоздаем signer с новым аккаунтом
          if (provider) {
            provider.getSigner().then(setSigner);
          }
        } else {
          // Если аккаунты отключены
          disconnectWallet();
        }
      };

      // Обработчик изменения сети
      const handleChainChanged = (chainIdHex) => {
        setChainId(parseInt(chainIdHex, 16));
        // Перезагружаем страницу при смене сети для простоты
        window.location.reload();
      };

      // Обработчик отключения (например, удаление доступа)
      const handleDisconnect = () => {
        disconnectWallet();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      // Очистка слушателей при размонтировании
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, [provider]);

  return (
    <Web3Context.Provider value={{
      provider,
      signer,
      account,
      chainId,
      isConnected,
      isAdmin, // Экспортируем состояние администратора
      connectWallet,
      disconnectWallet,
      error
    }}>
      {children}
    </Web3Context.Provider>
  );
};