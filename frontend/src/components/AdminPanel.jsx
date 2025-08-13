// frontend/src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { saveAdminConfig, loadAdminConfig } from '../config/adminConfig';

const AdminPanel = () => {
  const { isAdmin, account } = useWeb3();
  const [servicesConfig, setServicesConfig] = useState({ tokenServices: {}, priceServices: {} });
  const [updateInterval, setUpdateInterval] = useState(10);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // === ЗАГРУЗКА НАСТРОЕК ИЗ БД ===
  useEffect(() => {
    if (!isAdmin) {
      setStatus('Доступ запрещен. Только для администраторов.');
      return;
    }

    const fetchConfig = async () => {
      setIsLoading(true);
      setStatus('Загрузка настроек...');
      try {
        // Передаем адрес администратора
        const config = await loadAdminConfig(account);
        setServicesConfig({
          tokenServices: config.tokenServices,
          priceServices: config.priceServices,
        });
        setUpdateInterval(config.updateIntervalMinutes);
        setStatus('Настройки загружены.');
      } catch (e) {
        console.error("Ошибка при загрузке конфигурации:", e);
        setStatus('Ошибка при загрузке настроек.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [isAdmin, account]);

  // === ОБРАБОТКА СОБЫТИЙ storage ДЛЯ СИНХРОНИЗАЦИИ МЕЖДУ ВКЛАДКАМИ ===
  useEffect(() => {
    if (!isAdmin) return;

    const handleStorageChange = (e) => {
      if (e.key === 'defiPool_adminConfig' && e.newValue) {
        try {
          const newConfig = JSON.parse(e.newValue);
          setServicesConfig({
            tokenServices: newConfig.tokenServices || {},
            priceServices: newConfig.priceServices || {},
          });
          setUpdateInterval(newConfig.updateIntervalMinutes || 10);
          setStatus('Настройки синхронизированы с другой вкладкой.');
          // Очищаем статус через 3 секунды
          setTimeout(() => setStatus(''), 3000);
        } catch (err) {
          console.error("Ошибка при парсинге adminConfig из storage event:", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Обработка кастомного события adminConfigUpdated (внутри одной вкладки)
    const handleCustomEvent = (e) => {
        try {
            const newConfig = e.detail;
             setServicesConfig({
                tokenServices: newConfig.tokenServices || {},
                priceServices: newConfig.priceServices || {},
            });
            setUpdateInterval(newConfig.updateIntervalMinutes || 10);
            setStatus('Настройки обновлены.');
            // Очищаем статус через 3 секунды
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            console.error("Ошибка при обработке кастомного события adminConfigUpdated:", err);
        }
    };

    window.addEventListener('adminConfigUpdated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('adminConfigUpdated', handleCustomEvent);
    };
  }, [isAdmin]);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Адрес ${label} скопирован в буфер обмена`);
    } catch (err) {
      console.error('Ошибка при копировании: ', err);
      setStatus('Ошибка при копировании адреса');
    }
  };

  const handleDeployFactory = () => {
    setStatus('Функция деплоя фабрики будет реализована');
  };

  const handleDeployVault = () => {
    setStatus('Функция деплоя хранилища будет реализована');
  };

  const handleIntervalChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setUpdateInterval(value);
    } else {
      setUpdateInterval(0);
    }
  };

  // === ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ СЕРВИСАМИ ===
  const toggleTokenService = (serviceName) => {
    setServicesConfig(prev => ({
      ...prev,
      tokenServices: {
        ...prev.tokenServices,
        [serviceName]: !prev.tokenServices[serviceName]
      }
    }));
  };

  const togglePriceService = (serviceName) => {
    setServicesConfig(prev => ({
      ...prev,
      priceServices: {
        ...prev.priceServices,
        [serviceName]: !prev.priceServices[serviceName]
      }
    }));
  };

  // === ФУНКЦИИ ДЛЯ СОХРАНЕНИЯ НАСТРОЕК ===
const saveServiceSettings = async () => {
  if (!account) {
    setStatus('Ошибка: Адрес администратора не определен.');
    return;
  }
  setIsLoading(true);
  setStatus('Сохранение настроек сервисов...');
  try {
    const configToSave = {
      // Загружаем текущую конфигурацию (на случай, если интервал был изменен в другом месте)
      ...(await loadAdminConfig(account)), // Передаем адрес администратора
      tokenServices: servicesConfig.tokenServices,
      priceServices: servicesConfig.priceServices,
    };
    // Передаем адрес администратора при сохранении
    await saveAdminConfig(configToSave, account);
    setStatus('Настройки сервисов сохранены!');
  } catch (error) {
    console.error("Ошибка при сохранении настроек сервисов:", error);
    setStatus('Ошибка при сохранении настроек сервисов.');
  } finally {
    setIsLoading(false);
  }
};

const saveUpdateInterval = async () => {
  if (!account) {
    setStatus('Ошибка: Адрес администратора не определен.');
    return;
  }
  if (updateInterval <= 0) {
    setStatus('Пожалуйста, введите положительное значение интервала.');
    return;
  }
  setIsLoading(true);
  setStatus('Сохранение интервала обновления...');
  try {
    // Загружаем текущую конфигурацию, обновляем только интервал
    const currentConfig = await loadAdminConfig(account); // Передаем адрес администратора
    const newConfig = { ...currentConfig, updateIntervalMinutes: updateInterval };
    // Передаем адрес администратора при сохранении
    await saveAdminConfig(newConfig, account);
    setStatus(`Настройки сохранены! Интервал обновления: ${updateInterval} минут.`);
  } catch (error) {
    console.error("Ошибка при сохранении настроек:", error);
    setStatus('Ошибка при сохранении настроек.');
  } finally {
    setIsLoading(false);
  }
};
  // === КОНЕЦ ФУНКЦИЙ ДЛЯ СОХРАНЕНИЯ НАСТРОЕК ===

  // Если пользователь не админ, не показываем панель
  if (!isAdmin) {
    return (
      <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Панель администратора</h1>
          <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-xl">Доступ запрещен. Только для администраторов.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Панель администратора</h1>

        {(status || isLoading) && (
          <div className="mb-6 p-4 bg-blue-900 bg-opacity-50 border border-blue-700 rounded-xl text-center">
            <p>{status}</p>
            {isLoading && <div className="mt-2 animate-pulse">...</div>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* === УПРАВЛЕНИЕ СЕРВИСАМИ === */}
          <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Управление сервисами</h2>
            <p className="text-gray-400 text-sm mb-4">
              Включите или выключите сервисы для отладки. Изменения вступят в силу при следующем обновлении цен.
            </p>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-300">Сервисы получения токенов:</h3>
              {Object.entries(servicesConfig.tokenServices).map(([serviceName, isEnabled]) => (
                <div key={`token-${serviceName}`} className="flex items-center justify-between p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                  <span className="text-gray-200 font-medium">{serviceName}</span>
                  <button
                    onClick={() => toggleTokenService(serviceName)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                    aria-pressed={isEnabled}
                    disabled={isLoading}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3 mt-6">
              <h3 className="font-medium text-gray-300">Сервисы получения цен:</h3>
              {Object.entries(servicesConfig.priceServices).map(([serviceName, isEnabled]) => (
                <div key={`price-${serviceName}`} className="flex items-center justify-between p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                  <span className="text-gray-200 font-medium">{serviceName}</span>
                  <button
                    onClick={() => togglePriceService(serviceName)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                    aria-pressed={isEnabled}
                    disabled={isLoading}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={saveServiceSettings}
              className="mt-6 w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-lg transition disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить настройки сервисов'}
            </button>
          </div>
          {/* === КОНЕЦ УПРАВЛЕНИЯ СЕРВИСАМИ === */}

          {/* === УПРАВЛЕНИЕ ИНТЕРВАЛОМ === */}
          <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Настройки обновления</h2>
            <p className="text-gray-400 text-sm mb-4">
              Настройте интервал автоматического обновления списка токенов и их цен.
            </p>

            <div className="mb-4">
              <label htmlFor="updateInterval" className="block text-sm font-medium text-gray-300 mb-2">
                Интервал обновления (минуты):
              </label>
              <input
                type="number"
                id="updateInterval"
                min="1"
                value={updateInterval}
                onChange={handleIntervalChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={isLoading}
              />
            </div>

            <button
              onClick={saveUpdateInterval}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition disabled:opacity-50"
              disabled={isLoading || updateInterval <= 0}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить интервал'}
            </button>
          </div>
          {/* === КОНЕЦ УПРАВЛЕНИЯ ИНТЕРВАЛОМ === */}

          {/* === ДЕПЛОЙ КОНТРАКТОВ (ЗАГЛУШКИ) === */}
          <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-6 md:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Деплой контрактов</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleDeployFactory}
                className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-lg transition disabled:opacity-50"
                disabled={isLoading}
              >
                Деплой PoolFactory
              </button>
              <button
                onClick={handleDeployVault}
                className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition disabled:opacity-50"
                disabled={isLoading}
              >
                Деплой TokenVault
              </button>
            </div>
          </div>
          {/* === КОНЕЦ ДЕПЛОЯ КОНТРАКТОВ === */}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;