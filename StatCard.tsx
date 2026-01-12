import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  type: 'neutral' | 'success' | 'error';
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, type, icon }) => {
  const colors = {
    neutral: "bg-white border-gray-200 text-gray-800",
    success: "bg-green-50 border-green-200 text-green-700",
    error: "bg-red-50 border-red-200 text-red-700",
  };

  return (
    <div className={`p-6 rounded-lg border-2 shadow-sm flex flex-col justify-between h-full ${colors[type]}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider opacity-80">{title}</h3>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>
      <div className="text-4xl md:text-5xl font-bold truncate">
        {value}
      </div>
    </div>
  );
};