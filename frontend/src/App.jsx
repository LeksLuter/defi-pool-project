import React from "react";
import Hero from "./components/Hero";
import ConnectWallet from "./components/ConnectWallet";
import Dashboard from "./components/Dashboard";
import { useWeb3 } from "./context/Web3Context";

function App() {
  const { account, loading, error } = useWeb3(); // ✅ Используем loading и error
  const [showDashboard, setShowDashboard] = React.useState(false);

  React.useEffect(() => {
    if (account) setShowDashboard(true);
  }, [account]);

  return (
    <div className="min-h-screen bg-gray-50">
      {!account || !showDashboard ? (
        <>
          <Hero />
          <div className="container mx-auto p-6">
            <ConnectWallet />
          </div>
        </>
      ) : (
        <Dashboard account={account} />
      )}
    </div>
  );
}

export default App;