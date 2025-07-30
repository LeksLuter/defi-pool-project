import React from 'react';
import { useWeb3 } from '../context/Web3Context';

const ConnectButton = () => {
  const { isConnected, connectWallet, disconnectWallet, account, error } = useWeb3();

  return (
    <div>
      {!isConnected ? (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
        >
          Подключить кошелек
        </button>
      ) : (
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
        >
          Отключить
        </button>
      )}
      {error && (
        <div className="mt-2 text-red-500 text-sm">
          Ошибка: {error}
        </div>
      )}
    </div>
  );
};

export default ConnectButton;