import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider, useWeb3 } from './context/Web3Context'; // <-- Импортируем useWeb3
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import PoolList from './components/PoolList';
import AddLiquidity from './components/AddLiquidity';
import SwapTokens from './components/SwapTokens';
import Vault from './components/Vault';

// Компонент для защищенных маршрутов
const ProtectedRoute = ({ children }) => {
  const { isConnected } = useWeb3(); // <-- Теперь используем импортированный хук
  if (!isConnected) {
    // Если пользователь не подключен, перенаправляем на лендинг
    return <Navigate to="/" replace />;
  }
  return children;
};

// УДАЛЯЕМ определение useWeb3 отсюда

function App() {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* Перенаправление на лендинг для несуществующих путей */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Web3Provider>
  );
}

export default App;