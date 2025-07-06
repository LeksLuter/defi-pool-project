import { ethers } from "ethers";
import POOL_ABI from "./abi/LiquidityPool.json";

let provider;
let signer;

export const connectWallet = async () => {
  if (window.ethereum) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    return await signer.getAddress();
  } else {
    alert("MetaMask не установлен");
    throw new Error("MetaMask not found");
  }
};

export const getPoolContract = (poolAddress) => {
  return new ethers.Contract(poolAddress, POOL_ABI, signer);
};