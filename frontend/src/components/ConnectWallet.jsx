import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function ConnectWallet() {
  const { connect } = useWeb3();

  return (
    <button
      onClick={connect}
      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
    >
      Подключить кошелёк
    </button>
  );
}