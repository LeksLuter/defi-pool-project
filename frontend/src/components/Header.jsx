import React from 'react';
import { useWeb3 } from '../context/Web3Context';

const Header = () => {
  const { account, isConnected, connectWallet, disconnectWallet } = useWeb3();

  return (
    <header className="bg-indigo-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">DeFi Pool System</h1>
        <div>
          {isConnected ? (
            <div className="flex items-center space-x-4">
              <span className="bg-indigo-800 px-3 py-1 rounded">
                {account.substring(0, 6)}...{account.substring(account.length - 4)}
              </span>
              <button
                onClick={disconnectWallet}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition"
              >
                Отключить
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-white text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded font-medium transition"
            >
              Подключить кошелек
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;