import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function Dashboard() {
  const { account } = useWeb3();

  if (!account) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Подключите кошелёк</h2>
        <p className="text-gray-600">Для доступа к дашборду необходимо подключить MetaMask</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Дашборд</h1>
        <p className="text-gray-600">
          Добро пожаловать, {account.slice(0, 6)}...{account.slice(-4)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Пулы ликвидности</h2>
          <p className="text-gray-600 mb-4">
            Добавьте ликвидность в пулы и получайте вознаграждение
          </p>
          <button className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition">
            Добавить ликвидность
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Хранилище токенов</h2>
          <p className="text-gray-600 mb-4">
            Безопасно храните свои токены в смарт-контракте
          </p>
          <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition">
            Управление токенами
          </button>
        </div>
      </div>
    </div>
  );
}