import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider, useWeb3 } from './context/Web3Context'; // Импортируем useWeb3
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import SwapPage from './components/SwapPage'; // Новый компонент
import AdminPanel from './components/AdminPanel';
import PoolList from './components/PoolList';
import AddLiquidity from './components/AddLiquidity';
import Vault from './components/Vault';

// Компонент для защищенных маршрутов
const ProtectedRoute = ({ children }) => {
  const { isConnected } = useWeb3(); // Используем импортированный хук
  if (!isConnected) {
    // Если пользователь не подключен, перенаправляем на лендинг
    return <Navigate to="/" replace />;
  }
  return children;
};

// Компонент для админских маршрутов
const AdminRoute = ({ children }) => {
  const { isConnected, isAdmin } = useWeb3(); // Используем импортированный хук
  if (!isConnected || !isAdmin) {
    // Если пользователь не подключен или не является админом, перенаправляем на лендинг
    return <Navigate to="/" replace />;
  }
  return children;
};

// УДАЛЯЕМ локальное определение useWeb3

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
            <Route
              path="/swap"
              element={
                <ProtectedRoute>
                  <SwapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
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