import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";

export default function MyDeposits({ vaultAddress }) {
  const { vaultContract, account } = useWeb3();
  const [deposits, setDeposits] = useState([]);

  useEffect(() => {
    const loadDeposits = async () => {
      const depositsList = await vaultContract.getDepositsByUser(account);
      setDeposits(depositsList);
    };

    if (vaultContract && account) {
      loadDeposits();
    }
  }, [vaultContract, account]);

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
                    onClick={() => vaultContract.withdraw(i)}
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