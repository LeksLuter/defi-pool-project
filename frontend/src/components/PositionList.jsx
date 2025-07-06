import React from "react";

export default function PositionList({ poolAddress }) {
  // Пример данных
  const positions = [
    { tokenId: 1, tokenA: "100 DAI", tokenB: "100 USDC", feeCollected: "0.3 USDC" },
    { tokenId: 2, tokenA: "50 ETH", tokenB: "5000 USDT", feeCollected: "1.5 USDT" }
  ];

  return (
    <div className="bg-white shadow-md rounded p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Мои позиции</h2>

      {positions.length === 0 ? (
        <p>Позиций нет</p>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left bg-gray-100">
              <th>ID</th>
              <th>Токен A</th>
              <th>Токен B</th>
              <th>Комиссия</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => (
              <tr key={i}>
                <td>{pos.tokenId}</td>
                <td>{pos.tokenA}</td>
                <td>{pos.tokenB}</td>
                <td>{pos.feeCollected}</td>
                <td>
                  <button
                    onClick={() => alert(`Забираем ликвидность ID ${pos.tokenId}`)}
                    className="text-red-500 hover:underline"
                  >
                    Забрать
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}