// frontend/src/components/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import PoolList from "./PoolList";
import MyDeposits from "./MyDeposits";
import DepositForm from "./DepositForm";
import WithdrawForm from "./WithdrawForm";
import StatCard from "./StatCard"; // ✅ Теперь импортируем корректно

export default function Dashboard() {
  const { account, poolContract, vaultContract } = useWeb3();
  const [totalPools, setTotalPools] = useState("...");
  const [totalLiquidity, setTotalLiquidity] = useState("...");
  const [lockedTokens, setLockedTokens] = useState("...");

  useEffect(() => {
    const loadStats = async () => {
      if (!poolContract || !vaultContract) return;

      try {
        const pools = await poolContract.getPools();
        const reserves = await poolContract.getReserves();
        const deposits = await vaultContract.getDepositsByUser(account);

        setTotalPools(pools.length);
        setTotalLiquidity(
          `${ethers.utils.formatUnits(reserves[0], 18)} / ${ethers.utils.formatUnits(reserves[1], 18)}`
        );
        setLockedTokens(deposits.length);
      } catch (err) {
        console.error("Ошибка загрузки статистики", err);
      }
    };

    if (account && poolContract && vaultContract) {
      loadStats();
    }
  }, [account, poolContract, vaultContract]);

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-10">
        Добро пожаловать, {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "—"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Всего пулов" value={totalPools} />
        <StatCard title="Ликвидность в пулах" value={totalLiquidity} />
        <StatCard title="Заблокировано токенов" value={lockedTokens} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-4">Пулы ликвидности</h3>
          <PoolList poolContract={poolContract} />
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