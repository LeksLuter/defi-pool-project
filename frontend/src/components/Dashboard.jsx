import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import DepositForm from "./DepositForm";
import WithdrawForm from "./WithdrawForm";
import MyDeposits from "./MyDeposits";
import StatCard from "./StatCard";
import { useWeb3 } from "../context/Web3Context";

export default function Dashboard() {
  const { account, poolContract, vaultContract } = useWeb3();
  const [totalPools, setTotalPools] = useState("...");
  const [totalLiquidity, setTotalLiquidity] = useState("...");
  const [lockedTokens, setLockedTokens] = useState("...");

  useEffect(() => {
    const loadStats = async () => {
      if (!poolContract || !vaultContract || !account) return;

      try {
        // Загружаем количество пулов
        const pools = await poolContract.getPools();
        setTotalPools(pools.length);

        // Загружаем резервы пула
        const reserves = await poolContract.getReserves();
        setTotalLiquidity(
          `${ethers.utils.formatUnits(reserves[0], 18)} / ${ethers.utils.formatUnits(reserves[1], 18)}`
        );

        // Загружаем количество заблокированных токенов
        const deposits = await vaultContract.getDepositsByUser(account);
        setLockedTokens(deposits.length);
      } catch (err) {
        console.error("Ошибка загрузки статистики", err);
      }
    };

    loadStats();
  }, [poolContract, vaultContract, account]);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-2xl font-bold mb-4">Подключите кошелёк</h2>
        <p className="text-gray-600 mb-6">Чтобы получить доступ к дашборду, подключите свой кошелёк MetaMask</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Дашборд</h1>
        <p className="text-gray-600">Добро пожаловать, {account.slice(0, 6)}...{account.slice(-4)}</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Всего пулов" value={totalPools} />
        <StatCard title="Ликвидность в пулах" value={totalLiquidity} />
        <StatCard title="Заблокировано токенов" value={lockedTokens} />
      </div>

      {/* Основные функции */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Хранилище токенов</h2>
          <div className="space-y-6">
            <DepositForm vaultContract={vaultContract} />
            <WithdrawForm vaultContract={vaultContract} />
            <MyDeposits vaultContract={vaultContract} account={account} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Пулы ликвидности</h2>
          <div className="space-y-4">
            <p className="text-gray-600">Добавьте ликвидность в пулы и получайте вознаграждение за комиссии.</p>
            <button className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition">
              Добавить ликвидность
            </button>
            <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition">
              Управление позициями
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}