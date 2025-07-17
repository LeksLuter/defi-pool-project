import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function PoolList({ poolContract, account }) {
  const [pools, setPools] = useState([]);

  useEffect(() => {
    const loadPools = async () => {
      const list = await poolContract.getPools();
      setPools(list);
    };

    if (poolContract) {
      loadPools();
    }
  }, [poolContract]);

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