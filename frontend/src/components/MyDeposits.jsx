import React, { useEffect, useState } from "react";

export default function MyDeposits({ vaultAddress }) {
  const [deposits, setDeposits] = useState([]);

  useEffect(() => {
    const loadDeposits = async () => {
      const depositsList = await window.vaultContract.getDepositsByUser(window.userAddress);
      setDeposits(depositsList);
    };

    if (window.vaultContract && window.userAddress) {
      loadDeposits();
    }
  }, [vaultAddress]);

  return (
    <div className="bg-white shadow-md rounded p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Мои депозиты</h2>

      {deposits.length === 0 ? (
        <p>Депозитов нет</p>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th>ID</th>
              <th>Токен</th>
              <th>Количество</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((dep, i) => (
              <tr key={i}>
                <td>{i}</td>
                <td>{dep.tokenAddress}</td>
                <td>{ethers.utils.formatUnits(dep.amount.toString(), 18)}</td>
                <td>
                  <button
                    onClick={() => window.vaultContract.withdraw(i)}
                    className="text-red-500 hover:underline"
                  >
                    Вывести
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}