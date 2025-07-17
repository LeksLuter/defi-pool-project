import { ethers } from "ethers";
import POOL_ABI from "./abi/LiquidityPool.json";
import VAULT_ABI from "./abi/TokenVault.json";

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
    throw new Error("MetaMask не найден");
  }
};

export const getPoolContract = (poolAddress) => {
  return poolAddress
    ? new ethers.Contract(poolAddress, POOL_ABI, signer)
    : null;
};

export const getVaultContract = (vaultAddress) => {
  return vaultAddress
    ? new ethers.Contract(vaultAddress, VAULT_ABI, signer)
    : null;
};