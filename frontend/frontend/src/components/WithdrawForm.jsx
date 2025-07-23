import React, { useState } from "react";

export default function WithdrawForm({ vaultContract }) {
  const [depositId, setDepositId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vaultContract) {
      alert("Контракт хранилища не инициализирован");
      return;
    }

    try {
      await vaultContract.withdraw(depositId);
      alert("Токены успешно выведены");
    } catch (err) {
      alert("Ошибка вывода токенов");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <h4 className="font-semibold text-lg">Вывод из хранилища</h4>
      <input
        type="number"
        placeholder="ID депозита"
        value={depositId}
        onChange={(e) => setDepositId(e.target.value)}
        className="w-full p-2 border rounded mt-2"
        required
      />
      <button 
        type="submit" 
        className="mt-2 w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
        disabled={!vaultContract}
      >
        Вывести
      </button>
    </form>
  );
}