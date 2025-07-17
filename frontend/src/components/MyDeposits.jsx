import React, { useEffect, useState } from "react";

export default function MyDeposits({ vaultAddress }) {
  const [deposits, setDeposits] = useState([]);

  useEffect(() => {
    const loadDeposits = async () => {
      if (!window.vaultContract || !window.userAddress) return;

      try {
        const depositList = await window.vaultContract.getDepositsByUser(window.userAddress);
        setDeposits(depositList);
      } catch (err) {
        console.error("Не удалось загрузить депозиты", err);
      }
    };

    loadDeposits();
  }, [vaultAddress]);

  return (
    <section className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Мои депозиты</h2>
      {deposits.length === 0 ? (
        <p className="text-gray-500">Нет депозитов</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Токен</th>
                <th className="p-3 text-left">Количество</th>
                <th className="p-3 text-left">Действие</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((dep, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-3">{i}</td>
                  <td className="p-3 truncate max-w-xs">{dep.tokenAddress}</td>
                  <td className="p-3">{ethers.utils.formatUnits(dep.amount, 18)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => window.vaultContract.withdraw(i)}
                      className="text-white bg-danger px-3 py-1 rounded hover:bg-red-700"
                    >
                      Вывести
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}