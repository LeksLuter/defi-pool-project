// frontend/src/context/Web3Context.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Создаем контекст Web3
const Web3Context = createContext();

// Хук для использования контекста Web3
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Провайдер Web3
export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Состояние для проверки админа
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false); // Состояние загрузки проверки

  // Функция для подключения кошелька
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask не найден. Пожалуйста, установите MetaMask.');
      }

      // Запрашиваем доступ к аккаунтам
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });

      // Создаем провайдер и подписчика
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();

      // Обновляем состояние
      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0]);
      setChainId(parseInt(chainIdHex, 16));
      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error("Ошибка подключения к MetaMask:", err);
      setError(err.message || 'Ошибка подключения к MetaMask');
      disconnectWallet();
    }
  };

  // Функция для отключения кошелька
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setIsAdmin(false); // Сбрасываем статус админа при отключении
    setIsCheckingAdmin(false);
  };

  // Функция для переключения сети
  const switchNetwork = async (targetChainId) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethers.toBeHex(targetChainId) }],
      });
    } catch (switchError) {
      // Этот код будет выполнен, если пользователь не имеет запрошенной сети.
      if (switchError.code === 4902) {
        // Код ошибки 4902 означает, что сеть не добавлена в MetaMask.
        // Здесь можно реализовать добавление сети, если необходимо.
        console.error("Сеть не найдена в MetaMask. Пожалуйста, добавьте сеть вручную.");
        setError("Сеть не найдена в MetaMask. Пожалуйста, добавьте сеть вручную.");
      } else {
        console.error("Ошибка переключения сети:", switchError);
        setError("Ошибка переключения сети.");
      }
    }
  };

  // Функция для проверки, является ли адрес администратором
  const checkIsAdmin = async (userAddress) => {
    if (!userAddress) {
      console.warn('[Web3 Context] Адрес для проверки isAdmin не предоставлен');
      return false;
    }

    setIsCheckingAdmin(true);
    try {
      console.log(`[Web3 Context] Проверка isAdmin для адреса: ${userAddress}`);

      // Определяем URL для API в зависимости от среды выполнения
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          // Предполагаем, что у локального API есть endpoint для проверки
          // Это может быть GET /api/admins/check?address=... или POST с адресом в теле
          // Используем GET с query param для простоты
          // !!! ВАЖНО: Убедитесь, что этот endpoint существует на вашем сервере
          apiUrl = `http://localhost:3001/api/admins/check?address=${encodeURIComponent(userAddress)}`;
        } else {
          // Для Netlify Functions, возможно, нужна новая функция
          // Предположим, что у нас есть функция checkAdmin
          // !!! ВАЖНО: Убедитесь, что эта Netlify Function существует
          apiUrl = `/.netlify/functions/checkAdmin?address=${encodeURIComponent(userAddress)}`;
        }
      } else {
        // Для SSR
        // !!! ВАЖНО: Убедитесь, что этот endpoint существует
        apiUrl = `/.netlify/functions/checkAdmin?address=${encodeURIComponent(userAddress)}`;
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 секунд таймаут
      });

      console.log("[Web3 Context] Ответ от проверки isAdmin:", response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log(`[Web3 Context] Результат проверки isAdmin для ${userAddress}:`, data.isAdmin);
        return data.isAdmin === true;
      } else if (response.status === 404) {
        // Адрес не найден в списке админов
        console.log(`[Web3 Context] Адрес ${userAddress} не найден в списке администраторов`);
        return false;
      } else {
        const errorText = await response.text();
        console.warn(`[Web3 Context] Сервер вернул ошибку при проверке isAdmin: ${response.status} ${response.statusText} - ${errorText}`);
        return false; // По умолчанию не админ
      }
    } catch (e) {
      console.error("[Web3 Context] Ошибка сети при проверке isAdmin:", e);
      return false; // По умолчанию не админ
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  // Эффект для обработки изменений аккаунтов в MetaMask
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          // Проверка админа будет выполнена в следующем useEffect
        } else {
          disconnectWallet();
        }
      };

      const handleChainChanged = (chainIdHex) => {
        setChainId(parseInt(chainIdHex, 16));
        // Переподключаемся при смене сети
        connectWallet();
      };

      const handleDisconnect = () => {
        disconnectWallet();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, []);

  // Эффект для проверки isAdmin при изменении account
  useEffect(() => {
    const performIsAdminCheck = async () => {
      if (!account) {
        setIsAdmin(false);
        return;
      }

      try {
        const isAdminResult = await checkIsAdmin(account);
        setIsAdmin(isAdminResult);
      } catch (error) {
        console.error("Ошибка при проверке прав администратора:", error);
        setIsAdmin(false);
      }
    };

    performIsAdminCheck();
  }, [account]); // Зависимость от account

  return (
    <Web3Context.Provider value={{
      provider,
      signer,
      account,
      chainId,
      isConnected,
      error,
      isAdmin, // Экспортируем isAdmin
      isCheckingAdmin, // Экспортируем состояние проверки
      connectWallet,
      disconnectWallet,
      switchNetwork,
    }}>
      {children}
    </Web3Context.Provider>
  );
};