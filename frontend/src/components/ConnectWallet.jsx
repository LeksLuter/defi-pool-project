import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function ConnectWallet() {
  const { connect } = useWeb3();

  return (
    <div className="flex justify-center mt-10">
      <button
        onClick={connect}
        className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded shadow hover:bg-gray-100 transition"
      >
        Подключить кошелёк
      </button>
    </div>
  );
}