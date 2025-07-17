import React, { useEffect, useState } from "react";

export default function PoolList({ poolContract, account }) {
  const [pools, setPools] = useState([]);

  useEffect(() => {
    const loadPools = async () => {
      if (!poolContract || !account) return;

      try {
        const list = await poolContract.getPools();
        setPools(list);
      } catch (err) {
        console.error("Ошибка загрузки пулов", err);
      }
    };

    loadPools();
  }, [poolContract, account]);

  if (!poolContract || !account) {
    return <p className="text-gray-500">Загрузка пулов...</p>;
  }

  return (
    <div className="bg-white shadow-md rounded p-4 mb-6">
      <h4 className="font-semibold text-lg">Доступные пулы</h4>
      <ul>
        {pools.map((pool, i) => (
          <li key={i} className="flex justify-between items-center py-2 border-b">
            <span>{pool}</span>
            <button className="text-blue-600 hover:underline">Выбрать</button>
          </li>
        ))}
      </ul>
    </div>
  );
}