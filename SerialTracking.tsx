import React, { useState } from 'react';
import { inventoryService } from './inventoryService';
import { SerialUnit, Transaction } from './types';
// Added History icon to lucide-react imports to resolve JSX element type conflict
import { Search, MapPin, User, Calendar, Box, ArrowRightLeft, CheckCircle, Info, History } from 'lucide-react';

export const SerialTracking: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SerialUnit | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    const unit = inventoryService.getUnitBySerial(cleanQuery);
    const txHistory = inventoryService.getSerialHistory(cleanQuery);
    
    setResult(unit || null);
    setHistory(txHistory);
    setSearched(true);
  };

  const productInfo = result ? inventoryService.getProductById(result.productId) : null;

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleString('vi-VN');
    } catch {
      return isoString;
    }
  };

  const renderTimelineEvent = (tx: Transaction, index: number) => {
    let icon = <Calendar size={16} />;
    let color = "bg-slate-400";
    let title = "";
    let description = "";

    if (tx.type === 'INBOUND') {
       icon = <Calendar size={16} />;
       color = "bg-green-500";
       title = "Nhập Kho";
       description = `Nhập kho tại: ${tx.toLocation || 'Kho Tổng'}`;
    } else if (tx.type === 'TRANSFER') {
       icon = <ArrowRightLeft size={16} />;
       color = "bg-blue-500";
       title = "Điều chuyển";
       description = `Chuyển đến: ${tx.toLocation}`;
    } else if (tx.type === 'OUTBOUND') {
       icon = <User size={16} />;
       color = "bg-orange-500";
       title = "Xuất bán";
       description = `Khách hàng: ${tx.customer}`;
    }

    return (
      <div key={tx.id} className="relative pb-8 last:pb-0">
         {index !== history.length - 1 && (
            <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-slate-200"></div>
         )}
         <div className="flex gap-4">
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ring-4 ring-white ${color}`}>
               {icon}
            </div>
            <div className="flex-1 pt-1">
               <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800">{title}</h4>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">{formatDateTime(tx.date)}</span>
               </div>
               <p className="text-slate-600 text-sm mt-1">{description}</p>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
       <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800">Tra cứu IMEI / Serial</h2>
          <p className="text-slate-500 mt-2">Truy xuất lịch sử chi tiết vòng đời sản phẩm.</p>
       </div>

       <form onSubmit={handleSearch} className="relative">
          <input 
            type="text"
            className="w-full p-4 pl-12 rounded-full border-2 border-slate-200 focus:border-water-500 outline-none shadow-md text-lg font-mono"
            placeholder="Nhập mã IMEI hoặc Serial..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="absolute left-4 top-5 text-slate-400" />
          <button type="submit" className="absolute right-2 top-2 bg-slate-800 text-white px-8 py-2.5 rounded-full font-bold hover:bg-slate-700 transition-all shadow-md active:scale-95">
            Tìm kiếm
          </button>
       </form>

       {searched && !result && (
         <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
               <Info size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy mã này</h3>
            <p className="text-slate-500 mt-1">Mã "<span className="font-mono font-bold text-slate-900">{query}</span>" chưa có dữ liệu nhập kho.</p>
         </div>
       )}

       {result && (
         <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
               <div>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Mã sản phẩm tra cứu</p>
                 <h3 className="text-2xl font-mono font-bold text-water-400">{result.serialNumber}</h3>
               </div>
               <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
                 result.status === 'NEW' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-orange-500/10 border-orange-500 text-orange-400'
               }`}>
                 <CheckCircle size={14}/> {result.status === 'NEW' ? 'ĐANG TỒN KHO' : 'ĐÃ XUẤT BÁN'}
               </div>
            </div>
            
            <div className="p-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                     <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><MapPin size={24} /></div>
                     <div>
                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Vị trí hiện tại</p>
                        <p className="text-lg font-bold text-slate-800">{result.warehouseLocation}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                     <div className="bg-slate-200 p-3 rounded-lg text-slate-600"><Box size={24} /></div>
                     <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Thông tin Model</p>
                        <p className="text-lg font-bold text-slate-800">{productInfo?.model || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400">{productInfo?.brand || 'N/A'}</p>
                     </div>
                  </div>
               </div>

               <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <History className="text-water-600" size={20}/>
                  Lịch sử vòng đời sản phẩm
               </h4>
               
               <div className="pl-2 border-l-2 border-slate-50 ml-2">
                 {history.length > 0 ? (
                    history.map((tx, idx) => renderTimelineEvent(tx, idx))
                 ) : (
                    <div className="p-4 bg-slate-50 rounded-lg text-slate-400 italic text-sm text-center">
                       Chưa có lịch sử giao dịch ghi nhận.
                    </div>
                 )}
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
