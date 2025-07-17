import React, { createContext, useState } from "react";
import { connectWallet, getPoolContract, getVaultContract } from "../web3";

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);

  const connect = async () => {
    const address = await connectWallet();
    setAccount(address);
  };

  const poolContract = getPoolContract(process.env.POOL_ADDRESS);
  const vaultContract = getVaultContract(process.env.VAULT_ADDRESS);

  return (
    <Web3Context.Provider value={{ account, connect, poolContract, vaultContract }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => React.useContext(Web3Context);