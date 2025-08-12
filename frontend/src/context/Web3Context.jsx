// frontend/src/context/Web3Context.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
// Адреса администраторов
const ADMIN_ADDRESSES = [
  "0xe00Fb1e7E860C089503D2c842C683a7A3E57b614",
  "0x40A7e95f9daecdeea9ae823ac234af2c616c2d10"
  // Добавьте сюда адреса реальных администраторов
];

// Создаем контекст Web3
const Web3Context = createContext();

// Хук для использования контекста Web3
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Провайдер Web3
export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Новое состояние для проверки админа

  // Функция подключения кошелька
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

  // Функция отключения кошелька
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
      // Перезагружаем страницу при смене сети
      window.location.reload();
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

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  // Значение контекста
  const value = {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    error,
    isAdmin,
    connectWallet,
    disconnectWallet,
    switchNetwork: async (targetChainId) => {
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          });
        } catch (switchError) {
          // Этот код будет выполнен, если пользователь отказался переключать сеть
          console.error("Ошибка переключения сети:", switchError);
        }
      }
    }
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Context;