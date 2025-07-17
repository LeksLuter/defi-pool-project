import React, { useState } from "react";

export default function CreatePoolForm() {
  const [token0, setToken0] = useState("");
  const [token1, setToken1] = useState("");
  const [feeRate, setFeeRate] = useState("30");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ token0, token1, feeRate });
    alert("Пул создан");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Создать пул</h2>

      <div className="mb-4">
        <label>Токен A</label>
        <input
          type="text"
          value={token0}
          onChange={(e) => setToken0(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Адрес токена A"
          required
        />
      </div>

      <div className="mb-4">
        <label>Токен B</label>
        <input
          type="text"
          value={token1}
          onChange={(e) => setToken1(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Адрес токена B"
          required
        />
      </div>

      <div className="mb-4">
        <label>Комиссия</label>
        <select
          value={feeRate}
          onChange={(e) => setFeeRate(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="5">0.05%</option>
          <option value="30">0.3%</option>
          <option value="100">1%</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
      >
        Создать пул
      </button>
    </form>
  );
}