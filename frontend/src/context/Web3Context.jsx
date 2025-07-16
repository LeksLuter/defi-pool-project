import React, { createContext, useState } from "react";
import { connectWallet, getPoolContract, getVaultContract } from "../web3";

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);

  const connect = async () => {
    try {
      const address = await connectWallet();
      setAccount(address);
    } catch (e) {
      console.error(e);
    }
  };

  const getContracts = async (poolAddress, vaultAddress) => {
    const pool = await getPoolContract(poolAddress);
    const vault = await getVaultContract(vaultAddress);
    return { pool, vault };
  };

  return (
    <Web3Context.Provider value={{ account, connect, getContracts }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => React.useContext(Web3Context);