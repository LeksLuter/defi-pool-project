import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import PoolList from "./PoolList";
import MyPositions from "./MyPositions";
import DepositForm from "./DepositForm";
import WithdrawForm from "./WithdrawForm";
import MyDeposits from "./MyDeposits";

export default function Dashboard({ account, poolContract, vaultContract }) {
  const [totalPools, setTotalPools] = useState("...");
  const [totalLiquidity, setTotalLiquidity] = useState("...");
  const [lockedTokens, setLockedTokens] = useState("...");

  useEffect(() => {
    if (!poolContract || !vaultContract) return;

    const loadData = async () => {
      try {
        const pools = await poolContract.getPools();
        const reserves = await poolContract.getReserves();
        const userDeposits = await vaultContract.getDepositsByUser(account);

        setTotalPools(pools.length);
        setTotalLiquidity(
          `${ethers.utils.formatUnits(reserves[0], 18)} / ${ethers.utils.formatUnits(reserves[1], 18)}`
        );
        setLockedTokens(userDeposits.length);
      } catch (err) {
        console.error("Не удалось загрузить данные", err);
      }
    };

    loadData();
  }, [poolContract, vaultContract, account]);

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-10">Добро пожаловать, {account.slice(0, 6)}...{account.slice(-4)}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Всего пулов" value={totalPools} />
        <StatCard title="Ликвидность в пулах" value={totalLiquidity} />
        <StatCard title="Заблокировано токенов" value={lockedTokens} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-4">Добавление/вывод из пула</h3>
          <PoolList poolContract={poolContract} account={account} />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Хранилище токенов</h3>
          <DepositForm vaultContract={vaultContract} />
          <WithdrawForm vaultContract={vaultContract} />
          <MyDeposits vaultContract={vaultContract} account={account} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white p-6 rounded shadow-md text-center">
      <h3 className="text-gray-500 text-sm uppercase tracking-wide">{title}</h3>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}