import React from "react";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      <header className="bg-white shadow py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">DeFi Пул + Хранилище</h1>
        <div className="text-sm text-gray-500">Polygon Mainnet</div>
      </header>
      <main className="container mx-auto py-8 px-4">
        {children}
      </main>
      <footer className="bg-white shadow py-4 px-6 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} DeFi Пул Ликвидности
      </footer>
    </div>
  );
}