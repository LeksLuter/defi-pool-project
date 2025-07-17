import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function ConnectWallet() {
  const { account, connect } = useWeb3();

  return (
    <div className="mb-6">
      {!account ? (
        <button
          onClick={connect}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Подключить MetaMask
        </button>
      ) : (
        <p className="text-center py-2">
          Подключён: <strong>{account}</strong>
        </p>
      )}
    </div>
  );
}