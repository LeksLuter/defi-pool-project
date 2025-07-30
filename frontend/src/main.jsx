import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Web3Provider } from './context/Web3Context';
import { TokenProvider } from './context/TokenContext'; // Импортируем

// Проверим, что корневой элемент существует
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Критическая ошибка: Элемент с id 'root' не найден в DOM.");
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Web3Provider>
        {/* ВАЖНО: TokenProvider внутри Web3Provider */}
        <TokenProvider>
          <App />
        </TokenProvider>
      </Web3Provider>
    </React.StrictMode>,
  );
}