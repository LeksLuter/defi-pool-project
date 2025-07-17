import React, { createContext, useState } from "react";
import { connectWallet, getPoolContract, getVaultContract } from "../web3";

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);

  const connect = async () => {
    try {
      const address = await connectWallet();
      setAccount(address);
    } catch (err) {
      console.error("Ошибка подключения кошелька", err);
    }
  };

  // ✅ Используем REACT_APP_ префикс
  const poolContract = process.env.REACT_APP_POOL_ADDRESS
    ? getPoolContract(process.env.REACT_APP_POOL_ADDRESS)
    : null;

  const vaultContract = process.env.REACT_APP_VAULT_ADDRESS
    ? getVaultContract(process.env.REACT_APP_VAULT_ADDRESS)
    : null;

  return (
    <Web3Context.Provider value={{ account, connect, poolContract, vaultContract }}>
      {children}
    </Web3Context.Provider>
  );
};

// ✅ Экспортируем хук
export const useWeb3 = () => React.useContext(Web3Context);