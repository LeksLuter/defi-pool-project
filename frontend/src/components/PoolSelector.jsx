import React from "react";

const pools = [
  { name: "DAI/USDC", address: "0xDAIUSDCPool" },
  { name: "WMATIC/DAI", address: "0xMATICDAIPool" },
  { name: "WBTC/USDT", address: "0xWBTCUSDT" }
];

export default function PoolSelector({ onSelectPool }) {
  return (
    <div className="mb-6">
      <label className="block text-lg font-semibold mb-2">Выберите пул:</label>
      <select
        onChange={(e) => onSelectPool(pools.find(p => p.address === e.target.value))}
        className="w-full p-2 border rounded"
      >
        <option value="">-- Выберите пул --</option>
        {pools.map((pool, i) => (
          <option key={i} value={pool.address}>{pool.name}</option>
        ))}
      </select>
    </div>
  );
}