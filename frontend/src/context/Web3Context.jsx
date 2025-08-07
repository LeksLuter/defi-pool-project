import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
// Адреса администраторов
const ADMIN_ADDRESSES = [
  "0xe00Fb1e7E860C089503D2c842C683a7A3E57b614",
  "0x40A7e95F9DaEcDeEA9Ae823aC234af2C616C2D10"
  // Добавьте сюда адреса реальных администраторов
];
// Создаем контекст Web3
const Web3Context = createContext();
// Экспортируем хук для удобства использования
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
// Создаем провайдер Web3
export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Новое состояние для проверки админа
  const connectWallet = async () => {
    setError(null);
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Запрашиваем доступ к аккаунтам
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        // Создаем провайдер ethers.js
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        // Получаем signer (подписывающее лицо)
        const web3Signer = web3Provider.getSigner();
        // Получаем информацию о сети
        const network = await web3Provider.getNetwork();
        // Устанавливаем состояние
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(accounts[0]);
        setChainId(network.chainId);
        setIsConnected(true);
        // Проверяем, является ли пользователь администратором
        setIsAdmin(ADMIN_ADDRESSES.some(addr => addr.toLowerCase() === accounts[0].toLowerCase()));
      } catch (err) {
        console.error("Ошибка подключения к MetaMask:", err);
        setError("Не удалось подключиться к MetaMask. Пожалуйста, попробуйте еще раз.");
      }
    } else {
      setError("Пожалуйста, установите MetaMask!");
    }
  };
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setIsAdmin(false);
    setError(null);
  };
  // Обработчики событий MetaMask
  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // Если аккаунты отключены
        disconnectWallet();
      } else {
        // Если аккаунт изменен
        setAccount(accounts[0]);
        // Проверяем, является ли пользователь администратором
        setIsAdmin(ADMIN_ADDRESSES.some(addr => addr.toLowerCase() === accounts[0].toLowerCase()));
      }
    };
    const handleChainChanged = (_chainId) => {
      // ВАЖНО: Убрана перезагрузка страницы. Теперь компоненты должны сами обновлять данные.
      // Обновляем chainId в состоянии
      setChainId(parseInt(_chainId, 16)); // _chainId приходит в hex формате
      console.log(`[Web3Context] Сеть изменена на chainId: ${_chainId}`);
      // Компоненты, использующие useWeb3, должны реагировать на изменение chainId
    };
    const handleDisconnect = (error) => {
      console.log("MetaMask отключен", error);
      disconnectWallet();
    };
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }
    // Очистка слушателей при размонтировании компонента
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);
  // Значения контекста
  const value = {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isAdmin, // Экспортируем состояние администратора
    connectWallet,
    disconnectWallet,
    error
  };
  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};
// Убираем или комментируем неправильный экспорт по умолчанию
// export default { useWeb3, Web3Provider };