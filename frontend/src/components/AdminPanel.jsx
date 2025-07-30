// frontend/src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AdminPanel = () => {
  const { account, isAdmin } = useWeb3();
  const [status, setStatus] = useState('');
  
  // Состояния для адресов контрактов (из контекста)
  const [factoryAddress, setFactoryAddress] = useState(import.meta.env.VITE_FACTORY_ADDRESS || 'Не задан');
  const [vaultAddress, setVaultAddress] = useState(import.meta.env.VITE_VAULT_ADDRESS || 'Не задан');
  const [tokenAAddress, setTokenAAddress] = useState(import.meta.env.VITE_TOKEN_A_ADDRESS || 'Не задан');
  const [tokenBAddress, setTokenBAddress] = useState(import.meta.env.VITE_TOKEN_B_ADDRESS || 'Не задан');
  
  // Состояние для интервала обновления токенов (новое)
  const [updateInterval, setUpdateInterval] = useState(5); // Значение по умолчанию

  // Загружаем текущее значение интервала из localStorage при монтировании
  useEffect(() => {
    // Проверка прав администратора
    if (!isAdmin) {
        setStatus('Доступ запрещен. Только для администраторов.');
        return;
    }
    
    const savedIntervalStr = localStorage.getItem('walletTokens_updateIntervalMinutes');
    if (savedIntervalStr) {
      const savedInterval = parseInt(savedIntervalStr, 10);
      if (!isNaN(savedInterval) && savedInterval > 0) {
        setUpdateInterval(savedInterval);
      }
    }
  }, [isAdmin]); // Добавлен isAdmin в зависимости

  // Функция для копирования текста в буфер обмена (из контекста)
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Адрес ${label} скопирован в буфер обмена`);
    } catch (err) {
      console.error('Ошибка при копировании: ', err);
      setStatus('Ошибка при копировании адреса');
    }
  };

  // Обработчики для деплоя контрактов (заглушки из контекста)
  const handleDeployFactory = () => {
    setStatus('Функция деплоя фабрики будет реализована');
  };

  const handleDeployVault = () => {
    setStatus('Функция деплоя хранилища будет реализована');
  };

  // Обработчик изменения интервала
  const handleIntervalChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setUpdateInterval(value);
    } else {
      setUpdateInterval(0); // Или другое значение по умолчанию при ошибке ввода
    }
  };

  // Сохранение настроек интервала
  const saveUpdateInterval = () => {
    if (updateInterval <= 0) {
      setStatus('Пожалуйста, введите положительное значение интервала.');
      return;
    }
    try {
      localStorage.setItem('walletTokens_updateIntervalMinutes', updateInterval.toString());
      setStatus(`Настройки сохранены! Интервал обновления: ${updateInterval} минут.`);
    } catch (error) {
      console.error("Ошибка при сохранении настроек:", error);
      setStatus('Ошибка при сохранении настроек.');
    }
  };

  // Если пользователь не админ, не показываем панель
  if (!isAdmin) {
      return (
        <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold mb-6 text-center">Панель администратора</h1>
            <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Ошибка! </strong>
                <span className="block sm:inline">Доступ разрешен только администраторам.</span>
            </div>
          </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Панель администратора</h1>
        
        {/* Отображение статуса */}
        {status && (
           <div className="mb-6 p-4 bg-gray-800 bg-opacity-50 rounded-lg text-center">
             <p className="text-white">{status}</p>
           </div>
         )}

        {/* Раздел: Управление кошельком (новый) */}
        <div className="bg-gray-800 bg-opacity-50 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Управление кошельком</h2>
          
          <div className="mb-4">
            <label htmlFor="updateInterval" className="block text-sm font-medium text-gray-300 mb-2">
              Интервал фонового обновления токенов (минуты):
            </label>
            <input
              type="number"
              id="updateInterval"
              value={updateInterval}
              onChange={handleIntervalChange}
              min="1"
              className="w-full md:w-1/3 px-3 py-2 bg-gray-700 bg-opacity-50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="mt-1 text-sm text-gray-400">
              Определяет, как часто система будет запрашивать обновления списка токенов у API, даже если данные есть в кэше. 
              Минимальное значение: 1 минута.
            </p>
          </div>
          
          <button
            onClick={saveUpdateInterval}
            className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            Сохранить интервал
          </button>
        </div>

        {/* Раздел: Развёрнутые контракты (из контекста) */}
        <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Развёрнутые контракты</h2>
          <div className="space-y-4">
            <AddressDisplay address={factoryAddress} label="Фабрика пулов" onCopy={copyToClipboard} />
            <AddressDisplay address={vaultAddress} label="Хранилище токенов" onCopy={copyToClipboard} />
            <AddressDisplay address={tokenAAddress} label="Токен A" onCopy={copyToClipboard} />
            <AddressDisplay address={tokenBAddress} label="Токен B" onCopy={copyToClipboard} />
          </div>
        </div>

        {/* Раздел: Деплой новых контрактов (из контекста) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Деплой фабрики</h3>
            <p className="text-gray-300 mb-4">Создать новую фабрику пулов ликвидности</p>
            <button
              onClick={handleDeployFactory}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition"
            >
              Задеплоить фабрику
            </button>
          </div>

          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
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
      </div>
    </div>
  );
};

// Компонент для отображения адреса (из контекста)
const AddressDisplay = ({ address, label, onCopy }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-700 bg-opacity-30 rounded-lg">
    <div>
      <span className="text-gray-400 text-sm">{label}:</span>
      <div className="font-mono text-cyan-400 break-all">{address}</div>
    </div>
    {address !== 'Не задан' && (
      <button
        onClick={() => onCopy(address, label)}
        className="mt-2 sm:mt-0 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition"
      >
        Копировать
      </button>
    )}
  </div>
);

export default AdminPanel;