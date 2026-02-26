
import React, { useEffect, useState } from 'react';
import { inventoryService } from './inventoryService';
import { StatCard } from './StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Box } from 'lucide-react';
import { UnitStatus } from './types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalStock: 0,
    outOfStockCount: 0,
    activeAlerts: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const products = inventoryService.getProducts();
    const units = inventoryService.getUnits();
    
    const inStockUnits = units.filter(u => u.status === UnitStatus.NEW);
    
    let outOfStock = 0;
    const data = products.map(p => {
      const count = inStockUnits.filter(u => u.productId === p.id).length;
      if (count === 0) outOfStock++;
      return {
        name: p.model,
        stock: count
      };
    });

    setStats({
      totalStock: inStockUnits.length,
      outOfStockCount: outOfStock,
      activeAlerts: outOfStock
    });

    setChartData(data);

  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tổng quan (Dashboard)</h2>
          <p className="text-slate-500">Theo dõi tồn kho Máy lọc nước RO theo thời gian thực.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          title="Tổng số máy tồn kho" 
          value={stats.totalStock} 
          icon={<Box />} 
        />
        <StatCard 
          title="Model hết hàng" 
          value={stats.outOfStockCount} 
          icon={<AlertTriangle className="text-orange-500" />} 
          colorClass="bg-orange-50 border-orange-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg mb-4 text-slate-800">Tồn kho theo Model</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f0f9ff'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="stock" name="Tồn hiện tại" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
