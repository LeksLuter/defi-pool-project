import React from "react";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">DeFi Пул + Хранилище токенов</h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
          Защитите свои токены и добавьте ликвидность в безопасные пулы. Только вы можете управлять своими средствами.
        </p>
        <button className="bg-white text-blue-700 font-semibold px-6 py-3 rounded shadow hover:bg-gray-100 transition">
          Подключить MetaMask
        </button>
      </div>
    </section>
  );
}