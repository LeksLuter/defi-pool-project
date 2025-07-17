import React, { useState } from "react";

export default function DepositForm({ vaultAddress }) {
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !amount) return alert("Введите адрес и сумму");

    try {
      await window.vaultContract.deposit(token, amount);
      alert("Токены зачислены в хранилище");
    } catch (err) {
      alert("Ошибка при зачислении токенов");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold mb-4">Зачислить токены</h2>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Адрес токена</label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="0x..."
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Количество</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="0.1"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-accent text-white py-2 px-4 rounded hover:bg-blue-700 transition"
      >
        Зачислить
      </button>
    </form>
  );
}