import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';

const LandingPage = () => {
  const { connectWallet, isConnected, error } = useWeb3();
  const navigate = useNavigate();

  const handleConnect = async () => {
    await connectWallet();
    // После подключения перенаправляем на дашборд
    if (isConnected) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          <span className="block">DeFi</span>
          <span className="block bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Pool System
          </span>
        </h1>

        <p className="mt-6 text-xl text-gray-300 max-w-2xl mx-auto">
          Создавайте пулы ликвидности, обменивайте токены и безопасно храните активы в децентрализованной финансовой системе.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <div className="text-cyan-400 text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold mb-2">Безопасность</h3>
            <p className="text-gray-400">Ваши средства защищены смарт-контрактами и NFT-позициями.</p>
          </div>

          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <div className="text-green-400 text-3xl mb-3">💧</div>
            <h3 className="text-lg font-semibold mb-2">Ликвидность</h3>
            <p className="text-gray-400">Добавляйте ликвидность и получайте комиссионные от обменов.</p>
          </div>

          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <div className="text-purple-400 text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">Контроль</h3>
            <p className="text-gray-400">Полный контроль над своими активами и позициями.</p>
          </div>
        </div>

        <div className="mt-12">
          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-200 rounded-lg">
              {error}
            </div>
          )}
          <button
            onClick={handleConnect}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-full shadow-lg hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900"
          >
            {isConnected ? 'Перейти в дашборд' : 'Подключить MetaMask'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;