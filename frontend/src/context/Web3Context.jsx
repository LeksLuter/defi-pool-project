import React, { createContext, useState } from "react";
import { connectWallet, getPoolContract, getVaultContract } from "../web3";

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);

  const connect = async () => {
    const address = await connectWallet();
    setAccount(address);
  };

  const poolContract = POOL_ADDRESS ? getPoolContract(POOL_ADDRESS) : null;
  const vaultContract = VAULT_ADDRESS ? getVaultContract(VAULT_ADDRESS) : null;

  return (
    <Web3Context.Provider value={{ account, connect, poolContract, vaultContract }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => React.useContext(Web3Context);