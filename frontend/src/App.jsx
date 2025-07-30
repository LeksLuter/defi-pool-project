// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SwapPage from './components/SwapPage';
import BurnMintPage from './components/BurnMintPage';
import AdminPanel from './components/AdminPanel';
import PoolList from './components/PoolList'; // Используем PoolList вместо PoolsList
//import './App.css';

function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="min-h-screen bg-gray-900 text-white">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/swap" element={<SwapPage />} />
              <Route path="/burn-mint" element={<BurnMintPage />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/pools" element={<PoolList />} /> {/* Используем PoolList */}
            </Routes>
          </main>
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App;