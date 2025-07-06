import React, { useState } from "react";

export default function LiquidityForm({ poolAddress }) {
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [lowerPrice, setLowerPrice] = useState("");
  const [upperPrice, setUpperPrice] = useState("");
  const [feeRate, setFeeRate] = useState("30");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ poolAddress, amount0, amount1, lowerPrice, upperPrice, feeRate });
    alert("Добавление ликвидности...");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Добавить ликвидность</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label>Токен A</label>
          <input
            type="number"
            step="any"
            value={amount0}
            onChange={(e) => setAmount0(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Количество токена A"
            required
          />
        </div>
        <div>
          <label>Токен B</label>
          <input
            type="number"
            step="any"
            value={amount1}
            onChange={(e) => setAmount1(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Количество токена B"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label>Нижняя цена</label>
          <input
            type="number"
            step="any"
            value={lowerPrice}
            onChange={(e) => setLowerPrice(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Например: 0.9"
            required
          />
        </div>
        <div>
          <label>Верхняя цена</label>
          <input
            type="number"
            step="any"
            value={upperPrice}
            onChange={(e) => setUpperPrice(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Например: 1.1"
            required
          />
        </div>
      </div>

      <div className="mb-4">
        <label>Уровень комиссии</label>
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
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
      >
        Добавить ликвидность
      </button>
    </form>
  );
}