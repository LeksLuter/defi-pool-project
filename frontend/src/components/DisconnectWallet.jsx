import React from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

export default function DisconnectWallet() {
  const { disconnect } = useWeb3();
  const navigate = useNavigate();

  const handleDisconnect = () => {
    disconnect(); // ✅ Вызываем отключение
    navigate('/'); // ✅ Переход на главную
  };

  return (
    <button
      onClick={handleDisconnect}
      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-red-700"
      aria-label="Отключить кошелёк"
    >
      Отключить кошелёк
    </button>
  );
}