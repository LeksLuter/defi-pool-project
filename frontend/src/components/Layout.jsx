import React from "react";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-4 text-center text-xl font-bold">
        DeFi Пул Ликвидности
      </header>
      <main>{children}</main>
      <footer className="bg-white shadow p-4 text-center mt-10">
        &copy; {new Date().getFullYear()} DeFi Pool System
      </footer>
    </div>
  );
}