import React, { useState } from "react";
import Layout from "./components/Layout";
import ConnectWallet from "./components/ConnectWallet";
import DepositForm from "./components/DepositForm";
import WithdrawForm from "./components/WithdrawForm";
import MyDeposits from "./components/MyDeposits";
import { useWeb3 } from "./context/Web3Context";

function App() {
  const { account, connect, addLiquidity, removeLiquidity, swap, vaultContract } = useWeb3();
  const [vaultAddress, setVaultAddress] = useState("0xYourVaultAddressHere");

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">DeFi Пул + Хранилище токенов</h1>

        <ConnectWallet />

        {account && (
          <>
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