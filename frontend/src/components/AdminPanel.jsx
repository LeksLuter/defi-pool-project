// frontend/src/components/AdminPanel.jsx
import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AdminPanel = () => {
  const { signer, account, isAdmin } = useWeb3();
  const [status, setStatus] = useState('');

  // Получаем адреса из переменных окружения
  const factoryAddress = import.meta.env.VITE_FACTORY_ADDRESS || 'Не задан';
  const vaultAddress = import.meta.env.VITE_VAULT_ADDRESS || 'Не задан';
  const tokenAAddress = import.meta.env.VITE_TOKEN_A_ADDRESS || 'Не задан';
  const tokenBAddress = import.meta.env.VITE_TOKEN_B_ADDRESS || 'Не задан';

  // Здесь будут функции для выполнения админских действий
  const handleDeployFactory = async () => {
    setStatus('Деплой фабрики...');
    // Реализация деплоя фабрики
    console.log("Деплой фабрики");
    setStatus('Фабрика успешно задеплоена!');
  };

  const handleDeployVault = async () => {
    setStatus('Деплой хранилища...');
    // Реализация деплоя хранилища
    console.log("Деплой хранилища");
    setStatus('Хранилище успешно задеплоено!');
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900">
      <div className="container mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Админка</h1>
          <p className="text-gray-400">Управление смарт-контрактами</p>
        </div>

        {/* Блок с уже развёрнутыми контрактами */}
        <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Развёрнутые контракты</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-700 bg-opacity-30 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-cyan-400 mb-1">Фабрика пулов</h3>
              <p className="text-gray-300 break-words font-mono text-sm">{factoryAddress}</p>
            </div>
            
            <div className="bg-gray-700 bg-opacity-30 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-cyan-400 mb-1">Хранилище токенов</h3>
              <p className="text-gray-300 break-words font-mono text-sm">{vaultAddress}</p>
            </div>
            
            <div className="bg-gray-700 bg-opacity-30 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-cyan-400 mb-1">Токен A (TokenA)</h3>
              <p className="text-gray-300 break-words font-mono text-sm">{tokenAAddress}</p>
            </div>
            
            <div className="bg-gray-700 bg-opacity-30 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-cyan-400 mb-1">Токен B (TokenB)</h3>
              <p className="text-gray-300 break-words font-mono text-sm">{tokenBAddress}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-700 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-600">
            <h3 className="text-xl font-semibold text-white mb-4">Деплой фабрики</h3>
            <p className="text-gray-300 mb-4">Создать новый контракт фабрики пулов</p>
            <button
              onClick={handleDeployFactory}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
            >
              Задеплоить фабрику
            </button>
          </div>

          <div className="bg-gray-700 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-600">
            <h3 className="text-xl font-semibold text-white mb-4">Деплой хранилища</h3>
            <p className="text-gray-300 mb-4">Создать новый контракт хранилища токенов</p>
            <button
              onClick={handleDeployVault}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
            >
              Задеплоить хранилище
            </button>
          </div>
        </div>

        {status && (
          <div className="mt-8 p-4 bg-gray-700 bg-opacity-50 rounded-lg text-center">
            <p className="text-white">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;