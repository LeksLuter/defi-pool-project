import React, { createContext, useState } from "react";
import { connectWallet, getPoolContract } from "../web3";

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

  const addLiquidity = async (poolAddress, args) => {
    const pool = await getPoolContract(poolAddress);
    const tx = await pool.addLiquidity(...args);
    await tx.wait();
    return tx;
  };

  const removeLiquidity = async (poolAddress, tokenId) => {
    const pool = await getPoolContract(poolAddress);
    const tx = await pool.removeLiquidity(tokenId);
    await tx.wait();
    return tx;
  };

  const swap = async (poolAddress, tokenIn, amountIn) => {
    const pool = await getPoolContract(poolAddress);
    const tx = await pool.swap(tokenIn, amountIn);
    await tx.wait();
    return tx;
  };

  return (
    <Web3Context.Provider value={{ account, connect, addLiquidity, removeLiquidity, swap }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => React.useContext(Web3Context);