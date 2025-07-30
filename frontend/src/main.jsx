import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Web3Provider } from './context/Web3Context';
import { TokenProvider } from './context/TokenContext'; // Импортируем новый провайдер

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3Provider>
      <TokenProvider> {/* Оборачиваем в TokenProvider */}
        <App />
      </TokenProvider>
    </Web3Provider>
  </React.StrictMode>,
);