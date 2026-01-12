import React, { useState, useEffect } from 'react';
import { Save, X, Activity } from 'lucide-react';
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

  useEffect(() => {
    setLocalStages(stages);
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

  const handleSave = () => {
    onSave(localStages);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            ⚙️ Cấu hình Công Đoạn
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {localStages.map((stage) => (
            <div key={stage.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
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

              {/* Measurement Configuration */}
              <div className="flex-1 border-l pl-4 border-gray-300 flex flex-col justify-center">
                 <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      id={`measure-${stage.id}`}
                      checked={!!stage.enableMeasurement}
                      onChange={() => handleToggleMeasurement(stage.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`measure-${stage.id}`} className="text-sm font-semibold text-gray-700 select-none cursor-pointer flex items-center gap-1">
                       <Activity size={14} /> Ghi giá trị đo?
                    </label>
                 </div>
                 
                 {stage.enableMeasurement && (
                   <input 
                    type="text"
                    value={stage.measurementLabel || ''}
                    onChange={(e) => handleLabelChange(stage.id, e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    placeholder="Tên giá trị (VD: Điện áp, Cân nặng)..."
                   />
                 )}
              </div>
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