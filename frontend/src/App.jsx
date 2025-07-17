import React, { useState } from "react";
import Layout from "./components/Layout";
import Hero from "./components/Hero";
import ConnectWallet from "./components/ConnectWallet";
import DepositForm from "./components/DepositForm";
import WithdrawForm from "./components/WithdrawForm";
import MyDeposits from "./components/MyDeposits";
import Stats from "./components/Stats";
import { useWeb3 } from "./context/Web3Context";

function App() {
  const { account, connect, getContracts } = useWeb3();
  const [vaultAddress, setVaultAddress] = useState(process.env.VAULT_ADDRESS);
  const [poolAddress, setPoolAddress] = useState(process.env.POOL_ADDRESS);

  return (
    <Layout>
      <Hero />

      <div className="container mx-auto p-6">
        <ConnectWallet />

        {account && (
          <>
            <h2 className="text-2xl font-semibold mt-6 mb-4">Статистика пула</h2>
            <Stats poolAddress={poolAddress} />

            <h2 className="text-2xl font-semibold mt-6 mb-4">Хранение токенов</h2>
            <DepositForm vaultAddress={vaultAddress} />
            <WithdrawForm vaultAddress={vaultAddress} />
            <MyDeposits vaultAddress={vaultAddress} />
          </>
        )}
      </div>
    </Layout>
  );
}

export default App;