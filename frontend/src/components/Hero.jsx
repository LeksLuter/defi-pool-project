import React from "react";
import { FiLock, FiShield, FiChart } from "react-icons/fi";
import FeatureCard from "./FeatureCard";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20 px-6 relative">
      <div className="container mx-auto max-w-4xl text-center z-10 relative">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-400">
          Безопасные пулы ликвидности и хранилище токенов
        </h1>
        <p className="text-lg md:text-xl mb-8 opacity-90">
          Участвуйте в пулах ликвидности и храните свои токены с максимальной безопасностью
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <FeatureCard 
            icon={<FiChart size={32} />}
            title="Пулы"
            description="Загрузка..."
          />
          <FeatureCard 
            icon={<FiChart size={32} />}
            title="Общая ликвидность"
            description="Загрузка..."
          />
          <FeatureCard 
            icon={<FiLock size={32} />}
            title="Заблокировано токенов"
            description="Загрузка..."
          />
        </div>

        <p className="text-sm text-gray-200 mt-8">
          Поддержка Polygon Mainnet • Безопасные NFT позиции • Только вы можете управлять своими средствами
        </p>
      </div>

      {/* ✅ Исправлено: добавлено z-0 для заднего фона */}
      <div className="absolute inset-0 opacity-20 z-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </section>
  );
}