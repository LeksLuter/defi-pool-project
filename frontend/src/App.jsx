import React from "react";
import Layout from "./components/Layout";
import Hero from "./components/Hero";
import ConnectWallet from "./components/ConnectWallet";
import Stats from "./components/Stats";
import MyDeposits from "./components/MyDeposits";
import DepositForm from "./components/DepositForm";
import WithdrawForm from "./components/WithdrawForm";
import { useWeb3 } from "./context/Web3Context";

function App() {
  const { account, connect } = useWeb3();
  const poolAddress = process.env.POOL_ADDRESS;
  const vaultAddress = process.env.VAULT_ADDRESS;

  return (
    <Layout>
      <Hero />
      <div className="container mx-auto p-6">
        <ConnectWallet />
        {account && (
          <>
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