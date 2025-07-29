import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel'; // Новый компонент
import PoolList from './components/PoolList';
import AddLiquidity from './components/AddLiquidity';
import SwapTokens from './components/SwapTokens';
import Vault from './components/Vault';

// Компонент для защищенных маршрутов
const ProtectedRoute = ({ children }) => {
  const { isConnected } = useWeb3();
  if (!isConnected) {
    // Если пользователь не подключен, перенаправляем на лендинг
    return <Navigate to="/" replace />;
  }
  return children;
};

// Компонент для админских маршрутов
const AdminRoute = ({ children }) => {
  const { isConnected, isAdmin } = useWeb3();
  if (!isConnected || !isAdmin) {
    // Если пользователь не подключен или не является админом, перенаправляем на лендинг
    return <Navigate to="/" replace />;
  }
  return children;
};

// Вспомогательный хук для использования контекста
const useWeb3 = () => {
  // В дальнейшем это будет импортировано из Web3Context
  // Пока используем внутренний доступ к контексту
  const context = React.useContext(Web3Provider._context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

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