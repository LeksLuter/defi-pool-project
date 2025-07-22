import React, { createContext, useState } from "react";
import { connectWallet, getPoolContract, getVaultContract } from "../web3";

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [poolContract, setPoolContract] = useState(null);
  const [vaultContract, setVaultContract] = useState(null);

  const connect = async () => {
    try {
      const address = await connectWallet();
      setAccount(address);
      
      // ✅ Исправлено: инициализация контрактов после подключения
      if (process.env.POOL_ADDRESS) {
        setPoolContract(getPoolContract(process.env.POOL_ADDRESS));
      }
      
      if (process.env.VAULT_ADDRESS) {
        setVaultContract(getVaultContract(process.env.VAULT_ADDRESS));
      }
    } catch (err) {
      console.error("Ошибка подключения кошелька", err);
      alert("Не удалось подключить кошелёк");
    }
  };

  const disconnect = () => {
    setAccount(null);
    setPoolContract(null);
    setVaultContract(null);
  };

  return (
    <Web3Context.Provider value={{ 
      account, 
      connect, 
      disconnect, 
      poolContract, 
      vaultContract 
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => React.useContext(Web3Context);