import React from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
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
      {/* Верхнее меню */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-indigo-600">DeFi Pool</h1>
            
            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => navigate("/")}
                className="text-gray-700 hover:text-indigo-600 transition"
              >
                Главная
              </button>
              {account && (
                <button 
                  onClick={() => navigate("/dashboard")}
                  className="text-gray-700 hover:text-indigo-600 transition"
                >
                  Дашборд
                </button>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              {account ? (
                <React.Fragment>
                  <span className="text-sm text-gray-600 hidden md:inline">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                  <DisconnectWallet />
                </React.Fragment>
              ) : (
                <ConnectWallet />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Мобильное меню */}
      <div className="md:hidden bg-white border-t">
        <div className="container mx-auto px-6 py-2">
          <div className="flex justify-around">
            <button 
              onClick={() => navigate("/")} 
              className={`py-2 px-4 ${window.location.pathname === '/' ? 'text-indigo-600 font-medium' : 'text-gray-600'}`}
            >
              Главная
            </button>
            {account && (
              <button 
                onClick={() => navigate("/dashboard")} 
                className={`py-2 px-4 ${window.location.pathname === '/dashboard' ? 'text-indigo-600 font-medium' : 'text-gray-600'}`}
              >
                Дашборд
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Страницы */}
      <main className="container mx-auto px-6 py-8">
        <Routes>
          <Route 
            path="/" 
            element={<Home />} 
          />
          <Route 
            path="/dashboard" 
            element={account ? <Dashboard /> : null} 
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;