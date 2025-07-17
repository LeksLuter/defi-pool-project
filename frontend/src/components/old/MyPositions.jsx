import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function MyPositions({ poolContract, account }) {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const loadPositions = async () => {
      const count = await poolContract.balanceOf(account);
      const list = [];

      for (let i = 0; i < count.toNumber(); i++) {
        const tokenId = await poolContract.tokenOfOwnerByIndex(account, i);
        const position = await poolContract.getPosition(tokenId);
        list.push(position);
      }

      setPositions(list);
    };

    if (poolContract && account) {
      loadPositions();
    }
  }, [poolContract, account]);

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-lg mb-2">Мои позиции в пулах</h4>
      {positions.length === 0 ? (
        <p className="text-gray-500">Нет позиций</p>
      ) : (
        <table className="w-full border-collapse bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Токен A</th>
              <th className="p-3 text-left">Токен B</th>
              <th className="p-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => (
              <tr key={i}>
                <td className="p-3">{i}</td>
                <td className="p-3">{ethers.utils.formatUnits(pos.liquidity0.toString(), 18)}</td>
                <td className="p-3">{ethers.utils.formatUnits(pos.liquidity1.toString(), 18)}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => poolContract.removeLiquidity(i)}
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