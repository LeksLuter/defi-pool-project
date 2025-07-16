import React from "react";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 text-center text-xl font-bold">
        DeFi Пул + Хранилище
      </header>
      <main className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="bg-white shadow-inner p-4 text-center text-sm text-gray-500 mt-8">
        &copy; DeFi Pool System | Polygon Mainnet
      </footer>
    </div>
  );
}