
import React, { useState, useRef, useEffect } from 'react';
import { inventoryService } from './inventoryService';
import { exportTransactionHistory } from './reportService';
import { Upload, CheckCircle, XCircle, Search, ArrowRightLeft, Store, Warehouse, ArrowRight, History, Plus, Calendar, ChevronDown, ChevronUp, FileSpreadsheet, MapPin, Trash2, Info, Zap, AlertTriangle, ToggleLeft, ToggleRight, Database } from 'lucide-react';
import { playSound } from './sound';
import { Transaction, UnitStatus } from './types';

export const Outbound: React.FC = () => {
  const products = inventoryService.getProducts();
  const warehouses = inventoryService.getWarehouses();
  const customers = inventoryService.getCustomers();
  
  const [activeTab, setActiveTab] = useState<'SCAN' | 'HISTORY'>('SCAN');
  const [historyFrom, setHistoryFrom] = useState(new Date().toISOString().split('T')[0]);
  const [historyTo, setHistoryTo] = useState(new Date().toISOString().split('T')[0]);
  const [historyData, setHistoryData] = useState<Transaction[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const [outboundType, setOutboundType] = useState<'SALE' | 'TRANSFER'>('SALE');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>(''); 
  const [sourceWarehouse, setSourceWarehouse] = useState(warehouses.length > 0 ? warehouses[0].name : '');
  const [autoDetect, setAutoDetect] = useState(true); 
  
  const [currentSerial, setCurrentSerial] = useState('');
  const [recentScans, setRecentScans] = useState<{serial: string, time: string, fromWh: string, to: string}[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      const data = inventoryService.getHistoryByDateRange(['OUTBOUND', 'TRANSFER'], historyFrom, historyTo);
      setHistoryData(data);
    }
  }, [activeTab, historyFrom, historyTo]);

  useEffect(() => {
    if (activeTab === 'SCAN') inputRef.current?.focus();
  }, [recentScans, message, selectedProductId, activeTab, sourceWarehouse, outboundType, targetId, autoDetect]);

  const handleAutoExport = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const scannedCode = currentSerial.trim();
    if (!scannedCode) return;

    if (!selectedProductId) {
       playSound('error');
       setMessage({ type: 'error', text: 'Vui lòng chọn Model sản phẩm!' });
       return;
    }

    if (!targetId) {
       playSound('error');
       setMessage({ type: 'error', text: outboundType === 'SALE' ? 'Chọn khách hàng nhận!' : 'Chọn kho đích!' });
       return;
    }

    const unit = inventoryService.getUnitBySerial(scannedCode);
    
    if (!unit) {
       playSound('error');
       setMessage({ type: 'error', text: `Mã ${scannedCode} không tồn tại!` });
       setCurrentSerial('');
       return;
    }

    if (unit.productId !== selectedProductId) {
       playSound('error');
       setMessage({ type: 'error', text: `Mã thuộc Model khác (${inventoryService.getProductById(unit.productId)?.model})` });
       setCurrentSerial('');
       return;
    }

    if (unit.status !== UnitStatus.NEW) {
       playSound('error');
       setMessage({ type: 'error', text: `Mã ${scannedCode} đã xuất/bán trước đó.` });
       setCurrentSerial('');
       return;
    }

    let actualLoc = unit.warehouseLocation;
    let exportWhName = sourceWarehouse;
    let warningMsg = '';

    if (autoDetect) {
       if (actualLoc !== sourceWarehouse) {
          setSourceWarehouse(actualLoc);
          exportWhName = actualLoc;
          warningMsg = `Tự động nhận diện: Máy nằm tại ${actualLoc}.`;
       }
    } else {
       if (actualLoc !== sourceWarehouse) {
          playSound('error');
          setMessage({ type: 'error', text: `LỖI: Máy này nằm ở ${actualLoc}, không phải ${sourceWarehouse}!` });
          setCurrentSerial('');
          return;
       }
    }

    try {
      const targetName = outboundType === 'SALE' 
        ? (customers.find(c => c.id === targetId)?.name || 'Khách lẻ')
        : (warehouses.find(w => w.id === targetId)?.name || 'Kho đích');

      if (outboundType === 'SALE') {
        inventoryService.exportUnits(selectedProductId, [scannedCode], targetName, exportWhName);
      } else {
        inventoryService.transferUnits(selectedProductId, [scannedCode], targetName);
      }

      playSound('success');
      const newScan = {
        serial: scannedCode,
        time: new Date().toLocaleTimeString('vi-VN'),
        fromWh: exportWhName,
        to: targetName
      };
      setRecentScans([newScan, ...recentScans.slice(0, 19)]);
      setMessage({ 
        type: warningMsg ? 'warning' : 'success', 
        text: warningMsg || `Đã xuất thành công: ${scannedCode}` 
      });

    } catch (err: any) {
      playSound('error');
      setMessage({ type: 'error', text: err.message });
    }

    setCurrentSerial('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
         <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg shadow-blue-100"><Zap /></div>
             <div><h2 className="text-xl font-bold">Xuất Kho Tức Thì</h2><p className="text-slate-500 text-sm">Kiểm soát kho xuất đi theo ý muốn của bạn.</p></div>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 animate-pulse">
               <Database size={12}/> Live Sync
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setActiveTab('SCAN')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'SCAN' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Quét Xuất</button>
                <button onClick={() => setActiveTab('HISTORY')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Lịch sử</button>
            </div>
         </div>
      </div>

      {activeTab === 'SCAN' && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm mb-4">
                      <button className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${outboundType === 'SALE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`} onClick={() => {setOutboundType('SALE'); setTargetId('');}}>
                          <Store size={16}/> Xuất Bán
                      </button>
                      <button className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${outboundType === 'TRANSFER' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500'}`} onClick={() => {setOutboundType('TRANSFER'); setTargetId('');}}>
                          <ArrowRightLeft size={16}/> Điều Chuyển
                      </button>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Model & Nơi nhận</label>
                      <select className="w-full p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-400 font-bold text-slate-700" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                        <option value="">-- Chọn Model xuất --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.model}</option>)}
                      </select>

                      <select className="w-full p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-400 font-bold text-slate-700" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                        <option value="">{outboundType === 'SALE' ? '-- Chọn Khách hàng --' : '-- Chọn Kho nhận --'}</option>
                        {outboundType === 'SALE' 
                          ? customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>) 
                          : warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                        }
                      </select>
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kho xuất hàng (Kho nguồn)</label>
                       <button onClick={() => setAutoDetect(!autoDetect)} className={`flex items-center gap-2 text-[10px] font-black uppercase transition-all ${autoDetect ? 'text-blue-600' : 'text-slate-400'}`}>
                          {autoDetect ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>} {autoDetect ? 'Auto Detect: ON' : 'Manual Mode'}
                       </button>
                    </div>
                    <select className="w-full p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-400 font-bold text-slate-700" value={sourceWarehouse} onChange={(e) => setSourceWarehouse(e.target.value)}>
                       {warehouses.map(wh => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                    </select>
                </div>
            </div>

            <div className={`flex flex-col justify-center ${!selectedProductId || !targetId ? 'opacity-30 pointer-events-none' : ''}`}>
                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <Zap size={12}/> Quét IMEI (Xử lý tức thì)
                </label>
                <form onSubmit={handleAutoExport}>
                   <input ref={inputRef} type="text" placeholder="Quét mã vạch xuất..." className="w-full p-4 border-2 border-blue-100 rounded-2xl font-mono text-2xl shadow-sm outline-none focus:border-blue-500 transition-all bg-blue-50/30" value={currentSerial} onChange={(e) => setCurrentSerial(e.target.value)} />
                </form>
                <p className="text-[10px] text-slate-400 mt-2 italic">* {autoDetect ? 'Hệ thống sẽ tự nhận diện máy nằm ở đâu.' : 'Chỉ cho xuất máy nằm trong kho đã chọn.'}</p>
            </div>
          </div>

          {message && (
             <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 animate-slide-in ${message.type === 'success' ? 'bg-green-600 text-white' : message.type === 'warning' ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'}`}>
                {message.type === 'success' ? <CheckCircle size={24} /> : message.type === 'warning' ? <AlertTriangle size={24}/> : <XCircle size={24} />}
                <span className="font-black tracking-tight">{message.text}</span>
             </div>
          )}

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner mb-8">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Trạng thái tồn thực tế tại các kho</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                   {warehouses.map(wh => {
                      const stock = inventoryService.getWarehouseCurrentStock(wh.name);
                      const capacity = wh.maxCapacity || 9999;
                      const isEmpty = stock === 0;
                      const isSelected = sourceWarehouse === wh.name;

                      return (
                        <div key={wh.id} className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${isSelected ? 'border-blue-500 bg-white shadow-lg scale-105 z-10' : 'border-slate-200 bg-slate-50 opacity-60'}`} onClick={() => setSourceWarehouse(wh.name)}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEmpty ? 'bg-slate-200 text-slate-400' : 'bg-blue-100 text-blue-600'} ${isSelected ? 'bg-blue-600 text-white' : ''}`}>
                            <Warehouse size={20} />
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-800 uppercase truncate w-24">{wh.name}</p>
                            <p className={`text-[10px] font-bold ${isEmpty ? 'text-slate-400' : 'text-blue-500'}`}>Tồn: {stock}</p>
                          </div>
                          {isSelected && <div className="absolute -top-2 bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black shadow-sm">ĐANG CHỌN</div>}
                        </div>
                      );
                   })}
                </div>
          </div>

          <div className="border-t pt-6">
              <h4 className="font-black text-slate-400 text-xs uppercase tracking-widest flex items-center gap-2 mb-4">
                 <History size={14}/> Nhật ký xuất gần đây
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                 {recentScans.map((s, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-slide-in">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold border border-blue-100">{recentScans.length - idx}</div>
                        <span className="font-mono font-black text-slate-700">{s.serial}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Từ: <span className="text-blue-600">{s.fromWh}</span></span>
                        <ArrowRight size={12} className="text-slate-300"/>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Đến: <span className="text-slate-800">{s.to}</span></span>
                        <span className="text-[10px] text-slate-300 font-bold ml-4">{s.time}</span>
                      </div>
                   </div>
                 ))}
              </div>
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6 animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b pb-6">
                <div className="flex gap-4 w-full md:w-auto">
                   <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Từ ngày</label>
                      <input type="date" className="w-full p-2 border rounded-lg outline-none bg-slate-50" value={historyFrom} onChange={e => setHistoryFrom(e.target.value)} />
                   </div>
                   <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Đến ngày</label>
                      <input type="date" className="w-full p-2 border rounded-lg outline-none bg-slate-50" value={historyTo} onChange={e => setHistoryTo(e.target.value)} />
                   </div>
                </div>
                <button onClick={() => exportTransactionHistory(historyData, 'Lich_su_Xuat')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-100">
                   <FileSpreadsheet size={18}/> Xuất Báo cáo Excel
                </button>
             </div>
             <div className="space-y-4">
                {historyData.map(tx => (
                  <div key={tx.id} className="border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md transition-all">
                     <div className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${tx.type === 'OUTBOUND' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                {tx.type === 'OUTBOUND' ? <Store size={20} /> : <ArrowRightLeft size={20} />}
                            </div>
                            <div className="space-y-1">
                                <div className="font-black text-slate-800">{new Date(tx.date).toLocaleString('vi-VN')}</div>
                                <div className="text-[10px] font-black uppercase text-slate-500">Model: {inventoryService.getProductById(tx.productId)?.model} • Từ: {tx.fromLocation}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right font-black text-xl text-blue-600">-{tx.quantity}</div>
                            {expandedTx === tx.id ? <ChevronUp /> : <ChevronDown />}
                        </div>
                     </div>
                     {expandedTx === tx.id && (
                        <div className="p-6 bg-white border-t border-slate-50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                           {tx.serialNumbers.map(sn => (<div key={sn} className="font-mono text-[10px] p-2 bg-slate-50 rounded-lg text-center border font-bold text-slate-600">{sn}</div>))}
                        </div>
                     )}
                  </div>
                ))}
             </div>
         </div>
      )}
    </div>
  );
};
