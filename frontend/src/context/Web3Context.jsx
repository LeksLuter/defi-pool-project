import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// ABI контрактов (в идеале импортировать из файлов)
// Примеры ABI (необходимо заменить на реальные)
const POOL_FACTORY_ABI = [
  "function createPool(address token0, address token1, uint256 feeRate) returns (address)",
  "function getPools() view returns (address[])"
];
const LIQUIDITY_POOL_ABI = [
  "function addLiquidity(uint256 amount0, uint256 amount1, uint256 lowerSqrtPrice, uint256 upperSqrtPrice)",
  "function removeLiquidity(uint256 tokenId)",
  "function swap(address tokenIn, uint256 amountIn)",
  "function getReserves() view returns (uint256, uint256)"
];
const TOKEN_VAULT_ABI = [
  "function deposit(address tokenAddress, uint256 amount)",
  "function withdraw(uint256 depositId)",
  "function getDepositsByUser(address user) view returns (tuple(address tokenAddress, uint256 amount, address depositor)[])"
];

// Адреса контрактов (должны быть установлены в .env)
const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || "YOUR_FACTORY_ADDRESS";
const VAULT_ADDRESS = import.meta.env.VITE_VAULT_ADDRESS || "YOUR_VAULT_ADDRESS";

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Состояния для контрактов
  const [factoryContract, setFactoryContract] = useState(null);
  const [vaultContract, setVaultContract] = useState(null);

  const connectWallet = async () => {
    setError(null);
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const web3Signer = web3Provider.getSigner();
        const network = await web3Provider.getNetwork();

        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(accounts[0]);
        setChainId(network.chainId);
        setIsConnected(true);

        // Инициализируем контракты
        const factory = new ethers.Contract(FACTORY_ADDRESS, POOL_FACTORY_ABI, web3Signer);
        const vault = new ethers.Contract(VAULT_ADDRESS, TOKEN_VAULT_ABI, web3Signer);
        setFactoryContract(factory);
        setVaultContract(vault);

      } catch (err) {
        console.error("Ошибка подключения к кошельку:", err);
        setError("Не удалось подключиться к кошельку. Пожалуйста, попробуйте еще раз.");
      }
    } else {
      setError("Пожалуйста, установите MetaMask!");
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setFactoryContract(null);
    setVaultContract(null);
    setError(null);
  };

  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = (_chainId) => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Функции для работы с контрактами
  const getPoolContract = (address) => {
    if (!signer) return null;
    return new ethers.Contract(address, LIQUIDITY_POOL_ABI, signer);
  };

  return (
    <Web3Context.Provider value={{
      provider,
      signer,
      account,
      chainId,
      isConnected,
      connectWallet,
      disconnectWallet,
      factoryContract,
      vaultContract,
      getPoolContract,
      error
    }}>
      {children}
    </Web3Context.Provider>
  );
};