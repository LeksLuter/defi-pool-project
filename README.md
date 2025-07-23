# DeFi Pool System

Полная система пула ликвидности с автоматическим созданием пар токенов, поддержкой комиссий и защитой от внешних вызовов.

## 📁 Структура проекта

```
├── backend/                 # Смарт-контракты
│   ├── contracts/          # Solidity контракты
│   │   ├── LiquidityPool.sol
│   │   ├── PoolFactory.sol
│   │   ├── TokenVault.sol
│   │   └── MockERC20.sol
│   ├── scripts/           # Скрипты деплоя
│   │   ├── deploy-factory.js
│   │   ├── deploy-vault.js
│   │   └── create-pool.js
│   ├── test/              # Тесты контрактов
│   │   ├── pool.test.js
│   │   └── vault.test.js
│   ├── hardhat.config.js  # Конфигурация Hardhat
│   └── package.json       # Backend зависимости
├── frontend/               # React приложение
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── context/       # Web3 контекст
│   │   └── abi/          # ABI контрактов
│   ├── public/           # Статические файлы
│   ├── package.json      # Frontend зависимости
│   └── vite.config.js    # Конфигурация Vite
└── README.md
```

## 🚀 Запуск проекта

### Backend (Смарт-контракты)
```bash
cd backend
npm install
npm run compile
npm run test
```

### Frontend (React приложение)
```bash
cd frontend
npm install
npm run dev
```

## 💡 Возможности:
- ✅ Автоматическое создание пулов
- ✅ Добавление/удаление ликвидности
- ✅ Обмен токенами
- ✅ UI на React с Vite
- ✅ Поддержка Web3 (MetaMask)
- ✅ Защита от произвольного создания пулов
- ✅ Хранилище токенов с NFT позициями

## 🔧 Деплой
```bash
# Деплой фабрики пулов
cd backend
npm run deploy:factory

# Деплой хранилища токенов
npm run deploy:vault

# Создание нового пула
npm run create:pool
```

## 🛠️ Технологии
- **Backend**: Solidity, Hardhat, OpenZeppelin
- **Frontend**: React, Vite, Tailwind CSS, Ethers.js
- **Blockchain**: Polygon Network