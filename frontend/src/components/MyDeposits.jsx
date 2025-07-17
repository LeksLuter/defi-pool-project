import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function MyDeposits({ vaultContract, account }) {
  const [deposits, setDeposits] = useState([]);

  useEffect(() => {
    const loadDeposits = async () => {
      if (!vaultContract || !account) return;

      try {
        const list = await vaultContract.getDepositsByUser(account);
        setDeposits(list);
      } catch (err) {
        console.error("Ошибка загрузки депозитов", err);
      }
    };

    loadDeposits();
  }, [vaultContract, account]);

  if (!vaultContract || !account) {
    return <p className="text-gray-500">Загрузка данных...</p>;
  }

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-lg">Мои депозиты</h4>
      {deposits.length === 0 ? (
        <p className="text-gray-500">Депозитов нет</p>
      ) : (
        <ul className="bg-white p-4 rounded shadow">
          {deposits.map((dep, i) => (
            <li key={i} className="flex justify-between items-center mb-2 border-b py-2">
              <span>{dep.tokenAddress}</span>
              <span className="font-mono">
                {ethers.utils.formatUnits(dep.amount.toString(), 18)}
              </span>
              <button
                onClick={() => vaultContract.withdraw(i)}
                className="text-red-500 hover:underline"
              >
                Вывести
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}