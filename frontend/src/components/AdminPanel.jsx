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

  // Функция для копирования текста в буфер обмена
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${label} скопирован в буфер обмена`);
      // Очищаем статус через 2 секунды
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      console.error('Ошибка при копировании: ', err);
      setStatus(`Не удалось скопировать ${label}`);
    }
  };

  // Функция для открытия ссылки на Polygonscan
  const openInPolygonscan = (address) => {
    if (address && address !== 'Не задан') {
      const url = `https://polygonscan.com/address/${address}`;
      window.open(url, '_blank');
    }
  };

  // Компонент для отображения адреса с кнопками
  const AddressDisplay = ({ address, label }) => (
    <div className="bg-gray-700 bg-opacity-30 p-4 rounded-lg">
      <h3 className="text-lg font-medium text-cyan-400 mb-1">{label}</h3>
      <div className="flex items-center justify-between">
        <p className="text-gray-300 break-words font-mono text-sm flex-grow mr-2">
          {address}
        </p>
        <div className="flex space-x-2 flex-shrink-0">
          <button
            onClick={() => copyToClipboard(address, label)}
            disabled={address === 'Не задан'}
            className={`p-2 rounded-lg transition ${address === 'Не задан'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
            title="Скопировать адрес"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => openInPolygonscan(address)}
            disabled={address === 'Не задан'}
            className={`p-2 rounded-lg transition ${address === 'Не задан'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
            title="Посмотреть на Polygonscan"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

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
            <AddressDisplay address={factoryAddress} label="Фабрика пулов" />
            <AddressDisplay address={vaultAddress} label="Хранилище токенов" />
            <AddressDisplay address={tokenAAddress} label="Токен A" />
            <AddressDisplay address={tokenBAddress} label="Токен B" />
          </div>
        </div>

        {/* Блок для деплоя новых контрактов (только для админов) */}
        {isAdmin && (
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
              <p className="text-gray-300 mb-4">Создать новое хранилище токенов</p>
              <button
                onClick={handleDeployVault}
                className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
              >
                Задеплоить хранилище
              </button>
            </div>
          </div>
        )}

        {/* Отображение статуса операций */}
        {status && (
          <div className="mt-6 p-4 bg-gray-800 bg-opacity-50 rounded-lg text-center">
            <p className="text-white">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;