import React from "react";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 text-xl font-bold text-center">
        DeFi Пул + Хранилище токенов
      </header>
      <main>{children}</main>
      <footer className="bg-white shadow p-4 text-center mt-10">
        &copy; {new Date().getFullYear()} DeFi Pool System
      </footer>
    </div>
  );
}