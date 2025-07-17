import React from "react";

export default function StatCard({ title, value }) {
  return (
    <div className="bg-white p-6 rounded shadow text-center">
      <h3 className="text-gray-500 text-sm uppercase tracking-wide">{title}</h3>
      <p className="text-2xl font-bold mt-2">{value || "—"}</p>
    </div>
  );
}