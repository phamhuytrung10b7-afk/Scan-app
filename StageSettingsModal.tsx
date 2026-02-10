import React, { useState, useEffect } from 'react';
import { Save, X, Activity, ListPlus, CheckSquare } from 'lucide-react';
import { Button } from './Button';
import { Stage } from './types';

interface StageSettingsModalProps {
  isOpen: boolean;
  stages: Stage[];
  onSave: (newStages: Stage[]) => void;
  onClose: () => void;
}

export const StageSettingsModal: React.FC<StageSettingsModalProps> = ({ isOpen, stages, onSave, onClose }) => {
  const [localStages, setLocalStages] = useState<Stage[]>(stages);

  // Helper to ensure array is size 8
  const ensureSize8 = (arr?: string[]) => {
    const newArr = arr ? [...arr] : [];
    while (newArr.length < 8) newArr.push("");
    return newArr.slice(0, 8);
  };

  useEffect(() => {
    // Ensure compatibility with data structure
    const sanitizedStages = stages.map(s => ({
      ...s,
      additionalFieldLabels: ensureSize8(s.additionalFieldLabels),
      additionalFieldDefaults: ensureSize8(s.additionalFieldDefaults)
    }));
    setLocalStages(sanitizedStages);
  }, [stages, isOpen]);

  const handleNameChange = (id: number, newName: string) => {
    setLocalStages(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const handleToggleMeasurement = (id: number) => {
    setLocalStages(prev => prev.map(s => s.id === id ? { ...s, enableMeasurement: !s.enableMeasurement } : s));
  };

  const handleLabelChange = (id: number, newLabel: string) => {
    setLocalStages(prev => prev.map(s => s.id === id ? { ...s, measurementLabel: newLabel } : s));
  };

  const handleStandardChange = (id: number, newVal: string) => {
    setLocalStages(prev => prev.map(s => s.id === id ? { ...s, measurementStandard: newVal } : s));
  };

  const handleAdditionalFieldConfig = (stageId: number, fieldIndex: number, type: 'label' | 'default', value: string) => {
    setLocalStages(prev => prev.map(s => {
      if (s.id !== stageId) return s;
      
      const newLabels = ensureSize8(s.additionalFieldLabels);
      const newDefaults = ensureSize8(s.additionalFieldDefaults);

      if (type === 'label') newLabels[fieldIndex] = value;
      if (type === 'default') newDefaults[fieldIndex] = value;

      return { ...s, additionalFieldLabels: newLabels, additionalFieldDefaults: newDefaults };
    }));
  };

  const handleSave = () => {
    onSave(localStages);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            ⚙️ Cấu hình Công Đoạn
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          {localStages.map((stage) => (
            <div key={stage.id} className="p-5 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                {/* ID Badge */}
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
                  {stage.id}
                </div>

                {/* Stage Name Input */}
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Tên công đoạn
                  </label>
                  <input 
                    type="text"
                    value={stage.name}
                    onChange={(e) => handleNameChange(stage.id, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={`Tên công đoạn ${stage.id}...`}
                  />
                </div>

                {/* Measurement Toggle */}
                <div className="flex items-center gap-2 mt-5 md:mt-0">
                    <input 
                      type="checkbox" 
                      id={`measure-${stage.id}`}
                      checked={!!stage.enableMeasurement}
                      onChange={() => handleToggleMeasurement(stage.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`measure-${stage.id}`} className="text-sm font-bold text-gray-700 select-none cursor-pointer flex items-center gap-1">
                       <Activity size={16} /> Kích hoạt Test?
                    </label>
                 </div>
              </div>

              {/* Measurement Configuration Section */}
              {stage.enableMeasurement && (
                <div className="mt-4 pl-0 md:pl-14 md:border-l-2 border-blue-200 md:ml-5 animate-in slide-in-from-top-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Main Measurement Label */}
                      <div className="bg-white p-3 rounded border border-blue-200 flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">
                            1. Tên Kết quả chính (Bắt buộc)
                          </label>
                          <input 
                            type="text"
                            value={stage.measurementLabel || ''}
                            onChange={(e) => handleLabelChange(stage.id, e.target.value)}
                            className="w-full p-2 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="VD: Kết quả Test..."
                          />
                        </div>

                        {/* Measurement Standard Value */}
                        <div className="relative">
                          <label className="block text-xs font-bold text-green-700 uppercase mb-1 flex items-center gap-1">
                            <CheckSquare size={14}/> Giá trị Tiêu Chuẩn
                          </label>
                          <input 
                            type="text"
                            value={stage.measurementStandard || ''}
                            onChange={(e) => handleStandardChange(stage.id, e.target.value)}
                            className="w-full p-2 text-sm border-2 border-green-200 bg-green-50 rounded focus:ring-2 focus:ring-green-500 outline-none placeholder-green-300"
                            placeholder="VD: PASS (chữ) hoặc 10.5 (số)..."
                          />
                          <p className="text-[10px] text-gray-500 mt-1 font-medium">
                            * Nếu là <b>Chữ</b>: Phải khớp chính xác (VD: PASS).<br/>
                            * Nếu là <b>Số</b>: Kết quả đo phải <b>NHỎ HƠN</b> giá trị này (Max Limit).
                          </p>
                        </div>
                      </div>

                      {/* 8 Additional Fields */}
                      <div className="md:col-span-2 lg:col-span-1">
                         <label className="block text-xs font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                           <ListPlus size={16}/> 2. Cấu hình 8 thông số mở rộng
                         </label>
                         
                         <div className="grid grid-cols-2 gap-3">
                            {/* Loop 8 times */}
                            {Array.from({ length: 8 }).map((_, idx) => (
                              <div key={idx} className="bg-white p-2 rounded border border-gray-300 flex flex-col gap-2 relative">
                                <span className="absolute -top-2 -left-2 bg-gray-200 text-gray-600 text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                                  {idx + 1}
                                </span>
                                <div>
                                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Tên thông số</label>
                                  <input
                                    type="text"
                                    value={stage.additionalFieldLabels?.[idx] || ""}
                                    onChange={(e) => handleAdditionalFieldConfig(stage.id, idx, 'label', e.target.value)}
                                    className="w-full p-1.5 text-xs border border-gray-200 rounded focus:border-blue-500 focus:outline-none"
                                    placeholder="Tắt..."
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-green-600 uppercase">Mặc định</label>
                                  <input
                                    type="text"
                                    value={stage.additionalFieldDefaults?.[idx] || ""}
                                    onChange={(e) => handleAdditionalFieldConfig(stage.id, idx, 'default', e.target.value)}
                                    className="w-full p-1.5 text-xs border border-green-200 bg-green-50 rounded focus:border-green-500 focus:outline-none placeholder-green-200"
                                    placeholder="Auto..."
                                  />
                                </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button variant="primary" onClick={handleSave} className="flex items-center gap-2">
            <Save size={18} /> Lưu Thay Đổi
          </Button>
        </div>
      </div>
    </div>
  );
};