import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function DisconnectWallet() {
  const { disconnect } = useWeb3();

  return (
    <button
      onClick={disconnect}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
    >
      Отключить
    </button>
  );
}