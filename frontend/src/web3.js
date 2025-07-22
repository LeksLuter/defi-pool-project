import { ethers } from "ethers";
import POOL_ABI from "./abi/LiquidityPool.json";
import VAULT_ABI from "./abi/TokenVault.json";

let provider;
let signer;

export const connectWallet = async () => {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      return await signer.getAddress();
    } catch (err) {
      console.error("Ошибка подключения MetaMask", err);
      alert("Ошибка подключения MetaMask");
      throw err;
    }
  } else {
    alert("MetaMask не установлен");
    throw new Error("MetaMask не найден");
  }
};

export const getPoolContract = (poolAddress) => {
  return new ethers.Contract(poolAddress, POOL_ABI, signer);
};

export const getVaultContract = (vaultAddress) => {
  return new ethers.Contract(vaultAddress, VAULT_ABI, signer);
};