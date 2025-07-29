import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';

const Header = () => {
  const { account, isConnected, isAdmin, connectWallet, disconnectWallet, error } = useWeb3();
  const location = useLocation();

  const getShortAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <header className="bg-gray-900 bg-opacity-80 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-cyan-400">
              DeFi Pool
            </Link>
            {isConnected && (
              <nav className="hidden md:flex space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  Главная
                </Link>
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/dashboard'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  Дашборд
                </Link>
                {/* Новый пункт меню "Обмен" */}
                <Link
                  to="/swap"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/swap'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  Обмен
                </Link>
                {/* Пункт меню админки отображается только для администратора */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/admin'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                  >
                    Админка
                  </Link>
                )}
              </nav>
            )}
          </div>
          <div className="flex items-center">
            {error && (
              <div className="hidden md:block mr-4 text-sm text-red-400 bg-red-900 bg-opacity-50 px-3 py-1 rounded">
                Ошибка: {error}
              </div>
            )}
            {isConnected ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <span className="hidden sm:inline-block text-xs font-medium bg-amber-900 text-amber-300 px-2 py-1 rounded">
                    Админ
                  </span>
                )}
                <span className="hidden sm:inline-block text-sm font-medium text-gray-300">
                  {getShortAddress(account)}
                </span>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Отключить
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-medium rounded-lg transition"
              >
                Подключить кошелек
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;