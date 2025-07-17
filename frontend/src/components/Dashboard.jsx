import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

// ✅ Удалён неиспользуемый импорт useWeb3
// import { useWeb3 } from "../context/Web3Context";

import PoolList from "./PoolList";
import DepositForm from "./DepositForm";
import WithdrawForm from "./WithdrawForm";
import MyDeposits from "./MyDeposits";
import StatCard from "./StatCard";

// ✅ Добавлены PropTypes для строгой проверки props
import PropTypes from "prop-types";

export default function Dashboard({ account, poolContract, vaultContract }) {
  const [totalPools, setTotalPools] = useState("...");
  const [totalLiquidity, setTotalLiquidity] = useState("...");
  const [lockedTokens, setLockedTokens] = useState("...");

  useEffect(() => {
    const loadStats = async () => {
      if (!poolContract || !vaultContract || !account) return;

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
        console.error("Ошибка загрузки данных", err);
      }
    };

    loadStats();
  }, [account, poolContract, vaultContract]);

  // ✅ Добавлена проверка на undefined
  if (!account || !poolContract || !vaultContract) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Загрузка данных или подключите кошелёк</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-10">
        Добро пожаловать, {account.slice(0, 6)}...{account.slice(-4)}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Всего пулов" value={totalPools} />
        <StatCard title="Ликвидность в пулах" value={totalLiquidity} />
        <StatCard title="Заблокировано токенов" value={lockedTokens} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-4">Пулы ликвидности</h3>
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

// ✅ Добавлены PropTypes для строгой типизации
Dashboard.propTypes = {
  account: PropTypes.string.isRequired,
  poolContract: PropTypes.object,
  vaultContract: PropTypes.object
};