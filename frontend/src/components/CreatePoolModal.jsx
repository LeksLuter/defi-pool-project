import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { useTokens } from '../context/TokenContext'; // Предполагаем, что у вас есть контекст для токенов
import { fetchTokenDataWithFallback } from '../utils/tokenUtils'; // Предполагаем, что у вас есть утилита для получения данных токена

const CreatePoolModal = ({ onClose }) => {
  const { signer, account } = useWeb3();
  const { tokens: cachedTokens } = useTokens(); // Получаем токены из кэша/контекста

  // Состояния для токенов
  const [token0, setToken0] = useState('');
  const [token1, setToken1] = useState('');
  const [token0Data, setToken0Data] = useState(null);
  const [token1Data, setToken1Data] = useState(null);

  // Состояния для выбора токенов из списка
  const [showToken0List, setShowToken0List] = useState(false);
  const [showToken1List, setShowToken1List] = useState(false);
  const [searchToken0, setSearchToken0] = useState('');
  const [searchToken1, setSearchToken1] = useState('');

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

  // Фильтрация токенов для выпадающих списков
  const filteredToken0List = useMemo(() => {
    if (!searchToken0) return cachedTokens;
    return cachedTokens.filter(token =>
      token.tokenSymbol?.toLowerCase().includes(searchToken0.toLowerCase()) ||
      token.tokenName?.toLowerCase().includes(searchToken0.toLowerCase()) ||
      token.contractAddress.toLowerCase().includes(searchToken0.toLowerCase())
    );
  }, [cachedTokens, searchToken0]);

  const filteredToken1List = useMemo(() => {
    if (!searchToken1) return cachedTokens;
    return cachedTokens.filter(token =>
      token.tokenSymbol?.toLowerCase().includes(searchToken1.toLowerCase()) ||
      token.tokenName?.toLowerCase().includes(searchToken1.toLowerCase()) ||
      token.contractAddress.toLowerCase().includes(searchToken1.toLowerCase())
    );
  }, [cachedTokens, searchToken1]);

  // Получение данных токена по адресу
  const fetchTokenData = useCallback(async (address, setTokenData) => {
    if (!ethers.utils.isAddress(address)) {
      setTokenData(null);
      return;
    }

    try {
      // Проверяем, есть ли токен в кэше
      const cachedToken = cachedTokens.find(t =>
        t.contractAddress.toLowerCase() === address.toLowerCase()
      );

      if (cachedToken) {
        setTokenData({
          symbol: cachedToken.tokenSymbol,
          name: cachedToken.tokenName,
          decimals: cachedToken.tokenDecimal
        });
        return;
      }

      // Если нет в кэше, запрашиваем данные
      setStatus(`Получение данных токена ${address.substring(0, 6)}...`);
      const tokenData = await fetchTokenDataWithFallback(address, signer.provider);
      setTokenData(tokenData);
      setStatus('');
    } catch (err) {
      console.error("Ошибка при получении данных токена:", err);
      setTokenData(null);
      setStatus('');
    }
  }, [cachedTokens, signer]);

  // Эффекты для получения данных токенов при изменении адресов
  useEffect(() => {
    if (token0) {
      fetchTokenData(token0, setToken0Data);
    } else {
      setToken0Data(null);
    }
  }, [token0, fetchTokenData]);

  useEffect(() => {
    if (token1) {
      fetchTokenData(token1, setToken1Data);
    } else {
      setToken1Data(null);
    }
  }, [token1, fetchTokenData]);

  // Получение текущей цены (заглушка, в реальном приложении нужно интегрировать API)
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      if (!token0Data || !token1Data || !token0 || !token1) {
        setCurrentPrice('');
        return;
      }

      try {
        setStatus('Получение текущей цены...');
        // TODO: Здесь должен быть вызов реального API для получения цены
        // Например, можно использовать Uniswap Subgraph, CoinGecko API и т.д.
        // Пока используем фиктивную цену для демонстрации
        const mockPrice = Math.random() * 1000 + 0.001; // Генерируем случайную цену
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

  // Обработчики выбора токенов из списка
  const handleSelectToken0 = (token) => {
    setToken0(token.contractAddress);
    setSearchToken0('');
    setShowToken0List(false);
  };

  const handleSelectToken1 = (token) => {
    setToken1(token.contractAddress);
    setSearchToken1('');
    setShowToken1List(false);
  };

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
      // TODO: Здесь будет логика создания пула через фабрику
      // Пример:
      /*
      const factoryABI = ["function createPool(address token0, address token1, uint24 fee) returns (address)"];
      const factoryAddress = import.meta.env.VITE_FACTORY_ADDRESS;
      const factory = new ethers.Contract(factoryAddress, factoryABI, signer);
      const tx = await factory.createPool(token0, token1, feeRate);
      const receipt = await tx.wait();
      console.log("Пул создан:", receipt);
      */

      // Имитация задержки для демонстрации
      await new Promise(resolve => setTimeout(resolve, 2000));

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

  // Форматирование отображения токена
  const formatTokenDisplay = (address, tokenData) => {
    if (!address) return 'Выберите токен';
    if (tokenData) {
      return `${tokenData.symbol || 'Unknown'} (${address.substring(0, 6)}...${address.substring(address.length - 4)})`;
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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
                  value={showToken0List ? searchToken0 : token0}
                  onChange={(e) => {
                    if (showToken0List) {
                      setSearchToken0(e.target.value);
                    } else {
                      setToken0(e.target.value);
                    }
                  }}
                  onFocus={() => setShowToken0List(true)}
                  placeholder="Адрес контракта токена"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  disabled={isLoading}
                />

                {showToken0List && (
                  <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredToken0List.length > 0 ? (
                      filteredToken0List.map((token) => (
                        <div
                          key={token.contractAddress}
                          className="px-4 py-2 hover:bg-gray-600 cursor-pointer flex items-center"
                          onClick={() => handleSelectToken0(token)}
                        >
                          <div className="bg-gray-600 border-2 border-dashed rounded-xl w-8 h-8 mr-3" />
                          <div>
                            <div className="font-medium text-white">{token.tokenSymbol}</div>
                            <div className="text-xs text-gray-400">{token.contractAddress.substring(0, 10)}...</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-400">Токены не найдены</div>
                    )}
                  </div>
                )}
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
                  value={showToken1List ? searchToken1 : token1}
                  onChange={(e) => {
                    if (showToken1List) {
                      setSearchToken1(e.target.value);
                    } else {
                      setToken1(e.target.value);
                    }
                  }}
                  onFocus={() => setShowToken1List(true)}
                  placeholder="Адрес контракта токена"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  disabled={isLoading}
                />

                {showToken1List && (
                  <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredToken1List.length > 0 ? (
                      filteredToken1List.map((token) => (
                        <div
                          key={token.contractAddress}
                          className="px-4 py-2 hover:bg-gray-600 cursor-pointer flex items-center"
                          onClick={() => handleSelectToken1(token)}
                        >
                          <div className="bg-gray-600 border-2 border-dashed rounded-xl w-8 h-8 mr-3" />
                          <div>
                            <div className="font-medium text-white">{token.tokenSymbol}</div>
                            <div className="text-xs text-gray-400">{token.contractAddress.substring(0, 10)}...</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-400">Токены не найдены</div>
                    )}
                  </div>
                )}
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
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${useFullRange
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
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${!useFullRange
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
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${feeRate === '30'
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
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${feeRate === '100'
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
              <div className={`mb-4 p-3 rounded-lg text-sm ${error
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
              className={`w-full py-3 px-4 rounded-lg font-medium transition flex items-center justify-center ${isLoading
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