// frontend/src/context/Web3Context.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
// Явно импортируем BrowserProvider из ethers.js v6
import { BrowserProvider } from 'ethers';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  // Функция для подключения кошелька
  const connectWallet = async () => {
    try {
      // Проверяем наличие window.ethereum
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask не найден. Пожалуйста, установите MetaMask.');
      }

      console.log('[Web3 Context] Запрос подключения к MetaMask...');
      
      // Запрашиваем доступ к аккаунтам
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('Аккаунты не найдены в MetaMask');
      }

      // Получаем ID текущей сети
      const chainIdHex = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });

      console.log('[Web3 Context] Создание провайдера ethers...');
      
      // Создаем провайдер ethers.js v6
      // Используем импортированный BrowserProvider напрямую
      const web3Provider = new BrowserProvider(window.ethereum);
      
      console.log('[Web3 Context] Получение signer...');
      // Получаем signer (подписывающее лицо)
      const web3Signer = await web3Provider.getSigner();

      // Обновляем состояние
      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0]);
      setChainId(parseInt(chainIdHex, 16));
      setIsConnected(true);
      setError(null);
      
      console.log('[Web3 Context] Кошелек успешно подключен:', {
        account: accounts[0],
        chainId: parseInt(chainIdHex, 16)
      });
    } catch (err) {
      console.error("[Web3 Context] Ошибка подключения к MetaMask:", err);
      console.error("[Web3 Context] Stack trace:", err.stack);
      
      // Формируем понятное сообщение об ошибке
      let errorMessage = 'Ошибка подключения к MetaMask. ';
      if (err.code === -32002) {
        errorMessage += 'Запрос на подключение уже отправлен. Проверьте MetaMask.';
      } else if (err.code === 4001) {
        errorMessage += 'Вы отменили подключение к кошельку.';
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Пожалуйста, попробуйте еще раз.';
      }
      
      setError(errorMessage);
      disconnectWallet();
    }
  };

  // Функция для отключения кошелька
  const disconnectWallet = () => {
    console.log('[Web3 Context] Отключение кошелька');
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setIsAdmin(false);
    setIsCheckingAdmin(false);
    setError(null);
  };

  // Функция для переключения сети
  const switchNetwork = async (targetChainId) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError("MetaMask не найден");
      return;
    }
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (switchError) {
      // Этот код будет выполнен, если пользователь не имеет запрошенной сети.
      if (switchError.code === 4902) {
        // Код ошибки 4902 означает, что сеть не добавлена в MetaMask.
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
          apiUrl = `http://localhost:3001/api/admins/check?address=${encodeURIComponent(userAddress)}`;
        } else {
          apiUrl = `/.netlify/functions/checkAdmin?address=${encodeURIComponent(userAddress)}`;
        }
      } else {
        apiUrl = `/.netlify/functions/checkAdmin?address=${encodeURIComponent(userAddress)}`;
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

      console.log("[Web3 Context] Ответ от проверки isAdmin:", response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log(`[Web3 Context] Результат проверки isAdmin для ${userAddress}:`, data.isAdmin);
        return data.isAdmin === true;
      } else if (response.status === 404) {
        console.log(`[Web3 Context] Адрес ${userAddress} не найден в списке администраторов`);
        return false;
      } else {
        const errorText = await response.text();
        console.warn(`[Web3 Context] Сервер вернул ошибку при проверке isAdmin: ${response.status} ${response.statusText} - ${errorText}`);
        return false;
      }
    } catch (e) {
      console.error("[Web3 Context] Ошибка сети при проверке isAdmin:", e);
      return false;
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  // Эффект для обработки изменений аккаунтов в MetaMask
  useEffect(() => {
    // Проверяем, что мы в браузере
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    const handleAccountsChanged = (accounts) => {
      console.log('[Web3 Context] Аккаунты изменены:', accounts);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        // Проверка админа будет выполнена в следующем useEffect
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = (chainIdHex) => {
      console.log('[Web3 Context] Сеть изменена:', chainIdHex);
      setChainId(parseInt(chainIdHex, 16));
      // Переподключаемся при смене сети
      connectWallet();
    };

    const handleDisconnect = () => {
      console.log('[Web3 Context] MetaMask отключен');
      disconnectWallet();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
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
  }, [account]);

  return (
    <Web3Context.Provider value={{
      provider,
      signer,
      account,
      chainId,
      isConnected,
      error,
      isAdmin,
      isCheckingAdmin,
      connectWallet,
      disconnectWallet,
      switchNetwork,
    }}>
      {children}
    </Web3Context.Provider>
  );
};