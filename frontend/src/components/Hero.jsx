import React from "react";
import { Link } from "react-router-dom";
import StatCard from "./StatCard";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20 px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold">DeFi Pool</h1>
          <nav>
            <Link to="/" className="text-blue-400 hover:text-white mr-4">
              Главная
            </Link>
            <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              Подключить кошелёк
            </button>
          </nav>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold mb-6">Безопасные пулы ликвидности и хранилище токенов</h2>
        <p className="text-xl mb-12 opacity-90">
          Участвуйте в пулах ликвидности и храните свои токены с максимальной безопасностью
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <StatCard title="Пулы" value="Загрузка..." />
          <StatCard title="Общая ликвидность" value="Загрузка..." />
          <StatCard title="Заблокировано токенов" value="Загрузка..." />
        </div>

        <div className="space-y-8">
          <FeatureCard 
            icon={<LockIcon />}
            title="Безопасность"
            description="Все средства хранятся в смарт-контрактах с аудитом безопасности"
          />
          <FeatureCard 
            icon={<ChartIcon />}
            title="Ликвидность"
            description="Зарабатывайте на комиссиях от обменов в пулах"
          />
          <FeatureCard 
            icon={<ShieldIcon />}
            title="Контроль"
            description="Только вы можете управлять своими средствами через MetaMask"
          />
        </div>
      </div>
    </section>
  );
}

// Компонент статистики
function StatCard({ title, value }) {
  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg text-center border border-white border-opacity-30">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

// Компонент преимуществ
function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg text-center border border-white border-opacity-30">
      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-200">{description}</p>
    </div>
  );
}

// SVG иконки
function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  );
}