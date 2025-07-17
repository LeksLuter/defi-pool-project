// src/components/Hero.jsx
import React from "react";
import StatCard from "./StatCard"; // ✅ Added import

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">DeFi Пул Ликвидности</h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
          Защитите свои токены и добавьте ликвидность в безопасные пулы.
          Только вы можете управлять своими средствами.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard title="Пулы" value="Загрузка..." />
          <StatCard title="Ликвидность" value="Загрузка..." />
          <StatCard title="Заблокировано токенов" value="Загрузка..." />
        </div>

        <p className="text-sm text-gray-200 mt-8">
          Поддержка Polygon Mainnet • Безопасные NFT позиции • Только вы можете управлять своими средствами
        </p>
      </div>
    </section>
  );
}