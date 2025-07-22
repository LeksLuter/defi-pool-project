import React from "react";

export default function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white bg-opacity-20 backdrop-blur-md p-6 rounded-lg text-center border border-white border-opacity-30">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}