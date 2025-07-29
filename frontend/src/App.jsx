import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

// Компонент для защищенных маршрутов
const ProtectedRoute = ({ children }) => {
  const { isConnected } = useWeb3(); // Предполагаем, что useWeb3 доступен
  if (!isConnected) {
    // Пользователь не подключен, перенаправляем на лендинг
    return <Navigate to="/" replace />;
  }
  return children;
};

// Вспомогательный хук для использования контекста (лучше импортировать из Web3Context)
const useWeb3 = () => {
  // Это временная заглушка, реальный хук будет в Web3Context
  // В дальнейшем заменим на импорт
  const context = React.useContext(Web3Provider._context); // Не лучший способ, но для демонстрации
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

function App() {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
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