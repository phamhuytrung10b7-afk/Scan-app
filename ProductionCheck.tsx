

import React, { useState, useEffect, useRef } from 'react';
import { inventoryService } from './inventoryService';
import { exportPlanDetail } from './reportService';
import { SerialUnit, ProductionPlan } from './types';
// Added missing Save icon import to resolve "Cannot find name 'Save'" error
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Plus, Trash2, Calendar, FileText, ArrowLeft, LayoutList, Edit3, FileSpreadsheet, Search, ArrowRight, X, Edit, Save } from 'lucide-react';
import { read, utils } from 'xlsx';
import { playSound } from './sound';

interface CheckResult {
  serial: string;
  found: boolean;
  unit?: SerialUnit;
}

type ViewMode = 'LIST' | 'CREATE' | 'CHECK' | 'EDIT';

export const ProductionCheck: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [scannedList, setScannedList] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<CheckResult[]>([]);

  useEffect(() => {
    setPlans(inventoryService.getProductionPlans());
  }, [viewMode]);

  useEffect(() => {
    if ((viewMode === 'CREATE' || viewMode === 'EDIT') && inputRef.current && editingIndex === null) {
      inputRef.current.focus();
    }
  }, [viewMode, scannedList, editingIndex]);

  useEffect(() => {
    if (scanError) {
      const timer = setTimeout(() => setScanError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanError]);

  const handleSavePlan = () => {
    if (!formName || !formProductId || scannedList.length === 0) return;
    // Fix: Explicitly type uniqueSerials as string[] to resolve 'unknown[]' inference error on line 50 and 52
    const uniqueSerials: string[] = Array.from(new Set(scannedList));
    if (viewMode === 'EDIT' && selectedPlan) {
      // Fix: Passed correctly typed string[] to updateProductionPlan (Line 50)
      inventoryService.updateProductionPlan(selectedPlan.id, formName, formProductId, uniqueSerials);
    } else {
      // Fix: Passed correctly typed string[] to addProductionPlan (Line 52)
      inventoryService.addProductionPlan(formName, formProductId, uniqueSerials);
    }
    setViewMode('LIST');
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormProductId('');
    setScannedList([]);
    setCurrentInput('');
    setEditingIndex(null);
  };

  const handleEditPlan = (plan: ProductionPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPlan(plan);
    setFormName(plan.name);
    setFormProductId(plan.productId);
    setScannedList([...plan.serials]);
    setViewMode('EDIT');
  };

  const handleSelectPlan = (plan: ProductionPlan) => {
    setSelectedPlan(plan);
    setResults(plan.serials.map(serial => ({ 
      serial, 
      found: !!inventoryService.getUnitBySerial(serial), 
      unit: inventoryService.getUnitBySerial(serial) 
    })));
    setViewMode('CHECK');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const data = await file.arrayBuffer();
        const workbook = read(data);
        const jsonData = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[][];
        const newSerials: string[] = [];
        jsonData.forEach(row => { 
          if (row[0]) { 
            const val = String(row[0]).trim(); 
            if (val && !scannedList.includes(val)) newSerials.push(val); 
          } 
        });
        setScannedList([...newSerials, ...scannedList]);
        playSound('success');
    } catch (e) { playSound('error'); }
  };

  const startEditSerial = (index: number) => {
    setEditingIndex(index);
    setEditValue(scannedList[index]);
  };

  const saveEditSerial = () => {
    if (editingIndex === null || !editValue.trim()) return;
    const newList = [...scannedList];
    newList[editingIndex] = editValue.trim();
    setScannedList(newList);
    setEditingIndex(null);
    setEditValue('');
    playSound('success');
  };

  if (viewMode === 'CREATE' || viewMode === 'EDIT') {
    const products = inventoryService.getProducts();
    return (
      <div className="max-w-6xl mx-auto space-y-6">
         <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={24}/>
            </button>
            <h2 className="text-2xl font-bold text-slate-800">
              {viewMode === 'EDIT' ? 'Chỉnh sửa Lô SX' : 'Tạo Kế hoạch SX mới'}
            </h2>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">1. Thông tin lô</h3>
                    <input className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-water-500" placeholder="Tên Lô sản xuất *" value={formName} onChange={e => setFormName(e.target.value)} />
                    <select className="w-full p-3 border rounded-lg outline-none bg-white" value={formProductId} onChange={e => setFormProductId(e.target.value)}>
                        <option value="">-- Chọn Model áp dụng --</option>
                        {products.map(p => (<option key={p.id} value={p.id}>{p.model} ({p.brand})</option>))}
                    </select>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 h-[500px] flex flex-col shadow-sm">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">2. Quét / Nhập mã</h3>
                    <form onSubmit={e => { 
                      e.preventDefault(); 
                      const val = currentInput.trim();
                      if (val) { 
                        if (scannedList.includes(val)) {
                          playSound('warning');
                          setScanError(`Mã "${val}" đã có trong danh sách!`);
                          setCurrentInput(''); 
                        } else {
                          setScannedList([val, ...scannedList]); 
                          setCurrentInput(''); 
                          setScanError(null);
                          playSound('success'); 
                        }
                      } 
                    }} className="relative mb-4">
                         <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                         <input 
                           ref={inputRef} 
                           className={`w-full pl-10 p-3 border rounded-lg font-mono outline-none focus:ring-2 transition-all ${scanError ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'focus:ring-water-500'}`} 
                           placeholder="Quét Serial máy..." 
                           value={currentInput} 
                           onChange={e => {
                             setCurrentInput(e.target.value);
                             if (scanError) setScanError(null);
                           }} 
                         />
                         {scanError && (
                           <div className="absolute -bottom-6 left-0 text-[10px] font-bold text-red-500 flex items-center gap-1 animate-pulse">
                             <AlertTriangle size={10} /> {scanError}
                           </div>
                         )}
                    </form>
                    
                    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-lg p-2 mb-4 space-y-1 custom-scrollbar">
                         {scannedList.map((sn, i) => (
                           <div key={i} className={`flex justify-between items-center p-2 bg-white border rounded shadow-sm font-mono text-sm transition-all ${editingIndex === i ? 'ring-2 ring-water-500' : ''}`}>
                              {editingIndex === i ? (
                                <input 
                                  className="flex-1 outline-none px-1" 
                                  value={editValue} 
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && saveEditSerial()}
                                  autoFocus
                                />
                              ) : (
                                <span className="truncate mr-2">{sn}</span>
                              )}
                              
                              <div className="flex items-center gap-1">
                                {editingIndex === i ? (
                                  <button onClick={saveEditSerial} className="text-green-600 p-1 hover:bg-green-50 rounded"><CheckCircle size={16}/></button>
                                ) : (
                                  <button onClick={() => startEditSerial(i)} className="text-slate-400 p-1 hover:bg-slate-100 rounded"><Edit size={14}/></button>
                                )}
                                <button onClick={() => setScannedList(scannedList.filter((_, idx) => idx !== i))} className="text-slate-400 p-1 hover:bg-red-50 hover:text-red-500 rounded"><Trash2 size={14}/></button>
                              </div>
                           </div>
                         ))}
                         {scannedList.length === 0 && <div className="text-center text-slate-400 text-xs py-10 italic">Chưa có mã nào được quét</div>}
                    </div>

                    <div className="space-y-3">
                      <button onClick={() => fileInputRef.current?.click()} className="w-full text-xs text-blue-600 hover:bg-blue-50 py-2 rounded border border-dashed border-blue-200 flex items-center justify-center gap-2">
                        <FileSpreadsheet size={14}/> Import từ Excel (.xlsx)
                      </button>
                      <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                      <button 
                        onClick={handleSavePlan} 
                        disabled={!formName || !formProductId || scannedList.length === 0}
                        className="w-full bg-water-600 text-white py-3 rounded-lg font-bold hover:bg-water-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={18}/> Lưu Kế hoạch ({scannedList.length})
                      </button>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8 flex flex-col h-[680px]">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutList size={18}/> Xem trước danh sách ({scannedList.length})</h3>
                      <button onClick={() => { if(confirm('Xóa sạch danh sách hiện tại?')) setScannedList([]); }} className="text-xs text-red-500 hover:underline font-bold" disabled={scannedList.length === 0}>Xóa tất cả</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {scannedList.map((sn, i) => (
                                <div key={i} className="group p-3 border rounded-lg bg-white hover:border-water-300 transition-all flex justify-between items-center shadow-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <span className="text-[10px] text-slate-400 font-bold w-4">{(i + 1)}</span>
                                      <span className="font-mono text-sm text-slate-700 font-bold truncate">{sn}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => startEditSerial(i)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md" title="Sửa mã"><Edit size={14}/></button>
                                       <button onClick={() => setScannedList(scannedList.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md" title="Xóa mã"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                            {scannedList.length === 0 && (
                              <div className="col-span-full py-20 text-center text-slate-300 flex flex-col items-center">
                                <Search size={48} className="mb-2 opacity-20"/>
                                <p className="font-medium">Chưa có mã Serial nào</p>
                              </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </div>
    );
  }

  if (viewMode === 'CHECK' && selectedPlan) {
    const total = results.length;
    const found = results.filter(r => r.found).length;
    return (
      <div className="max-w-6xl mx-auto space-y-6">
         <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={24}/></button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedPlan.name}</h2>
                <p className="text-sm text-slate-500">{inventoryService.getProductById(selectedPlan.productId)?.model}</p>
              </div>
            </div>
            <button onClick={() => exportPlanDetail(selectedPlan)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700"><FileSpreadsheet size={18} /> Xuất Excel</button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 border rounded-xl shadow-sm text-center">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Tổng kế hoạch</p>
                <p className="text-3xl font-bold text-slate-800">{total}</p>
             </div>
             <div className="bg-green-50 p-6 border border-green-100 rounded-xl shadow-sm text-center">
                <p className="text-xs text-green-600 font-bold uppercase mb-1">Đã nhập kho</p>
                <p className="text-3xl font-bold text-green-700">{found}</p>
             </div>
             <div className="bg-red-50 p-6 border border-red-100 rounded-xl shadow-sm text-center">
                <p className="text-xs text-red-600 font-bold uppercase mb-1">Chưa xong</p>
                <p className="text-3xl font-bold text-red-700">{total - found}</p>
             </div>
         </div>

         <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
             <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><CheckCircle className="text-green-500"/> Đối chiếu chi tiết</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                 {results.map(r => (
                   <div key={r.serial} className={`p-3 border rounded-lg font-mono text-sm flex justify-between items-center ${r.found ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <span className="font-bold truncate">{r.serial}</span>
                      {r.found ? <CheckCircle size={14} className="text-green-600"/> : <XCircle size={14} className="text-red-400"/>}
                   </div>
                 ))}
             </div>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
         <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
               <ClipboardCheck size={24}/>
            </div>
            <div>
               <h2 className="text-2xl font-bold text-slate-800">Đối chiếu Sản xuất</h2>
               <p className="text-slate-500 text-sm">Quản lý lô ban hành và kiểm tra tiến độ nhập kho.</p>
            </div>
         </div>
         <button onClick={() => { resetForm(); setViewMode('CREATE'); }} className="bg-water-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-water-700 shadow-lg shadow-water-100 flex items-center gap-2"><Plus size={20} /> Tạo Lô Mới</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
         {plans.map(p => {
            const product = inventoryService.getProductById(p.productId);
            return (
              <div 
                key={p.id} 
                className="p-6 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors group" 
                onClick={() => handleSelectPlan(p)}
              >
                 <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg text-slate-500 group-hover:bg-water-100 group-hover:text-water-600 transition-colors">
                       <FileText size={24}/>
                    </div>
                    <div>
                       <div className="font-bold text-slate-800 text-lg group-hover:text-water-700">{p.name}</div>
                       <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                          <span className="font-bold text-slate-700">{product?.model}</span>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(p.createdDate).toLocaleDateString('vi-VN')}</span>
                          <span className="text-slate-300">|</span>
                          <span className="font-bold text-water-600">{p.serials.length} máy</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button 
                      onClick={e => handleEditPlan(p, e)} 
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Chỉnh sửa danh sách"
                    >
                      <Edit3 size={18}/>
                    </button>
                    <button 
                      onClick={e => { 
                        e.stopPropagation(); 
                        if(confirm('Xóa vĩnh viễn kế hoạch này?')) { 
                          inventoryService.deleteProductionPlan(p.id); 
                          setPlans(inventoryService.getProductionPlans()); 
                        } 
                      }} 
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Xóa kế hoạch"
                    >
                      <Trash2 size={18}/>
                    </button>
                    <ArrowRight className="text-slate-300 group-hover:translate-x-1 group-hover:text-water-500 transition-all ml-2" />
                 </div>
              </div>
            );
         })}
         {plans.length === 0 && (
           <div className="p-20 text-center text-slate-400 flex flex-col items-center">
              <ClipboardCheck size={64} className="mb-4 opacity-10"/>
              <p className="font-bold">Chưa có kế hoạch sản xuất nào</p>
              <p className="text-sm">Bấm "Tạo Lô Mới" để bắt đầu theo dõi lô hàng ban hành.</p>
           </div>
         )}
      </div>
    </div>
  );
};
