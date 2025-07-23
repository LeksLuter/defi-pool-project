# DeFi Pool System

Полная система пула ликвидности с автоматическим созданием пар токенов, поддержкой комиссий (0.05%, 0.3%, 1%) и защитой от внешних вызовов.

## 📁 Структура проекта

```
├── backend/                 # Смарт-контракты и скрипты
│   ├── contracts/          # Solidity контракты
│   ├── scripts/           # Скрипты деплоя
│   ├── test/              # Тесты контрактов
│   └── hardhat.config.js  # Конфигурация Hardhat
├── frontend/               # React приложение
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── context/       # Web3 контекст
│   │   └── abi/          # ABI контрактов
│   ├── public/           # Статические файлы
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
- Автоматическое создание пулов
- Добавление/удаление ликвидности
- Обмен токенами
- UI на React
- Поддержка Web3 (MetaMask)
- Защита от произвольного создания пулов

## 🔧 Деплой
```bash
# Деплой фабрики пулов
cd backend
npm run deploy:factory

# Деплой хранилища токенов
npm run deploy:vault
```