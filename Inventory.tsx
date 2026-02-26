
import React, { useState, useMemo } from 'react';
import { inventoryService } from './inventoryService';
import { exportExcelReport } from './reportService';
import { UnitStatus, SerialUnit } from './types';
import { FileSpreadsheet, Warehouse as WarehouseIcon, Package, Info, CheckCircle, BarChart3, ChevronRight, Hash, RefreshCcw, Plus, Edit, Trash2, X, Save, AlertTriangle } from 'lucide-react';
import { playSound } from './sound';

export const Inventory: React.FC = () => {
  const warehouses = inventoryService.getWarehouses();
  const products = inventoryService.getProducts();
  const [allUnits, setAllUnits] = useState(inventoryService.getUnits());

  const [selectedWhName, setSelectedWhName] = useState<string>('');
  
  // UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<SerialUnit | null>(null);
  const [newUnitData, setNewUnitData] = useState({ productId: '', serial: '', warehouse: '' });
  const [editUnitData, setEditUnitData] = useState({ serial: '', warehouse: '' });
  const [error, setError] = useState<string | null>(null);

  const refreshData = () => {
    setAllUnits(inventoryService.getUnits());
  };

  const handleDeleteUnit = (serial: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa mã IMEI ${serial} khỏi hệ thống?`)) {
      inventoryService.deleteUnit(serial);
      playSound('success');
      refreshData();
    }
  };

  const handleAddUnit = () => {
    try {
      if (!newUnitData.productId || !newUnitData.serial || !newUnitData.warehouse) {
        setError('Vui lòng điền đầy đủ thông tin.');
        return;
      }
      inventoryService.addUnitManual(newUnitData.productId, newUnitData.serial, newUnitData.warehouse);
      playSound('success');
      setIsAddModalOpen(false);
      setNewUnitData({ productId: '', serial: '', warehouse: '' });
      setError(null);
      refreshData();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const handleEditUnit = () => {
    if (!editingUnit) return;
    try {
      if (!editUnitData.serial || !editUnitData.warehouse) {
        setError('Vui lòng điền đầy đủ thông tin.');
        return;
      }
      
      // Check if new serial already exists (and it's not the same as before)
      if (editUnitData.serial !== editingUnit.serialNumber && inventoryService.getUnitBySerial(editUnitData.serial)) {
        setError(`Mã ${editUnitData.serial} đã tồn tại.`);
        return;
      }

      inventoryService.updateUnit(editingUnit.serialNumber, {
        serialNumber: editUnitData.serial,
        warehouseLocation: editUnitData.warehouse
      });
      
      playSound('success');
      setIsEditModalOpen(false);
      setEditingUnit(null);
      setError(null);
      refreshData();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const openEditModal = (unit: any) => {
    // We need the full unit object, but inventoryData only has serials
    const fullUnit = allUnits.find(u => u.serialNumber === unit.serial);
    if (fullUnit) {
      setEditingUnit(fullUnit);
      setEditUnitData({ serial: fullUnit.serialNumber, warehouse: fullUnit.warehouseLocation });
      setIsEditModalOpen(true);
      setError(null);
    }
  };

  const currentWarehouse = useMemo(() => 
    warehouses.find(w => w.name === selectedWhName),
  [selectedWhName, warehouses]);

  const inventoryData = useMemo(() => {
    if (!selectedWhName) return [];

    return products.map(p => {
      const productUnitsInWh = allUnits.filter(u => 
        u.productId === p.id && u.warehouseLocation === selectedWhName
      );
      
      const inStockUnits = productUnitsInWh.filter(u => u.status === UnitStatus.NEW);
      
      return {
        ...p,
        total: productUnitsInWh.length,
        new: inStockUnits.length,
        sold: productUnitsInWh.filter(u => u.status === UnitStatus.SOLD).length,
        imeis: inStockUnits.map(u => ({ serial: u.serialNumber, isReimported: u.isReimported }))
      };
    }).filter(item => item.total > 0);
  }, [selectedWhName, products, allUnits]);

  const whStats = useMemo(() => {
    if (!selectedWhName) return null;
    const inWh = allUnits.filter(u => u.warehouseLocation === selectedWhName && u.status === UnitStatus.NEW).length;
    const capacity = currentWarehouse?.maxCapacity || 0;
    const percent = capacity > 0 ? Math.round((inWh / capacity) * 100) : 0;
    return { inWh, capacity, percent };
  }, [selectedWhName, allUnits, currentWarehouse]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Trạng thái Tồn kho</h2>
          <p className="text-slate-500">Xem chi tiết hàng hóa và danh sách IMEI theo từng kho.</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => { setIsAddModalOpen(true); setError(null); }}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Plus size={18} /> Nhập thủ công
            </button>
            <button 
              onClick={exportExcelReport}
              className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <FileSpreadsheet size={18} /> Xuất Báo cáo (.xlsx)
            </button>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus className="text-blue-600" size={20} /> Nhập kho thủ công
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertTriangle size={16} /> {error}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Sản phẩm (Model)</label>
                <select 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={newUnitData.productId}
                  onChange={e => setNewUnitData({ ...newUnitData, productId: e.target.value })}
                >
                  <option value="">-- Chọn Model --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.model}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mã IMEI / Serial</label>
                <input 
                  type="text"
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="Nhập mã serial..."
                  value={newUnitData.serial}
                  onChange={e => setNewUnitData({ ...newUnitData, serial: e.target.value.trim() })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kho lưu trữ</label>
                <select 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={newUnitData.warehouse}
                  onChange={e => setNewUnitData({ ...newUnitData, warehouse: e.target.value })}
                >
                  <option value="">-- Chọn Kho --</option>
                  {warehouses.map(wh => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handleAddUnit}
                className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Edit className="text-orange-500" size={20} /> Chỉnh sửa thông tin IMEI
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertTriangle size={16} /> {error}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mã IMEI / Serial</label>
                <input 
                  type="text"
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="Nhập mã serial..."
                  value={editUnitData.serial}
                  onChange={e => setEditUnitData({ ...editUnitData, serial: e.target.value.trim() })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kho lưu trữ</label>
                <select 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={editUnitData.warehouse}
                  onChange={e => setEditUnitData({ ...editUnitData, warehouse: e.target.value })}
                >
                  <option value="">-- Chọn Kho --</option>
                  {warehouses.map(wh => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handleEditUnit}
                className="flex-1 py-3 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-3 min-w-[200px]">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <WarehouseIcon size={24} />
            </div>
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Vui lòng chọn kho</label>
                <select 
                    className="block w-full font-bold text-slate-700 outline-none cursor-pointer bg-transparent"
                    value={selectedWhName}
                    onChange={(e) => setSelectedWhName(e.target.value)}
                >
                    <option value="">-- Chọn Kho hàng --</option>
                    {warehouses.map(wh => (
                        <option key={wh.id} value={wh.name}>{wh.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {whStats && (
            <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-3 gap-4 border-l-0 md:border-l border-slate-100 md:pl-6 pt-4 md:pt-0">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Đang chứa thực tế</span>
                    <span className="text-xl font-bold text-blue-600">{whStats.inWh} <span className="text-sm font-medium text-slate-400">máy</span></span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sức chứa tối đa</span>
                    <span className="text-xl font-bold text-slate-800">{whStats.capacity || '∞'} <span className="text-sm font-medium text-slate-400">máy</span></span>
                </div>
                <div className="col-span-2 md:col-span-1 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ lấp đầy</span>
                        <span className={`text-xs font-bold ${whStats.percent > 90 ? 'text-red-500' : 'text-blue-500'}`}>{whStats.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-700 ${whStats.percent > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${whStats.percent}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {!selectedWhName ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-20 flex flex-col items-center text-center">
            <div className="bg-slate-50 p-6 rounded-full mb-4 text-slate-300">
                <BarChart3 size={48} />
            </div>
            <h3 className="text-xl font-bold text-slate-700">Chưa chọn kho dữ liệu</h3>
            <p className="text-slate-500 max-w-sm mt-2">Vui lòng chọn một kho hàng từ danh sách phía trên để xem báo cáo tồn kho chi tiết.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {inventoryData.map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all flex flex-col gap-6 group">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-50 p-3 rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                    <BarChart3 size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg">{item.model}</h4>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{item.brand}</p>
                                </div>
                            </div>
                            <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md">
                                {item.new} máy sẵn có
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Hàng Mới</span>
                                <span className="text-xl font-black text-green-600">{item.new}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Đã Xuất</span>
                                <span className="text-xl font-black text-slate-700">{item.sold}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Tổng Giao dịch</span>
                                <span className="text-xl font-black text-blue-800">{item.total}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                                <Hash size={14} /> Danh sách IMEI đang tại kho
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
                                {item.imeis.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {item.imeis.map(u => (
                                            <div key={u.serial} className={`group/item relative bg-white border px-3 py-2 rounded-lg flex justify-between items-center font-mono text-[11px] font-bold shadow-sm transition-all hover:shadow-md ${u.isReimported ? 'border-orange-300 text-orange-700' : 'border-slate-200 text-slate-600'}`}>
                                                <div className="flex items-center gap-2">
                                                  {u.serial}
                                                  {u.isReimported && <RefreshCcw size={10} className="text-orange-500"/>}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                  <button 
                                                    onClick={() => openEditModal(u)}
                                                    className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                                    title="Sửa"
                                                  >
                                                    <Edit size={12} />
                                                  </button>
                                                  <button 
                                                    onClick={() => handleDeleteUnit(u.serial)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    title="Xóa"
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-300 italic text-xs">
                                        Không có mã IMEI nào ở trạng thái sẵn sàng.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};
