import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function ConnectWallet() {
  const { connect } = useWeb3();

  return (
    <div className="flex justify-center">
      <button
        onClick={connect}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-md font-medium transition-all duration-300 transform hover:scale-105"
        aria-label="Подключить кошелёк"
      >
        Подключить кошелёк
      </button>
    </div>
  );
}