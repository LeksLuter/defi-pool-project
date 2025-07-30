import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider, useWeb3 } from './context/Web3Context';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import SwapPage from './components/SwapPage';
import BurnMintPage from './components/BurnMintPage'; // Новый компонент
import AdminPanel from './components/AdminPanel';
import PoolList from './components/PoolList';
import AddLiquidity from './components/AddLiquidity';
import Vault from './components/Vault';

// Компонент для защищенных маршрутов
const ProtectedRoute = ({ children }) => {
  const { isConnected } = useWeb3();
  if (!isConnected) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Компонент для админских маршрутов
const AdminRoute = ({ children }) => {
  const { isConnected, isAdmin } = useWeb3();
  if (!isConnected || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
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
              path="/swap"
              element={
                <ProtectedRoute>
                  <SwapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/burn-mint"
              element={
                <ProtectedRoute>
                  <BurnMintPage />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Web3Provider>
  );
}

export default App;