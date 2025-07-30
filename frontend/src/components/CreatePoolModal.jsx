// frontend/src/components/CreatePoolModal.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import PoolFactoryABI from '../abi/PoolFactory.json';

// Вспомогательная функция для получения данных токена напрямую через контракт
const fetchTokenDataDirect = async (address, provider) => {
  if (!ethers.utils.isAddress(address)) {
    throw new Error('Неверный адрес токена');
  }

  try {
    const tokenContract = new ethers.Contract(
      address,
      [
        "function symbol() view returns (string)",
        "function name() view returns (string)",
        "function decimals() view returns (uint8)"
      ],
      provider
    );

    const [symbol, name, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.name(),
      tokenContract.decimals()
    ]);

    return { symbol, name, decimals: parseInt(decimals) };
  } catch (err) {
    console.error("Ошибка при получении данных токена напрямую:", err);
    throw new Error(`Не удалось получить данные токена ${address.substring(0, 10)}...`);
  }
};

const CreatePoolModal = ({ onClose }) => {
  const { signer, account, provider } = useWeb3();
  
  // Состояния для токенов
  const [token0, setToken0] = useState('');
  const [token1, setToken1] = useState('');
  const [token0Data, setToken0Data] = useState(null);
  const [token1Data, setToken1Data] = useState(null);
  
  // Состояния для цены и диапазона
  const [useFullRange, setUseFullRange] = useState(true);
  const [currentPrice, setCurrentPrice] = useState('');
  const [lowerPrice, setLowerPrice] = useState('');
  const [upperPrice, setUpperPrice] = useState('');
  
  // Состояния для комиссии
  const [feeRate, setFeeRate] = useState('30'); // 0.3% по умолчанию (30 basis points)
  
  // Состояния для UI
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Получение данных токена по адресу
  const fetchTokenData = async (address, setTokenData) => {
    if (!address || !ethers.utils.isAddress(address)) {
      setTokenData(null);
      return;
    }
    
    try {
      setStatus(`Получение данных токена ${address.substring(0, 6)}...`);
      const tokenData = await fetchTokenDataDirect(address, provider);
      setTokenData(tokenData);
      setStatus('');
    } catch (err) {
      console.error("Ошибка при получении данных токена:", err);
      setTokenData(null);
      setStatus(''); // Очищаем статус загрузки
    }
  };

  // Эффекты для получения данных токенов при изменении адресов
  useEffect(() => {
    if (token0) {
      fetchTokenData(token0, setToken0Data);
    } else {
      setToken0Data(null);
    }
  }, [token0]);

  useEffect(() => {
    if (token1) {
      fetchTokenData(token1, setToken1Data);
    } else {
      setToken1Data(null);
    }
  }, [token1]);

  // Получение текущей цены (заглушка)
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      if (!token0Data || !token1Data || !token0 || !token1) {
        setCurrentPrice('');
        return;
      }
      
      try {
        setStatus('Получение текущей цены...');
        // TODO: Здесь должен быть вызов реального API для получения цены
        // Пока используем фиктивную цену для демонстрации
        const mockPrice = Math.random() * 1000 + 0.001;
        setCurrentPrice(mockPrice.toFixed(6));
        setStatus('');
      } catch (err) {
        console.error("Ошибка при получении цены:", err);
        // Устанавливаем начальную цену в случае ошибки
        setCurrentPrice('1.0');
        setStatus('');
      }
    };
    
    fetchCurrentPrice();
  }, [token0, token1, token0Data, token1Data]);

  // Обработчик создания пула
  const handleCreatePool = async (e) => {
    e.preventDefault();
    
    if (!signer || !account) {
      setStatus('Пожалуйста, подключите кошелек');
      return;
    }
    
    if (!token0 || !token1) {
      setStatus('Пожалуйста, введите адреса обоих токенов');
      return;
    }
    
    if (token0.toLowerCase() === token1.toLowerCase()) {
      setStatus('Адреса токенов должны быть разными');
      return;
    }
    
    if (!useFullRange && (!lowerPrice || !upperPrice)) {
      setStatus('Пожалуйста, введите границы цены');
      return;
    }
    
    if (!useFullRange && (parseFloat(lowerPrice) >= parseFloat(upperPrice))) {
      setStatus('Нижняя граница должна быть меньше верхней');
      return;
    }
    
    setIsLoading(true);
    setStatus('Создание пула...');
    setError('');
    
    try {
      // Получаем адрес фабрики из переменных окружения
      const factoryAddress = import.meta.env.VITE_FACTORY_ADDRESS;
      
      if (!factoryAddress || factoryAddress === 'Не задан') {
        throw new Error('Адрес фабрики не задан в переменных окружения (VITE_FACTORY_ADDRESS)');
      }

      const factory = new ethers.Contract(factoryAddress, PoolFactoryABI.abi, signer);
      const tx = await factory.createPool(token0, token1, feeRate);
      const receipt = await tx.wait();
      console.log("Пул создан:", receipt);
      
      setStatus('Пул успешно создан!');
      
      // Очищаем форму после успешного создания
      setToken0('');
      setToken1('');
      setToken0Data(null);
      setToken1Data(null);
      setLowerPrice('');
      setUpperPrice('');
      
      // Закрытие модального окна через 1.5 секунды после успеха
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Ошибка при создании пула:", err);
      setError(err.message || 'Ошибка при создании пула');
      setStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 overflow-hidden">
        {/* Заголовок модального окна */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Создать пул ликвидности</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* Содержимое формы */}
        <div className="px-6 py-5">
          <form onSubmit={handleCreatePool}>
            {/* Выбор токена 0 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Токен 1 (Token0)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={token0}
                  onChange={(e) => setToken0(e.target.value)}
                  placeholder="Адрес контракта токена"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  disabled={isLoading}
                />
              </div>
              {token0Data && (
                <div className="mt-1 text-sm text-cyan-400">
                  {token0Data.name} ({token0Data.symbol})
                </div>
              )}
            </div>

            {/* Выбор токена 1 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Токен 2 (Token1)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={token1}
                  onChange={(e) => setToken1(e.target.value)}
                  placeholder="Адрес контракта токена"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  disabled={isLoading}
                />
              </div>
              {token1Data && (
                <div className="mt-1 text-sm text-cyan-400">
                  {token1Data.name} ({token1Data.symbol})
                </div>
              )}
            </div>

            {/* Текущая цена */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Текущая цена {token1Data?.symbol || 'Token1'} за {token0Data?.symbol || 'Token0'}
              </label>
              <input
                type="text"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                disabled={isLoading}
              />
              <div className="mt-1 text-xs text-gray-400">
                {currentPrice ? `1 ${token0Data?.symbol || 'Token0'} = ${currentPrice} ${token1Data?.symbol || 'Token1'}` : 'Введите цену или она будет получена автоматически'}
              </div>
            </div>

            {/* Переключатель диапазона */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Диапазон цены
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setUseFullRange(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    useFullRange
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  disabled={isLoading}
                >
                  Полный диапазон
                </button>
                <button
                  type="button"
                  onClick={() => setUseFullRange(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    !useFullRange
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  disabled={isLoading}
                >
                  Индивидуальный
                </button>
              </div>
            </div>

            {/* Поля для индивидуального диапазона */}
            {!useFullRange && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Мин. цена
                  </label>
                  <input
                    type="text"
                    value={lowerPrice}
                    onChange={(e) => setLowerPrice(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Макс. цена
                  </label>
                  <input
                    type="text"
                    value={upperPrice}
                    onChange={(e) => setUpperPrice(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Выбор комиссии */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Комиссия пула
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFeeRate('30')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    feeRate === '30'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  disabled={isLoading}
                >
                  0.3%
                </button>
                <button
                  type="button"
                  onClick={() => setFeeRate('100')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    feeRate === '100'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  disabled={isLoading}
                >
                  1%
                </button>
              </div>
            </div>

            {/* Статус и ошибки */}
            {(status || error) && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                error 
                  ? 'bg-red-900/30 text-red-300' 
                  : 'bg-cyan-900/30 text-cyan-300'
              }`}>
                {error || status}
              </div>
            )}

            {/* Кнопка создания */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition flex items-center justify-center ${
                isLoading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </>
              ) : (
                'Создать пул'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePoolModal;