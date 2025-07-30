import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Web3Provider } from './context/Web3Context';
import { TokenProvider } from './context/TokenContext'; // Добавлен импорт TokenProvider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3Provider>
      <TokenProvider> {/* Добавлен TokenProvider */}
        <App />
      </TokenProvider>
    </Web3Provider>
  </React.StrictMode>,
);