
import React, { useState } from 'react';
import { inventoryService } from './inventoryService';
import { exportFullDatabase } from './reportService';
import { Product, Warehouse, Customer } from './types';
import { Settings as SettingsIcon, Box, Warehouse as WarehouseIcon, Users, Plus, Trash2, Database, Download, RefreshCw, AlertTriangle, Edit, X, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const [products, setProducts] = useState(inventoryService.getProducts());
  const [warehouses, setWarehouses] = useState(inventoryService.getWarehouses());
  const [customers, setCustomers] = useState(inventoryService.getCustomers());
  
  // States cho Form
  const [newP, setNewP] = useState({ model: '', brand: '', specs: '' });
  const [newW, setNewW] = useState({ name: '', address: '', maxCapacity: 100 });
  const [newC, setNewC] = useState({ name: '', phone: '', type: 'DEALER' as 'DEALER' | 'RETAIL' });

  // States quản lý ID đang chỉnh sửa
  const [editingPId, setEditingPId] = useState<string | null>(null);
  const [editingWId, setEditingWId] = useState<string | null>(null);
  const [editingCId, setEditingCId] = useState<string | null>(null);

  const refresh = () => { 
    setProducts([...inventoryService.getProducts()]); 
    setWarehouses([...inventoryService.getWarehouses()]); 
    setCustomers([...inventoryService.getCustomers()]); 
  };

  // Handlers cho Sản phẩm
  const handleProductSubmit = () => {
    if (!newP.model || !newP.brand) return;
    if (editingPId) {
      inventoryService.updateProduct(editingPId, newP);
      setEditingPId(null);
    } else {
      inventoryService.addProduct({ id: `p-${Date.now()}`, ...newP });
    }
    setNewP({ model: '', brand: '', specs: '' });
    refresh();
  };

  // Handlers cho Kho hàng
  const handleWarehouseSubmit = () => {
    if (!newW.name) return;
    if (editingWId) {
      inventoryService.updateWarehouse(editingWId, newW);
      setEditingWId(null);
    } else {
      inventoryService.addWarehouse({ id: `w-${Date.now()}`, ...newW });
    }
    setNewW({ name: '', address: '', maxCapacity: 100 });
    refresh();
  };

  // Handlers cho Đối tác
  const handleCustomerSubmit = () => {
    if (!newC.name) return;
    if (editingCId) {
      inventoryService.updateCustomer(editingCId, newC);
      setEditingCId(null);
    } else {
      inventoryService.addCustomer({ id: `c-${Date.now()}`, ...newC });
    }
    setNewC({ name: '', phone: '', type: 'DEALER' });
    refresh();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-3">
         <div className="bg-slate-800 text-white p-2 rounded-lg"><SettingsIcon size={24} /></div>
         <h2 className="text-2xl font-bold text-slate-800">Cấu hình Hệ thống</h2>
      </div>

      <div className="bg-white p-6 rounded-xl border flex justify-between items-center shadow-sm">
         <div>
            <h3 className="font-bold text-slate-800">Sao lưu & Báo cáo</h3>
            <p className="text-sm text-slate-500">Tải toàn bộ dữ liệu máy chủ về máy tính (.xlsx).</p>
         </div>
         <button onClick={exportFullDatabase} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100">
            <Download size={20}/> Tải FULL Excel
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Model Section */}
         <div className={`bg-white p-6 rounded-xl border space-y-4 shadow-sm transition-all ${editingPId ? 'ring-2 ring-water-500 bg-water-50/30' : ''}`}>
            <h4 className="font-bold border-b pb-2 flex items-center gap-2 text-slate-700">
                <Box size={18} className="text-water-600"/> {editingPId ? 'Sửa Model' : 'Thêm Model'}
            </h4>
            <div className="space-y-3">
                <input className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-water-400 bg-white" placeholder="Tên Model" value={newP.model} onChange={e => setNewP({...newP, model: e.target.value})} />
                <input className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-water-400 bg-white" placeholder="Thương hiệu" value={newP.brand} onChange={e => setNewP({...newP, brand: e.target.value})} />
            </div>
            <div className="flex gap-2">
                <button onClick={handleProductSubmit} className={`flex-1 py-2.5 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${editingPId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    {editingPId ? <Save size={18}/> : <Plus size={18}/>}
                    {editingPId ? 'Cập nhật' : 'Thêm Model'}
                </button>
                {editingPId && (
                    <button onClick={() => { setEditingPId(null); setNewP({model:'', brand:'', specs:''}); }} className="p-2.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                        <X size={20}/>
                    </button>
                )}
            </div>
            <div className="space-y-2 mt-4 max-h-60 overflow-y-auto custom-scrollbar pr-1">
               {products.map(p => (
                <div key={p.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-water-200 group">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{p.model}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{p.brand}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingPId(p.id); setNewP({ model: p.model, brand: p.brand, specs: p.specs }); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit size={14}/></button>
                        <button onClick={() => { if(confirm('Xóa model này?')) { inventoryService.deleteProduct(p.id); refresh(); } }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                    </div>
                </div>
               ))}
            </div>
         </div>

         {/* Warehouse Section */}
         <div className={`bg-white p-6 rounded-xl border space-y-4 shadow-sm transition-all ${editingWId ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}>
            <h4 className="font-bold border-b pb-2 flex items-center gap-2 text-slate-700">
                <WarehouseIcon size={18} className="text-blue-600"/> {editingWId ? 'Sửa Kho' : 'Cấu hình Kho'}
            </h4>
            <div className="space-y-3">
                <input className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-white" placeholder="Tên Kho" value={newW.name} onChange={e => setNewW({...newW, name: e.target.value})} />
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Sức chứa tối đa (máy)</label>
                  <input type="number" className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-white" value={newW.maxCapacity} onChange={e => setNewW({...newW, maxCapacity: parseInt(e.target.value) || 0})} />
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={handleWarehouseSubmit} className={`flex-1 py-2.5 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${editingWId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {editingWId ? <Save size={18}/> : <Plus size={18}/>}
                    {editingWId ? 'Cập nhật' : 'Thêm Kho'}
                </button>
                {editingWId && (
                    <button onClick={() => { setEditingWId(null); setNewW({name:'', address:'', maxCapacity: 100}); }} className="p-2.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                        <X size={20}/>
                    </button>
                )}
            </div>
            <div className="space-y-2 mt-4 max-h-60 overflow-y-auto custom-scrollbar pr-1">
               {warehouses.map(w => (
                <div key={w.id} className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100 mb-2 group">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{w.name}</span>
                        <span className="text-[10px] text-blue-600 font-bold uppercase">Sức chứa: {w.maxCapacity || '∞'} máy</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingWId(w.id); setNewW({ name: w.name, address: w.address || '', maxCapacity: w.maxCapacity || 100 }); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit size={14}/></button>
                        <button onClick={() => { if(confirm('Xóa kho này?')) { inventoryService.deleteWarehouse(w.id); refresh(); } }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
               ))}
            </div>
         </div>

         {/* Customer Section */}
         <div className={`bg-white p-6 rounded-xl border space-y-4 shadow-sm transition-all ${editingCId ? 'ring-2 ring-orange-500 bg-orange-50/30' : ''}`}>
            <h4 className="font-bold border-b pb-2 flex items-center gap-2 text-slate-700">
                <Users size={18} className="text-orange-600"/> {editingCId ? 'Sửa Đối tác' : 'Thêm Đối tác'}
            </h4>
            <div className="space-y-3">
                <input className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-400 bg-white" placeholder="Tên Đối tác" value={newC.name} onChange={e => setNewC({...newC, name: e.target.value})} />
                <select className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-400 bg-white" value={newC.type} onChange={e => setNewC({...newC, type: e.target.value as any})}>
                    <option value="DEALER">Đại lý</option>
                    <option value="RETAIL">Khách lẻ</option>
                </select>
            </div>
            <div className="flex gap-2">
                <button onClick={handleCustomerSubmit} className={`flex-1 py-2.5 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${editingCId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                    {editingCId ? <Save size={18}/> : <Plus size={18}/>}
                    {editingCId ? 'Cập nhật' : 'Thêm Đối tác'}
                </button>
                {editingCId && (
                    <button onClick={() => { setEditingCId(null); setNewC({name:'', phone:'', type:'DEALER'}); }} className="p-2.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                        <X size={20}/>
                    </button>
                )}
            </div>
            <div className="space-y-2 mt-4 max-h-60 overflow-y-auto custom-scrollbar pr-1">
               {customers.map(c => (
                <div key={c.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-orange-200 group">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{c.name}</span>
                        <span className={`text-[10px] font-bold ${c.type === 'DEALER' ? 'text-orange-600' : 'text-green-600'}`}>
                            {c.type === 'DEALER' ? 'ĐẠI LÝ' : 'KHÁCH LẺ'}
                        </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingCId(c.id); setNewC({ name: c.name, phone: c.phone || '', type: c.type }); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit size={14}/></button>
                        <button onClick={() => { if(confirm('Xóa đối tác này?')) { inventoryService.deleteCustomer(c.id); refresh(); } }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                    </div>
                </div>
               ))}
            </div>
         </div>
      </div>

      <div className="bg-red-50 p-8 rounded-2xl border border-red-100 shadow-sm">
         <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-2 rounded-lg text-red-600"><AlertTriangle size={24}/></div>
            <h3 className="font-bold text-red-800 text-lg uppercase tracking-wider">Khu vực nguy hiểm</h3>
         </div>
         <p className="text-sm text-red-600 mb-6 font-medium">Xóa toàn bộ dữ liệu (Model, Kho, IMEI, Lịch sử) và reset hệ thống về trạng thái ban đầu. Thao tác này không thể khôi phục.</p>
         <button onClick={() => { if(confirm('Bấm OK để xóa sạch dữ liệu và khởi động lại hệ thống?')) inventoryService.resetDatabase(); }} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95">
            <RefreshCw size={20}/> Reset Toàn bộ Database
         </button>
      </div>
    </div>
  );
};
