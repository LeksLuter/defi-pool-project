import React, { useState } from "react";

export default function DepositForm({ vaultAddress }) {
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tx = await window.vaultContract.deposit(token, amount);
      await tx.wait();
      alert("Токены зачислены в хранилище");
    } catch (err) {
      alert("Ошибка при зачислении токенов");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Хранение токенов</h2>

      <div className="mb-4">
        <label>Адрес токена</label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="0x..."
          required
        />
      </div>

      <div className="mb-4">
        <label>Количество токенов</label>
        <input
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="0.1"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
      >
        Зачислить в хранилище
      </button>
    </form>
  );
}