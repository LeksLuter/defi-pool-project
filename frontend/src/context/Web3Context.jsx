import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

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
  };

  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
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
      connectWallet,
      disconnectWallet,
      error
    }}>
      {children}
    </Web3Context.Provider>
  );
};