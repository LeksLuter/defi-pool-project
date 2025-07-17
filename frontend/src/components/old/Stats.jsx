import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";

export default function Stats({ poolAddress }) {
  const { poolContract } = useWeb3();
  const [reserves, setReserves] = useState([0, 0]);
  const [totalPools, setTotalPools] = useState(0);

  useEffect(() => {
    const loadStats = async () => {
      const reserves = await poolContract.getReserves();
      const pools = await poolContract.getPools();
      setReserves(reserves);
      setTotalPools(pools.length);
    };

    if (poolAddress && poolContract) {
      loadStats();
    }
  }, [poolAddress, poolContract]);

  return (
    <section className="py-12 bg-gray-100">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold">Резервы TKA</h3>
          <p className="text-2xl font-bold">
            {ethers.utils.formatUnits(reserves[0].toString(), 18)}
          </p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold">Резервы TKB</h3>
          <p className="text-2xl font-bold">
            {ethers.utils.formatUnits(reserves[1].toString(), 18)}
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