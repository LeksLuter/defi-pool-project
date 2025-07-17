import React, { useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { ethers } from "ethers"; // ✅ Добавлен импорт

export default function Stats({ poolAddress }) {
  const { getContracts } = useWeb3(); // ⚠️ Если `getContracts` не используется напрямую, можно убрать
  const [reserves, setReserves] = useState(null);
  const [totalPools, setTotalPools] = useState(0);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const contracts = await getContracts(poolAddress, process.env.VAULT_ADDRESS);
        const { pool } = contracts;

        const reserves = await pool.getReserves();
        const pools = await pool.getPools();

        setReserves(reserves);
        setTotalPools(pools.length);
      } catch (err) {
        console.error("Не удалось загрузить статистику", err);
      }
    };

    if (poolAddress) {
      loadStats();
    }
  }, [poolAddress, getContracts]); // ✅ Добавлен `getContracts` в зависимости

  return (
    <section className="py-12 bg-gray-100">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold">Резервы TKA</h3>
          <p className="text-2xl font-bold">
            {reserves ? ethers.utils.formatUnits(reserves[0].toString(), 18) : "Загрузка..."}
          </p>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold">Резервы TKB</h3>
          <p className="text-2xl font-bold">
            {reserves ? ethers.utils.formatUnits(reserves[1].toString(), 18) : "Загрузка..."}
          </p>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold">Всего пулов</h3>
          <p className="text-2xl font-bold">{totalPools}</p>
        </div>
      </div>
    </section>
  );
}