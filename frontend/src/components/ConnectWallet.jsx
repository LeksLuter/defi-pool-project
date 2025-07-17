import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function ConnectWallet() {
  const { account, connect } = useWeb3();

  return (
    <div className="text-center mb-8">
      {!account ? (
        <button
          onClick={connect}
          className="bg-primary text-white px-6 py-3 rounded-lg shadow hover:bg-secondary transition"
        >
          🔐 Подключить MetaMask
        </button>
      ) : (
        <p className="text-lg text-gray-700">
          Подключён: <strong className="text-primary">{account}</strong>
        </p>
      )}
    </div>
  );
}