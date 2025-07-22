import React, { useState } from "react";

export default function DepositForm({ vaultContract }) {
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vaultContract) {
      alert("Контракт хранилища не инициализирован");
      return;
    }

    try {
      await vaultContract.deposit(token, amount);
      alert("Токены зачислены в хранилище");
    } catch (err) {
      alert("Ошибка при зачислении токенов");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <h4 className="font-semibold text-lg">Хранение токенов</h4>
      <input
        type="text"
        placeholder="Адрес токена"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="w-full p-2 border rounded mt-2"
        required
      />
      <input
        type="number"
        placeholder="Количество"
        step="any"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full p-2 border rounded mt-2"
        required
      />
      <button 
        type="submit" 
        className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        disabled={!vaultContract}
      >
        Зачислить
      </button>
    </form>
  );
}