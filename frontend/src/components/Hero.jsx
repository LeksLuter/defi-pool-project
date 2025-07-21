import React from "react";
import StatCard from "./StatCard";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20 px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">DeFi Пул Ликвидности</h1>
        <p className="text-lg md:text-xl mb-8">
          Защитите свои токены и участвуйте в пулах ликвидности без рисков.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard title="Пулы" value="Загрузка..." />
          <StatCard title="Общая ликвидность" value="Загрузка..." />
          <StatCard title="Заблокировано токенов" value="Загрузка..." />
        </div>

        <p className="text-sm text-gray-200 mt-8">
          Поддержка Polygon Mainnet • Безопасные NFT позиции • Только вы можете управлять своими средствами
        </p>
      </div>
    </section>
  );
}