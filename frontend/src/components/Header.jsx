import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import ConnectButton from './ConnectButton';

const Header = () => {
  const location = useLocation();
  const { isConnected, account, isAdmin } = useWeb3();

  // Функция для форматирования адреса кошелька
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <header className="bg-gray-800 bg-opacity-50 backdrop-blur-sm border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              DeFi Pool
            </Link>
            {/* Отображаем адрес подключенного кошелька на мобильных устройствах */}
            {isConnected && (
              <div className="md:hidden mt-2 text-sm text-gray-300">
                {formatAddress(account)}
              </div>
            )}
          </div>

          <nav className="mt-4 md:mt-0">
            <ul className="flex flex-wrap gap-4 md:gap-6">
              <li>
                <Link
                  to="/"
                  className={`font-medium transition-colors hover:text-cyan-400 ${location.pathname === '/' ? 'text-cyan-400' : 'text-gray-300'}`}
                >
                  Дашборд
                </Link>
              </li>
              <li>
                <Link
                  to="/swap"
                  className={`font-medium transition-colors hover:text-cyan-400 ${location.pathname === '/swap' ? 'text-cyan-400' : 'text-gray-300'}`}
                >
                  Обмен
                </Link>
              </li>
              <li>
                <Link
                  to="/burn-mint"
                  className={`font-medium transition-colors hover:text-cyan-400 ${location.pathname === '/burn-mint' ? 'text-cyan-400' : 'text-gray-300'}`}
                >
                  Mint/Burn
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    className={`font-medium transition-colors hover:text-cyan-400 ${location.pathname === '/admin' ? 'text-cyan-400' : 'text-gray-300'}`}
                  >
                    Админка
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            {/* Отображаем адрес подключенного кошелька на десктопах */}
            {isConnected && (
              <div className="hidden md:block text-sm text-gray-300">
                {formatAddress(account)}
              </div>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;