
import React, { useState } from 'react';
import { NAV_ITEMS } from './constants';
import { 
  LayoutDashboard, 
  Download, 
  Upload, 
  Package, 
  Search, 
  Settings,
  Menu,
  X,
  Droplets,
  ClipboardCheck,
  Database,
  CloudCheck
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const IconMap: Record<string, React.FC<any>> = {
  LayoutDashboard,
  Download,
  Upload,
  Package,
  Search,
  Settings,
  ClipboardCheck
};

export const Layout: React.FC<LayoutProps> = ({ children, currentPath, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-water-900 text-white p-4 flex justify-between items-center shadow-md z-20 sticky top-0">
        <div className="flex items-center gap-2">
           <Droplets className="h-6 w-6 text-water-400" />
           <span className="font-bold text-lg uppercase tracking-tight">RO-Master</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:sticky md:top-0 h-screen w-64 bg-water-900 text-white shadow-xl z-10 transition-transform duration-300
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col
        `}
      >
        <div className="p-6 border-b border-water-800 flex items-center gap-3">
          <div className="bg-water-500 p-2 rounded-lg">
             <Droplets className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl uppercase tracking-tighter">RO-Master</h1>
            <p className="text-water-300 text-[10px] font-black uppercase tracking-widest">Enterprise WMS</p>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = IconMap[item.icon];
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-water-600 text-white shadow-lg shadow-water-900/50 border-r-4 border-water-400 scale-105' 
                    : 'text-water-100 hover:bg-water-800 hover:text-white'
                  }
                `}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-water-400'} />
                <span className="font-bold text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-water-800 bg-water-950/50 space-y-4">
           <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[10px] font-black text-water-300 uppercase tracking-widest">Database Sync: OK</span>
              </div>
              <Database size={14} className="text-water-500" />
           </div>
           
           <div className="flex items-center gap-3 bg-water-900 p-3 rounded-xl border border-water-800">
             <div className="h-10 w-10 rounded-full bg-water-600 flex items-center justify-center text-sm font-black border-2 border-water-400 shadow-md">
               QT
             </div>
             <div className="text-sm">
               <p className="font-black text-white">Administrator</p>
               <p className="text-water-400 text-[10px] uppercase font-bold tracking-tighter">Hệ thống Đã Lưu</p>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-slate-50 custom-scrollbar">
        <div className="max-w-7xl mx-auto pb-12">
          {children}
        </div>
      </main>
    </div>
  );
};
