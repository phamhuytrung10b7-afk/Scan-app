
import React, { useState, useEffect } from 'react';
import { inventoryService } from './inventoryService';
import { exportSalesOrdersReport } from './reportService';
import { SalesOrder, SalesOrderItem } from './types';
import { ShoppingCart, Plus, Trash2, Save, ArrowLeft, Store, Warehouse, CheckCircle, FileSpreadsheet } from 'lucide-react';

export const SalesOrders: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');

  const [code, setCode] = useState('');
  const [type, setType] = useState<'SALE' | 'TRANSFER'>('SALE');
  const [customerName, setCustomerName] = useState('');
  const [destination, setDestination] = useState('');
  const [items, setItems] = useState<SalesOrderItem[]>([]);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);

  const products = inventoryService.getProducts();
  const customers = inventoryService.getCustomers();
  const warehouses = inventoryService.getWarehouses();

  useEffect(() => {
    setOrders([...inventoryService.getSalesOrders()]);
  }, [viewMode]);

  const handleAddItem = () => {
     if (!selectedProduct || quantity <= 0) return;
     const existing = items.find(i => i.productId === selectedProduct);
     if (existing) {
        setItems(items.map(i => i.productId === selectedProduct ? {...i, quantity: i.quantity + quantity} : i));
     } else {
        setItems([...items, { productId: selectedProduct, quantity, scannedCount: 0 }]);
     }
     setSelectedProduct('');
     setQuantity(1);
  };

  const handleSave = () => {
      if (!code || items.length === 0) return;
      if (type === 'SALE' && !customerName) return;
      if (type === 'TRANSFER' && !destination) return;
      const target = type === 'SALE' ? customerName : destination;
      inventoryService.addSalesOrder(code, target, items, type, type === 'TRANSFER' ? destination : undefined);
      setViewMode('LIST');
      setCode(''); setCustomerName(''); setDestination(''); setItems([]);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("Xóa đơn hàng này?")) {
          inventoryService.deleteSalesOrder(id);
          setOrders([...inventoryService.getSalesOrders()]);
      }
  }

  if (viewMode === 'CREATE') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
         <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ArrowLeft size={24} className="text-slate-600"/></button>
            <h2 className="text-2xl font-bold text-slate-800">Tạo Đơn Hàng / Phiếu Xuất Mới</h2>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div><label className="block text-sm font-bold text-slate-700 mb-2">Mã Đơn / Số Phiếu *</label><input className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-water-400" placeholder="VD: SO-2024-001" value={code} onChange={e => setCode(e.target.value)} /></div>
               <div><label className="block text-sm font-bold text-slate-700 mb-2">Loại giao dịch</label><select className="w-full p-3 border border-slate-300 rounded-lg outline-none" value={type} onChange={(e) => setType(e.target.value as any)}><option value="SALE">Xuất Bán</option><option value="TRANSFER">Điều Chuyển Kho</option></select></div>
            </div>
            {type === 'SALE' ? (
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Khách hàng / Đại lý *</label><select className="w-full p-3 border border-slate-300 rounded-lg outline-none" value={customerName} onChange={e => setCustomerName(e.target.value)}><option value="">-- Chọn Khách hàng --</option>{customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
            ) : (
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Kho đích đến *</label><select className="w-full p-3 border border-slate-300 rounded-lg outline-none" value={destination} onChange={e => setDestination(e.target.value)}><option value="">-- Chọn Kho --</option>{warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}</select></div>
            )}
            <div className="border-t border-slate-100 pt-6">
               <h3 className="font-bold text-slate-800 mb-4">Chi tiết hàng hóa</h3>
               <div className="flex gap-4 mb-4">
                  <select className="flex-1 p-3 border border-slate-300 rounded-lg" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}><option value="">-- Chọn Model --</option>{products.map(p => <option key={p.id} value={p.id}>{p.model} ({p.brand})</option>)}</select>
                  <input type="number" min="1" className="w-24 p-3 border border-slate-300 rounded-lg" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} />
                  <button onClick={handleAddItem} className="bg-slate-800 text-white px-4 rounded-lg hover:bg-slate-700"><Plus /></button>
               </div>
               <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  {items.map((item, idx) => { const p = inventoryService.getProductById(item.productId); return (<div key={idx} className="p-3 flex justify-between items-center border-b border-slate-200 bg-white"> <span className="font-medium text-slate-700">{p?.model}</span> <div className="flex items-center gap-4"> <span className="font-bold text-slate-900">x{item.quantity}</span> <button onClick={() => setItems(items.filter(i => i.productId !== item.productId))} className="text-red-500 hover:bg-red-50 p-1 rounded"> <Trash2 size={16}/> </button> </div> </div>) })}
                  {items.length === 0 && <p className="p-4 text-center text-slate-400 text-sm">Chưa có sản phẩm trong danh sách.</p>}
               </div>
            </div>
            <div className="flex justify-end gap-4 pt-4"><button onClick={() => setViewMode('LIST')} className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button><button onClick={handleSave} disabled={items.length === 0 || !code} className="px-6 py-3 bg-water-600 text-white font-bold rounded-lg hover:bg-water-700 flex items-center gap-2 disabled:bg-slate-300"><Save size={18} /> Lưu Đơn Hàng</button></div>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
         <div className="flex items-center gap-3">
             <div className="bg-orange-100 p-3 rounded-full text-orange-600"><ShoppingCart /></div>
             <div><h2 className="text-2xl font-bold text-slate-800">Quản lý Đơn hàng</h2><p className="text-slate-500 text-sm">Quản lý các phiếu xuất kho đang chờ xử lý.</p></div>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => exportSalesOrdersReport(orders)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm"><FileSpreadsheet size={20} className="text-green-600"/> Xuất Excel</button>
            <button onClick={() => setViewMode('CREATE')} className="bg-water-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-water-700 flex items-center gap-2"><Plus size={20}/> Tạo Đơn Mới</button>
         </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
         {orders.map(order => (
            <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
               <div className="flex gap-4">
                  <div className={`p-3 rounded-lg h-fit ${order.type === 'SALE' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{order.type === 'SALE' ? <Store /> : <Warehouse />}</div>
                  <div>
                     <div className="flex items-center gap-3"><h4 className="font-bold text-lg text-slate-800">{order.code}</h4><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status === 'COMPLETED' ? 'HOÀN THÀNH' : 'ĐANG XỬ LÝ'}</span></div>
                     <p className="text-slate-600 text-sm mt-1 font-medium">{order.customerName || order.destinationWarehouse}</p>
                     <p className="text-xs text-slate-400 mt-1">{new Date(order.createdDate).toLocaleString('vi-VN')}</p>
                  </div>
               </div>
               <div className="text-right">
                   <div className="flex flex-col gap-1">
                      {order.items.map((item, idx) => { const p = inventoryService.getProductById(item.productId); return (<div key={idx} className="w-48 text-[11px] flex justify-between text-slate-600"><span>{p?.model}</span><span className="font-bold">x{item.quantity}</span></div>) })}
                   </div>
                   <button onClick={() => handleDelete(order.id)} className="text-red-400 text-xs hover:text-red-600 mt-4 font-bold">Hủy đơn</button>
               </div>
            </div>
         ))}
         {orders.length === 0 && <div className="p-16 text-center text-slate-400">Danh sách đơn hàng trống.</div>}
      </div>
    </div>
  );
};
