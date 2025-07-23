import React, { createContext, useState, useContext } from "react";

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);

  const connect = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setAccount(accounts[0]);
      } else {
        alert('MetaMask не установлен');
      }
    } catch (error) {
      console.error('Ошибка подключения кошелька:', error);
      alert('Не удалось подключить кошелёк');
    }
  };

  const disconnect = () => {
    setAccount(null);
  };

  return (
    <Web3Context.Provider value={{ 
      account, 
      connect, 
      disconnect
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};