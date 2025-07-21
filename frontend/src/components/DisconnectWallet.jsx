import React from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

export default function DisconnectWallet() {
  const { disconnect } = useWeb3();
  const navigate = useNavigate();

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  return (
    <button
      onClick={handleDisconnect}
      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium"
    >
      Отключить
    </button>
  );
}