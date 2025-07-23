import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function ConnectWallet() {
  const { connect } = useWeb3();

  return (
    <button
      onClick={connect}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition"
    >
      Подключить кошелёк
    </button>
  );
}