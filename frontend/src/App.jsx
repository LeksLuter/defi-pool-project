import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import Home from "./components/Home";
import Dashboard from "./components/Dashboard";
import ConnectWallet from "./components/ConnectWallet";
import DisconnectWallet from "./components/DisconnectWallet";
import { useWeb3 } from "./context/Web3Context";

function App() {
  const { account } = useWeb3();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-indigo-600">
              DeFi Pool
            </Link>
            
            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="text-gray-700 hover:text-indigo-600 transition">Главная</Link>
              {account && <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600 transition">Дашборд</Link>}
            </nav>

            <div className="flex items-center space-x-4">
              {account ? (
                <>
                  <span className="text-sm text-gray-600 hidden md:inline">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                  <DisconnectWallet />
                </>
              ) : (
                <ConnectWallet />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div className="md:hidden bg-white border-t">
        <div className="container mx-auto px-6 py-2">
          <div className="flex justify-around">
            <Link to="/" className={`py-2 px-4 ${!account || window.location.pathname === '/' ? 'text-indigo-600 font-medium' : 'text-gray-600'}`}>
              Главная
            </Link>
            {account && (
              <Link to="/dashboard" className={`py-2 px-4 ${window.location.pathname === '/dashboard' ? 'text-indigo-600 font-medium' : 'text-gray-600'}`}>
                Дашборд
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <Routes>
          <Route 
            path="/" 
            element={
              !account ? (
                <Home />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <h2 className="text-2xl font-bold mb-4">Добро пожаловать!</h2>
                  <p className="text-gray-600 mb-6">Вы успешно подключились к кошельку.</p>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Перейти в дашборд
                  </button>
                </div>
              )
            } 
          />
          <Route 
            path="/dashboard" 
            element={account ? <Dashboard /> : <NavigateToHome />} 
          />
        </Routes>
      </main>
    </div>
  );
}

// Компонент для перенаправления на главную страницу
const NavigateToHome = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    navigate('/');
  }, [navigate]);

  return null;
};

export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}