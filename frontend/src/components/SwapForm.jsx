import React, { useState } from "react";

export default function SwapForm({ poolAddress }) {
  const [tokenIn, setTokenIn] = useState("token0");
  const [amountIn, setAmountIn] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ tokenIn, amountIn, poolAddress });
    alert("Выполняется обмен...");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Обменять токены</h2>

      <div className="mb-4">
        <label>Токен для обмена</label>
        <select
          value={tokenIn}
          onChange={(e) => setTokenIn(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="token0">Токен A</option>
          <option value="token1">Токен B</option>
        </select>
      </div>

      <div className="mb-4">
        <label>Сумма</label>
        <input
          type="number"
          step="any"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Введите сумму"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
      >
        Обменять
      </button>
    </form>
  );
}