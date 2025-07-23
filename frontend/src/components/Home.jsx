import React from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

export default function Home() {
  const { account } = useWeb3();

  return (
    <div className="space-y-12">
      {/* Hero section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20 rounded-xl">
        <div className="text-center max-w-4xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Безопасные пулы ликвидности
          </h1>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            Участвуйте в пулах ликвидности и храните свои токены с максимальной безопасностью
          </p>
          
          {account ? (
            <Link
              to="/dashboard"
              className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Перейти к дашборду
            </Link>
          ) : (
            <p className="text-lg">Подключите кошелек для начала работы</p>
          )}
        </div>
      </section>

      {/* Features section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard 
          title="Безопасность"
          description="Все средства хранятся в смарт-контрактах с аудитом безопасности"
          icon="🔒"
        />
        <FeatureCard 
          title="Ликвидность"
          description="Зарабатывайте на комиссиях от обменов в пулах"
          icon="📈"
        />
        <FeatureCard 
          title="Контроль"
          description="Только вы можете управлять своими средствами через MetaMask"
          icon="🛡️"
        />
      </section>
    </div>
  );
}

function FeatureCard({ title, description, icon }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}