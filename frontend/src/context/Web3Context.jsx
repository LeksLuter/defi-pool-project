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

  // ✅ Переменные окружения теперь через process.env
  const poolContract = process.env.POOL_ADDRESS ? getPoolContract(process.env.POOL_ADDRESS) : null;
  const vaultContract = process.env.VAULT_ADDRESS ? getVaultContract(process.env.VAULT_ADDRESS) : null;

  return (
    <Web3Context.Provider value={{ account, connect, poolContract, vaultContract }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => React.useContext(Web3Context);