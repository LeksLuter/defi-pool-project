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

  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-4">Мои депозиты</h3>
      {deposits.length === 0 ? (
        <p className="text-gray-500">Депозитов нет</p>
      ) : (
        <ul className="space-y-4">
          {deposits.map((dep, i) => (
            <li key={i} className="flex justify-between items-center bg-white p-4 rounded shadow-sm">
              <span>{dep.tokenAddress}</span>
              <span className="font-mono">
                {ethers.utils.formatUnits(dep.amount.toString(), 18)}
              </span>
              <button 
                onClick={() => vaultContract.withdraw(i)}
                className="text-red-600 hover:text-red-700 hover:underline transition"
                disabled={!vaultContract}
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