import React, { useState } from "react";

export default function WithdrawForm({ vaultAddress }) {
  const [depositId, setDepositId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tx = await window.vaultContract.withdraw(depositId);
      await tx.wait();
      alert("Токены выведены");
    } catch (err) {
      alert("Ошибка при выводе токенов");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Вывод из хранилища</h2>

      <div className="mb-4">
        <label>ID депозита</label>
        <input
          type="number"
          value={depositId}
          onChange={(e) => setDepositId(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="0"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
      >
        Вывести токены
      </button>
    </form>
  );
}