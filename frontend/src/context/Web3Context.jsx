import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Адрес администратора
const ADMIN_ADDRESS = "0xe00Fb1e7E860C089503D2c842C683a7A3E57b614";

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
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Новое состояние для проверки админа

  const connectWallet = async () => {
    setError(null);
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const web3Signer = web3Provider.getSigner();
        const network = await web3Provider.getNetwork();

        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(accounts[0]);
        setChainId(network.chainId);
        setIsConnected(true);

        // Проверяем, является ли пользователь администратором
        setIsAdmin(accounts[0].toLowerCase() === ADMIN_ADDRESS.toLowerCase());
      } catch (err) {
        console.error("Ошибка подключения к кошельку:", err);
        setError("Не удалось подключиться к кошельку. Пожалуйста, попробуйте еще раз.");
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
    setError(null);
    setIsAdmin(false); // Сбрасываем состояние администратора
  };

  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
        // Проверяем, является ли пользователь администратором при смене аккаунта
        setIsAdmin(accounts[0].toLowerCase() === ADMIN_ADDRESS.toLowerCase());
      }
    };

    const handleChainChanged = (_chainId) => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

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