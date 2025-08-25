// frontend/src/components/AdminPanel.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
// ИСПРАВЛЕНО: Импорт функций для работы с конфигурацией приложения из appConfig.js
import { loadAppConfig, saveAppConfig } from '../config/appConfig';
// Импорт дефолтной конфигурации для инициализации
import { DEFAULT_ADMIN_CONFIG } from '../constants';

const AdminPanel = () => {
  const { isAdmin, account } = useWeb3();
  // Инициализация состояния дефолтными значениями из DEFAULT_ADMIN_CONFIG
  const [servicesConfig, setServicesConfig] = useState({
    tokenServices: { ...DEFAULT_ADMIN_CONFIG.tokenServices },
    priceServices: { ...DEFAULT_ADMIN_CONFIG.priceServices }
  });
  const [updateInterval, setUpdateInterval] = useState(DEFAULT_ADMIN_CONFIG.updateIntervalMinutes);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // === НОВЫЕ СОСТОЯНИЯ ДЛЯ УПРАВЛЕНИЯ АДМИНИСТРАТОРАМИ ===
  const [adminsList, setAdminsList] = useState([]);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [adminActionStatus, setAdminActionStatus] = useState('');
  // === КОНЕЦ НОВЫХ СОСТОЯНИЙ ===

  // === ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ АДМИНИСТРАТОРАМИ ===
  // Эти функции напрямую взаимодействуют с API для управления списком админов
  // Предполагается, что API доступен по /api/admins (локально) или через Netlify Functions

  // ИСПРАВЛЕНИЕ: useCallback для предотвращения повторных созданий функции
  const fetchAdminsList = useCallback(async () => {
    if (!account) return;

    setIsLoadingAdmins(true);
    setAdminActionStatus('Загрузка списка администраторов...');

    try {
      console.log(`[Admin Panel] === НАЧАЛО ЗАГРУЗКИ СПИСКА АДМИНИСТРАТОРОВ ДЛЯ ${account} ===`);
      
      // Определяем URL для API
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          apiUrl = 'http://localhost:3001/api/admins'; // Локальный API сервер
          console.log(`[Admin Panel] Используется локальный API сервер: ${apiUrl}`);
        } else {
          // Netlify Functions
          apiUrl = '/.netlify/functions/getAdmins';
          console.log(`[Admin Panel] Используются Netlify Functions: ${apiUrl}`);
        }
      } else {
        // Для SSR или других сред, предполагаем Netlify Functions
        apiUrl = '/.netlify/functions/getAdmins';
        console.log(`[Admin Panel] Предполагается использование Netlify Functions (SSR/другая среда): ${apiUrl}`);
      }

      // === ИЗМЕНЕНИЕ 1: Увеличиваем таймаут до 30 секунд ===
      console.log(`[Admin Panel] Запрос к API: ${apiUrl} с таймаутом 30 секунд`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Address': account,
        },
        // === ИЗМЕНЕНИЕ 1: Увеличиваем таймаут до 30 секунд (30000 мс) ===
        signal: AbortSignal.timeout(30000) // 30 секунд таймаут
      });
      console.log(`[Admin Panel] Ответ от API: ${response.status} ${response.statusText}`);
      // === КОНЕЦ ИЗМЕНЕНИЯ 1 ===

      if (response.ok) {
        const data = await response.json();
        console.log(`[Admin Panel] Данные получены от API:`, data);
        setAdminsList(data.admins || []);
        setAdminActionStatus('Список администраторов загружен.');
        console.log(`[Admin Panel] === СПИСОК АДМИНИСТРАТОРОВ УСПЕШНО ЗАГРУЖЕН ДЛЯ ${account} ===`);
      } else if (response.status === 403) {
        console.warn(`[Admin Panel] Доступ запрещен (403) при загрузке списка администраторов`);
        setAdminActionStatus('Ошибка: Доступ запрещен.');
      } else {
        const errorText = await response.text();
        console.warn(`[Admin Panel] Ошибка ${response.status} ${response.statusText} при загрузке списка администраторов. Response body: ${errorText}`);
        setAdminActionStatus(`Ошибка при загрузке списка администраторов: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      // === ИЗМЕНЕНИЕ 2: Более подробное логирование ошибки ===
      console.error("[Admin Panel] === КРИТИЧЕСКАЯ ОШИБКА ПРИ ЗАГРУЗКЕ СПИСКА АДМИНИСТРАТОРОВ ===:", e);
      if (e.name === 'AbortError') {
        console.error("[Admin Panel] Ошибка вызвана таймаутом AbortSignal");
        setAdminActionStatus('Ошибка: Превышен таймаут ожидания ответа от сервера (30 секунд).');
      } else if (e instanceof TypeError) {
        console.error("[Admin Panel] Ошибка сети или CORS:", e);
        setAdminActionStatus('Ошибка сети или CORS при загрузке списка администраторов.');
      } else {
        console.error("[Admin Panel] Другая ошибка:", e);
        setAdminActionStatus('Ошибка сети при загрузке списка администраторов.');
      }
      // === КОНЕЦ ИЗМЕНЕНИЯ 2 ===
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [account]); // Зависимость только от account

  // ИСПРАВЛЕНИЕ: useCallback для предотвращения повторных созданий функции
  const addAdmin = useCallback(async () => {
    if (!account || !newAdminAddress) return;

    setIsLoadingAdmins(true);
    setAdminActionStatus(`Добавление администратора ${newAdminAddress}...`);
    try {
      console.log(`[Admin Panel] Добавление администратора ${newAdminAddress} админом ${account}...`);

      // Определяем URL для API
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          apiUrl = 'http://localhost:3001/api/admins'; // Локальный API сервер
        } else {
          // Netlify Functions
          apiUrl = '/.netlify/functions/addAdmin';
        }
      } else {
        // Для SSR или других сред, предполагаем Netlify Functions
        apiUrl = '/.netlify/functions/addAdmin';
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Address': account,
        },
        body: JSON.stringify({ newAdminAddress }),
        signal: AbortSignal.timeout(10000) // 10 секунд таймаут
      });

      if (response.ok) {
        setAdminActionStatus(`Администратор ${newAdminAddress} успешно добавлен.`);
        setNewAdminAddress(''); // Очищаем поле ввода
        // Обновляем список админов
        await fetchAdminsList();
      } else if (response.status === 403) {
        setAdminActionStatus('Ошибка: Доступ запрещен.');
      } else {
        const errorText = await response.text();
        setAdminActionStatus(`Ошибка при добавлении админа: ${errorText}`);
      }
    } catch (e) {
      console.error("[Admin Panel] Ошибка при добавлении администратора:", e);
      setAdminActionStatus('Ошибка сети при добавлении администратора.');
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [account, newAdminAddress, fetchAdminsList]); // Зависимости

  // ИСПРАВЛЕНИЕ: useCallback для предотвращения повторных созданий функции
  const removeAdmin = useCallback(async (addressToRemove) => {
    if (!account || !addressToRemove) return;

    const confirmRemoval = window.confirm(`Вы уверены, что хотите удалить администратора ${addressToRemove}?`);
    if (!confirmRemoval) return;

    setIsLoadingAdmins(true);
    setAdminActionStatus(`Удаление администратора ${addressToRemove}...`);
    try {
      console.log(`[Admin Panel] Удаление администратора ${addressToRemove} админом ${account}...`);

      // Определяем URL для API
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          // Для локального API используем DELETE с адресом в URL
          apiUrl = `http://localhost:3001/api/admins/${encodeURIComponent(addressToRemove)}`;
        } else {
          // Netlify Functions
          apiUrl = `/.netlify/functions/removeAdmin?address=${encodeURIComponent(addressToRemove)}`;
        }
      } else {
        // Для SSR или других сред, предполагаем Netlify Functions
        apiUrl = `/.netlify/functions/removeAdmin?address=${encodeURIComponent(addressToRemove)}`;
      }

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Address': account,
        },
        signal: AbortSignal.timeout(10000) // 10 секунд таймаут
      });

      if (response.ok) {
        setAdminActionStatus(`Администратор ${addressToRemove} успешно удален.`);
        // Обновляем список админов
        await fetchAdminsList();
      } else if (response.status === 403) {
        setAdminActionStatus('Ошибка: Доступ запрещен.');
      } else {
        const errorText = await response.text();
        setAdminActionStatus(`Ошибка при удалении админа: ${errorText}`);
      }
    } catch (e) {
      console.error("[Admin Panel] Ошибка при удалении администратора:", e);
      setAdminActionStatus('Ошибка сети при удалении администратора.');
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [account, fetchAdminsList]); // Зависимости

  // ИСПРАВЛЕНИЕ: useEffect с правильными зависимостями
  useEffect(() => {
    console.log(`[Admin Panel] useEffect triggered, isAdmin: ${isAdmin}, account: ${account}`);
    if (isAdmin && account) {
      console.log(`[Admin Panel] Calling fetchAdminsList`);
      fetchAdminsList();
    }
  }, [isAdmin, account, fetchAdminsList]); // Правильные зависимости
  // === КОНЕЦ ФУНКЦИЙ ДЛЯ УПРАВЛЕНИЯ АДМИНИСТРАТОРАМИ ===

  // === ЗАГРУЗКА НАСТРОЕК ИЗ БД/LocalStorage ===
  useEffect(() => {
    if (!isAdmin) {
      setStatus('Доступ запрещен. Только для администраторов.');
      // Инициализируем состояние дефолтными значениями даже если не админ,
      // чтобы избежать ошибок при рендере, но не показываем форму
      setServicesConfig({
        tokenServices: { ...DEFAULT_ADMIN_CONFIG.tokenServices },
        priceServices: { ...DEFAULT_ADMIN_CONFIG.priceServices }
      });
      setUpdateInterval(DEFAULT_ADMIN_CONFIG.updateIntervalMinutes);
      return;
    }

    const fetchConfig = async () => {
      setIsLoading(true);
      setStatus('Загрузка настроек...');
      try {
        // Передаем адрес администратора для загрузки его конфигурации
        // loadAppConfig теперь отвечает за загрузку всей глобальной конфигурации
        const config = await loadAppConfig(account);
        console.log("[Admin Panel] Загруженная конфигурация:", config);
        setServicesConfig({
          tokenServices: { ...DEFAULT_ADMIN_CONFIG.tokenServices, ...config.tokenServices },
          priceServices: { ...DEFAULT_ADMIN_CONFIG.priceServices, ...config.priceServices },
        });
        setUpdateInterval(config.updateIntervalMinutes ?? DEFAULT_ADMIN_CONFIG.updateIntervalMinutes);
        setStatus('Настройки загружены.');
      } catch (e) {
        console.error("[Admin Panel] Ошибка при загрузке конфигурации:", e);
        if (e.message && e.message.includes('Доступ запрещен')) {
          setStatus(`Ошибка: ${e.message}`);
        } else {
          setStatus('Ошибка при загрузке настроек. Используются настройки по умолчанию.');
          // В случае ошибки загрузки, используем дефолтные значения
          setServicesConfig({
            tokenServices: { ...DEFAULT_ADMIN_CONFIG.tokenServices },
            priceServices: { ...DEFAULT_ADMIN_CONFIG.priceServices }
          });
          setUpdateInterval(DEFAULT_ADMIN_CONFIG.updateIntervalMinutes);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [isAdmin, account]);
  // === КОНЕЦ ЗАГРУЗКИ НАСТРОЕК ===

  // === ФУНКЦИИ ДЛЯ СОХРАНЕНИЯ НАСТРОЕК ===
  const handleSaveSettings = async () => {
    if (!isAdmin || !account) {
      setStatus('Доступ запрещен. Только для администраторов.');
      return;
    }

    setIsLoading(true);
    setStatus('Сохранение настроек...');

    try {
      // Создаем объект конфигурации из состояния компонента
      const configToSave = {
        tokenServices: servicesConfig.tokenServices,
        priceServices: servicesConfig.priceServices,
        updateIntervalMinutes: parseInt(updateInterval, 10) // Убедимся, что это число
      };

      // Передаем конфигурацию и адрес администратора в saveAppConfig
      await saveAppConfig(configToSave, account);

      setStatus(`Настройки успешно сохранены! Интервал обновления: ${updateInterval} минут.`);
    } catch (error) {
      console.error("[Admin Panel] Ошибка при сохранении настроек:", error);
      if (error.message && (error.message.includes('Доступ запрещен') || error.message.includes('Forbidden'))) {
        setStatus(`Ошибка: ${error.message}`);
      } else {
        setStatus('Ошибка при сохранении настроек.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceToggle = (serviceType, serviceName) => {
    setServicesConfig(prev => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        [serviceName]: !prev[serviceType][serviceName]
      }
    }));
  };

  const handleUpdateIntervalChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setUpdateInterval(value);
    }
  };
  // === КОНЕЦ ФУНКЦИЙ ДЛЯ СОХРАНЕНИЯ НАСТРОЕК ===

  // Если пользователь не админ, не показываем панель
  if (!isAdmin) {
    return (
      <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Панель администратора</h1>
          <div className="bg-red-500 text-white p-4 rounded-lg text-center">
            <p className="text-xl">Доступ запрещен. Только для администраторов.</p>
            {status && <p className="mt-2 text-sm">{status}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Панель администратора</h1>

        {/* Статусная строка */}
        {status && (
          <div className={`mb-6 p-4 rounded-lg text-center ${status.includes('Ошибка') ? 'bg-red-500' : 'bg-green-500'
            }`}>
            {status}
          </div>
        )}

        {/* Форма настроек */}
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl shadow-2xl p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-cyan-400">Настройки сервисов</h2>

          {/* Настройки сервисов токенов */}
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-3 text-gray-300">Сервисы получения токенов</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(servicesConfig.tokenServices).map(([serviceName, isEnabled]) => (
                <div key={`token-${serviceName}`} className="flex items-center justify-between p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                  <span className="text-gray-200">{serviceName}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleServiceToggle('tokenServices', serviceName)}
                      className="sr-only peer"
                      disabled={isLoading}
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Настройки сервисов цен */}
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-3 text-gray-300">Сервисы получения цен</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(servicesConfig.priceServices).map(([serviceName, isEnabled]) => (
                <div key={`price-${serviceName}`} className="flex items-center justify-between p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                  <span className="text-gray-200">{serviceName}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleServiceToggle('priceServices', serviceName)}
                      className="sr-only peer"
                      disabled={isLoading}
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Интервал обновления */}
          <div className="mb-6">
            <label htmlFor="updateInterval" className="block text-xl font-medium mb-2 text-gray-300">
              Интервал обновления (минуты)
            </label>
            <input
              type="number"
              id="updateInterval"
              value={updateInterval}
              onChange={handleUpdateIntervalChange}
              min="1"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-400">
              Текущее значение в миллисекундах: {updateInterval * 60 * 1000} мс
            </p>
          </div>

          {/* Кнопка сохранения */}
          <button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition ${isLoading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg'
              }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Сохранение...
              </span>
            ) : 'Сохранить настройки'}
          </button>
        </div>

        {/* === НОВЫЙ РАЗДЕЛ: УПРАВЛЕНИЕ АДМИНИСТРАТОРАМИ === */}
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl shadow-2xl p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-cyan-400">Управление администраторами</h2>

          {adminActionStatus && (
            <div className={`mb-4 p-2 rounded ${adminActionStatus.includes('Ошибка') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              }`}>
              {adminActionStatus}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="newAdminAddress" className="block text-lg font-medium mb-2 text-gray-300">
              Добавить нового администратора:
            </label>
            <div className="flex">
              <input
                type="text"
                id="newAdminAddress"
                value={newAdminAddress}
                onChange={(e) => setNewAdminAddress(e.target.value)}
                placeholder="0x..."
                className="flex-grow px-4 py-2 bg-gray-700 border border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                disabled={isLoadingAdmins}
              />
              <button
                onClick={addAdmin}
                disabled={isLoadingAdmins || !newAdminAddress}
                className={`px-4 py-2 rounded-r-lg font-medium transition flex items-center ${isLoadingAdmins || !newAdminAddress
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {isLoadingAdmins ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                Добавить
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-300">Список текущих администраторов:</h3>
            {isLoadingAdmins && adminsList.length === 0 ? (
              <p>Загрузка...</p>
            ) : adminsList.length > 0 ? (
              <ul className="border border-gray-700 rounded-lg divide-y divide-gray-700">
                {adminsList.map((adminAddr) => (
                  <li key={adminAddr} className="flex justify-between items-center p-3 bg-gray-700 bg-opacity-30">
                    <span className="font-mono text-sm break-all">{adminAddr}</span>
                    {adminAddr.toLowerCase() !== account?.toLowerCase() ? ( // Не позволяем удалить себя
                      <button
                        onClick={() => removeAdmin(adminAddr)}
                        disabled={isLoadingAdmins}
                        className={`px-3 py-1 text-sm rounded transition flex items-center ${isLoadingAdmins
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                          }`}
                      >
                        {isLoadingAdmins ? (
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : null}
                        Удалить
                      </button>
                    ) : (
                      <span className="px-3 py-1 text-gray-500 text-sm">Вы</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Список администраторов пуст или не удалось загрузить.</p>
            )}
          </div>

          <button
            onClick={fetchAdminsList}
            disabled={isLoadingAdmins}
            className={`mt-4 px-4 py-2 rounded font-medium transition flex items-center ${isLoadingAdmins
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-700'
              }`}
          >
            {isLoadingAdmins ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            Обновить список
          </button>
        </div>
        {/* === КОНЕЦ НОВОГО РАЗДЕЛА === */}

      </div>
    </div>
  );
};

export default AdminPanel;