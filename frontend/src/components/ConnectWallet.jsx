import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function ConnectWallet() {
  const { connect, loading } = useWeb3();

  return (
    <div className="mb-6">
      <button
        onClick={connect}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "Подключение..." : "Подключить кошелёк"}
      </button>
    </div>
  );
}