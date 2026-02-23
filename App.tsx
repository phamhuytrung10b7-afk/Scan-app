/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Stage, Layer, Rect, Text, Arrow, Group, Line, Transformer } from 'react-konva';
import { 
  Factory, 
  Cpu, 
  Package, 
  ArrowRightLeft, 
  Plus, 
  Trash2, 
  Save, 
  Download,
  Settings2,
  AlertCircle,
  FolderOpen,
  FilePlus,
  ChevronDown,
  RotateCw,
  Copy,
  Pencil,
  Check,
  User,
  ChevronLeft,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
export type ElementType = 'machine' | 'workstation' | 'storage' | 'conveyor' | 'area' | 'label' | 'arrow' | 'worker';

export interface LayoutElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  status: 'active' | 'maintenance' | 'idle';
  capacity?: number;
  color: string;
  rotation?: number;
  fontSize?: number;
  showCross?: boolean; // For pallet areas
  isVertical?: boolean;
  task?: string; // For workers
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type?: 'flow' | 'logic';
}

export interface FactoryLayout {
  elements: LayoutElement[];
  connections: Connection[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// --- Constants ---
const INITIAL_LAYOUT: FactoryLayout = {
  elements: [
    // Top Area: RMA / Test
    { id: 'a1', type: 'area', x: 300, y: 210, width: 520, height: 70, name: 'Khu vực RMA / Test', status: 'active', color: '#fff' },
    { id: 'e1', type: 'machine', x: 315, y: 230, width: 100, height: 35, name: 'Line RMA', status: 'active', color: '#fff' },
    { id: 'e2', type: 'storage', x: 455, y: 225, width: 20, height: 20, name: 'Xe đẩy', status: 'active', color: '#fff' },
    { id: 'e3', type: 'storage', x: 455, y: 250, width: 20, height: 20, name: 'Xe đẩy', status: 'active', color: '#fff' },
    { id: 'e4', type: 'machine', x: 485, y: 225, width: 50, height: 40, name: 'Khu vực máy test lạnh', status: 'active', color: '#fff' },
    { id: 'c2', type: 'conveyor', x: 620, y: 240, width: 160, height: 20, name: 'Băng tải 1', status: 'active', color: '#2d5a27' },
    
    // Main Horizontal Line
    { id: 'l2', type: 'label', x: 450, y: 290, width: 200, height: 30, name: 'SHA76222KL', status: 'active', color: '#000', fontSize: 24 },
    { id: 'c1', type: 'conveyor', x: 300, y: 325, width: 510, height: 20, name: 'Line chính nối thêm 2m về phía đóng thùng', status: 'active', color: '#2d5a27' },
    
    // Middle Section: Assembly & Workers
    { id: 'e5', type: 'machine', x: 505, y: 470, width: 35, height: 50, name: 'Bàn assembly', status: 'active', color: '#fff' },
    { id: 'e6', type: 'machine', x: 515, y: 580, width: 40, height: 30, name: 'Kệ để thùng carton', status: 'active', color: '#fff' },
    { id: 'e7', type: 'machine', x: 575, y: 540, width: 40, height: 20, name: 'Kệ để hàng hóa', status: 'active', color: '#fff' },
    
    // Workers
    { id: 'w1', type: 'worker', x: 535, y: 535, width: 40, height: 40, name: 'Nam', status: 'active', color: '#fbbf24', task: 'Gắn vít' },
    { id: 'w2', type: 'worker', x: 590, y: 575, width: 40, height: 40, name: 'Nguyễn Văn A', status: 'active', color: '#fbbf24', task: 'Gắn nút nhấn và bộ gõ' },
    { id: 'w3', type: 'worker', x: 590, y: 495, width: 40, height: 40, name: 'Trần Thị Q', status: 'active', color: '#fbbf24', task: 'Test bộ gõ (L1, Ch)' },
    { id: 'w4', type: 'worker', x: 590, y: 440, width: 40, height: 40, name: 'Mẫn (May)', status: 'active', color: '#fbbf24', task: '' },
    { id: 'w5', type: 'worker', x: 590, y: 385, width: 40, height: 40, name: 'Trần Thị R', status: 'active', color: '#fbbf24', task: 'May bao bì nhựa' },
    
    // Vertical Conveyors
    { id: 'c3', type: 'conveyor', x: 615, y: 375, width: 15, height: 235, name: 'V1', status: 'active', color: '#2d5a27' },
    { id: 'c4', type: 'conveyor', x: 690, y: 375, width: 30, height: 325, name: 'V2', status: 'active', color: '#2d5a27' },
    { id: 'c5', type: 'conveyor', x: 805, y: 375, width: 15, height: 235, name: 'V3', status: 'active', color: '#2d5a27' },
    
    // Left Section: KHO
    { id: 'a2', type: 'area', x: 130, y: 540, width: 130, height: 95, name: 'KHO', status: 'active', color: '#fff' },
    { id: 'p1', type: 'storage', x: 240, y: 240, width: 25, height: 70, name: 'Pallet', status: 'active', color: '#fff', showCross: true },
    { id: 'p2', type: 'storage', x: 115, y: 440, width: 25, height: 70, name: 'Mút xốp', status: 'active', color: '#fff', showCross: true },
    { id: 'p3', type: 'storage', x: 190, y: 440, width: 25, height: 70, name: 'Pallet', status: 'active', color: '#fff', showCross: true },
  ],
  connections: []
};

const MM_PER_PX = 10;

// --- Components ---

interface CanvasProps {
  layout: FactoryLayout;
  onUpdateElement: (id: string, updates: Partial<LayoutElement>) => void;
  onUpdateElements: (ids: string[], updates: (el: LayoutElement) => Partial<LayoutElement>) => void;
  onSelectElements: (ids: string[]) => void;
  onUpdateViewport: (x: number, y: number, zoom: number) => void;
  selectedIds: string[];
}

  const Canvas: React.FC<CanvasProps> = ({ layout, onUpdateElement, onUpdateElements, onSelectElements, onUpdateViewport, selectedIds }) => {
    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
    useEffect(() => {
      const updateDimensions = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight
          });
        }
      };
  
      const resizeObserver = new ResizeObserver(updateDimensions);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
  
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateDimensions);
      };
    }, []);

  useEffect(() => {
    if (selectedIds.length > 0 && transformerRef.current) {
      const stage = stageRef.current;
      const selectedNodes = selectedIds.map(id => stage.findOne('#' + id)).filter(node => !!node);
      transformerRef.current.nodes(selectedNodes);
      transformerRef.current.getLayer().batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedIds]);

  const handleDragMove = (id: string, e: any) => {
    if (selectedIds.includes(id) && selectedIds.length > 1) {
      const node = e.target;
      const originalEl = layout.elements.find(el => el.id === id);
      if (!originalEl) return;
      
      const dx = node.x() - originalEl.x;
      const dy = node.y() - originalEl.y;
      
      selectedIds.forEach(sid => {
        if (sid !== id) {
          const otherNode = stageRef.current.findOne('#' + sid);
          if (otherNode) {
            const otherOriginalEl = layout.elements.find(el => el.id === sid);
            if (otherOriginalEl) {
              otherNode.x(otherOriginalEl.x + dx);
              otherNode.y(otherOriginalEl.y + dy);
            }
          }
        }
      });
      stageRef.current.batchDraw();
    }
  };

  const handleDragEnd = (id: string, e: any) => {
    if (selectedIds.includes(id) && selectedIds.length > 1) {
      const node = e.target;
      const dx = node.x() - layout.elements.find(el => el.id === id)!.x;
      const dy = node.y() - layout.elements.find(el => el.id === id)!.y;
      
      onUpdateElements(selectedIds, (el) => ({
        x: el.x + dx,
        y: el.y + dy
      }));
    } else {
      onUpdateElement(id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    }
  };

  const handleTransformEnd = (id: string, e: any) => {
    const node = e.target;
    if (selectedIds.length > 1) {
      onUpdateElements(selectedIds, (el) => {
        const n = stageRef.current.findOne('#' + el.id);
        return {
          x: n.x(),
          y: n.y(),
          width: n.width() * n.scaleX(),
          height: n.height() * n.scaleY(),
          rotation: n.rotation()
        };
      });
      selectedIds.forEach(sid => {
        const n = stageRef.current.findOne('#' + sid);
        n.scaleX(1);
        n.scaleY(1);
      });
    } else {
      onUpdateElement(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * node.scaleX()),
        height: Math.max(5, node.height() * node.scaleY()),
        rotation: node.rotation(),
      });
      node.scaleX(1);
      node.scaleY(1);
    }
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (e.evt.button === 1) {
      setIsPanning(true);
      setLastPanPos(pos);
      stage.container().style.cursor = 'grabbing';
      return;
    }

    if (e.target === stage && e.evt.button === 0) {
      const scale = stage.scaleX();
      const stageX = stage.x();
      const stageY = stage.y();
      
      const x = (pos.x - stageX) / scale;
      const y = (pos.y - stageY) / scale;
      
      setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
      onSelectElements([]);
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    if (isPanning) {
      const dx = pos.x - lastPanPos.x;
      const dy = pos.y - lastPanPos.y;
      const newX = stage.x() + dx;
      const newY = stage.y() + dy;
      
      stage.position({ x: newX, y: newY });
      setLastPanPos(pos);
      onUpdateViewport(newX, newY, stage.scaleX());
      return;
    }

    if (selectionBox) {
      const scale = stage.scaleX();
      const stageX = stage.x();
      const stageY = stage.y();
      
      const x = (pos.x - stageX) / scale;
      const y = (pos.y - stageY) / scale;
      
      setSelectionBox({ ...selectionBox, x2: x, y2: y });
    }
  };

  const handleMouseUp = (e: any) => {
    if (isPanning) {
      setIsPanning(false);
      e.target.getStage().container().style.cursor = 'default';
    }

    if (selectionBox) {
      const x1 = Math.min(selectionBox.x1, selectionBox.x2);
      const y1 = Math.min(selectionBox.y1, selectionBox.y2);
      const x2 = Math.max(selectionBox.x1, selectionBox.x2);
      const y2 = Math.max(selectionBox.y1, selectionBox.y2);
      
      const selected = layout.elements.filter(el => {
        const ex1 = el.x;
        const ey1 = el.y;
        const ex2 = el.x + el.width;
        const ey2 = el.y + el.height;
        return !(ex1 > x2 || ex2 < x1 || ey1 > y2 || ey2 < y1);
      }).map(el => el.id);
      
      onSelectElements(selected);
      setSelectionBox(null);
    }
  };

  const handleStageDragEnd = (e: any) => {
    if (e.target === stageRef.current) {
      onUpdateViewport(e.target.x(), e.target.y(), layout.viewport?.zoom || 1);
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    onUpdateViewport(newPos.x, newPos.y, newScale);
  };

  const handleElementClick = (id: string, e: any) => {
    e.cancelBubble = true;
    if (e.evt.shiftKey) {
      if (selectedIds.includes(id)) {
        onSelectElements(selectedIds.filter(sid => sid !== id));
      } else {
        onSelectElements([...selectedIds, id]);
      }
    } else {
      if (!selectedIds.includes(id)) {
        onSelectElements([id]);
      }
    }
  };

  const renderElement = (el: LayoutElement) => {
    const isSelected = selectedIds.includes(el.id);
    
    if (el.type === 'label') {
      return (
        <Group
          key={el.id}
          id={el.id}
          x={el.x}
          y={el.y}
          draggable
          onDragMove={(e) => handleDragMove(el.id, e)}
          onDragEnd={(e) => handleDragEnd(el.id, e)}
          onTransformEnd={(e) => handleTransformEnd(el.id, e)}
          onClick={(e) => handleElementClick(el.id, e)}
          rotation={el.rotation || 0}
        >
          <Text
            text={el.name}
            fontSize={el.fontSize || 14}
            fontStyle="bold"
            fill="#000"
            align="center"
          />
        </Group>
      );
    }

    if (el.type === 'arrow') {
      return (
        <Arrow
          key={el.id}
          id={el.id}
          points={[0, 0, el.width, el.height]}
          x={el.x}
          y={el.y}
          stroke="#000"
          fill="#000"
          strokeWidth={2}
          draggable
          onDragMove={(e) => handleDragMove(el.id, e)}
          onDragEnd={(e) => handleDragEnd(el.id, e)}
          onTransformEnd={(e) => handleTransformEnd(el.id, e)}
          onClick={(e) => handleElementClick(el.id, e)}
          rotation={el.rotation || 0}
        />
      );
    }

    if (el.type === 'worker') {
      return (
        <Group
          key={el.id}
          id={el.id}
          x={el.x}
          y={el.y}
          draggable
          onDragMove={(e) => handleDragMove(el.id, e)}
          onDragEnd={(e) => handleDragEnd(el.id, e)}
          onTransformEnd={(e) => handleTransformEnd(el.id, e)}
          onClick={(e) => handleElementClick(el.id, e)}
          rotation={el.rotation || 0}
        >
          <Rect
            x={el.width / 2 - 8}
            y={0}
            width={16}
            height={16}
            fill="#fbbf24"
            cornerRadius={8}
            stroke="#000"
            strokeWidth={1}
          />
          <Rect
            x={el.width / 2 - 12}
            y={16}
            width={24}
            height={20}
            fill="#3b82f6"
            cornerRadius={4}
            stroke="#000"
            strokeWidth={1}
          />
          <Line
            points={[el.width / 2 - 12, 20, el.width / 2 - 20, 30]}
            stroke="#000"
            strokeWidth={2}
          />
          <Line
            points={[el.width / 2 + 12, 20, el.width / 2 + 20, 30]}
            stroke="#000"
            strokeWidth={2}
          />
          <Line
            points={[el.width / 2 - 6, 36, el.width / 2 - 10, 50]}
            stroke="#000"
            strokeWidth={2}
          />
          <Line
            points={[el.width / 2 + 6, 36, el.width / 2 + 10, 50]}
            stroke="#000"
            strokeWidth={2}
          />

          <Text
            text={el.name}
            fontSize={el.fontSize || 10}
            fontStyle="bold"
            width={el.width + 100}
            x={-50}
            align="center"
            y={55}
            fill="#000"
            listening={false}
          />
          {el.task && (
            <Text
              text={`(${el.task})`}
              fontSize={(el.fontSize || 10) * 0.9}
              width={el.width + 120}
              x={-60}
              align="center"
              y={55 + (el.fontSize || 10) + 2}
              fill="#475569"
              fontStyle="italic"
              listening={false}
            />
          )}
        </Group>
      );
    }

    return (
      <Group
        key={el.id}
        id={el.id}
        x={el.x}
        y={el.y}
        draggable
        onDragMove={(e) => handleDragMove(el.id, e)}
        onDragEnd={(e) => handleDragEnd(el.id, e)}
        onTransformEnd={(e) => handleTransformEnd(el.id, e)}
        onClick={(e) => handleElementClick(el.id, e)}
        rotation={el.rotation || 0}
      >
        <Rect
          width={el.width}
          height={el.height}
          fill={el.type === 'area' ? 'transparent' : (el.type === 'conveyor' ? '#2d5a27' : el.color)}
          stroke="#000"
          strokeWidth={el.type === 'area' ? 2 : 1}
          dash={el.type === 'area' ? [5, 5] : undefined}
          shadowBlur={isSelected ? 5 : 0}
          shadowColor="#3b82f6"
        />

        {el.showCross && (
          <Fragment>
            <Line points={[0, 0, el.width, el.height]} stroke="#000" strokeWidth={1} />
            <Line points={[el.width, 0, 0, el.height]} stroke="#000" strokeWidth={1} />
          </Fragment>
        )}

        {el.type === 'conveyor' && (
          <Fragment>
            {el.width >= el.height ? (
              Array.from({ length: Math.floor(el.width / 40) }).map((_, i) => (
                <Rect
                  key={i}
                  x={i * 40 + 5}
                  y={2}
                  width={30}
                  height={el.height - 4}
                  fill="#fff"
                  stroke="#000"
                  strokeWidth={1}
                />
              ))
            ) : (
              Array.from({ length: Math.floor(el.height / 40) }).map((_, i) => (
                <Rect
                  key={i}
                  x={2}
                  y={i * 40 + 5}
                  width={el.width - 4}
                  height={30}
                  fill="#fff"
                  stroke="#000"
                  strokeWidth={1}
                />
              ))
            )}
          </Fragment>
        )}

        {el.type !== 'area' && (
          <Text
            text={el.name}
            fontSize={el.fontSize || 10}
            fontStyle="bold"
            width={el.width}
            align="center"
            y={el.height / 2 - 5}
            fill={el.type === 'conveyor' ? '#000' : (el.color === '#fff' ? '#000' : '#fff')}
            listening={false}
          />
        )}

        {el.type === 'area' && (
          <Text
            text={el.name}
            fontSize={12}
            fontStyle="bold"
            x={5}
            y={5}
            fill="#000"
            listening={false}
          />
        )}
      </Group>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-white overflow-hidden border border-slate-300 rounded-xl shadow-lg cursor-grab active:cursor-grabbing relative">
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600 z-20 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-indigo-600">SCALE:</span>
          <span>1px = 10mm</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-indigo-600">ZOOM:</span>
          <span>{Math.round((layout.viewport?.zoom || 1) * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-indigo-600">GRID:</span>
          <span>400mm</span>
        </div>
      </div>

      <Stage
        width={dimensions.width}
        height={dimensions.height}
        ref={stageRef}
        draggable={!selectionBox && !isPanning}
        x={layout.viewport?.x || 0}
        y={layout.viewport?.y || 0}
        scaleX={layout.viewport?.zoom || 1}
        scaleY={layout.viewport?.zoom || 1}
        onDragEnd={handleStageDragEnd}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.evt.preventDefault()}
        onClick={(e) => {
          if (e.target === e.target.getStage()) {
            onSelectElements([]);
          }
        }}
      >
        <Layer>
          {Array.from({ length: 100 }).map((_, i) => (
            <Fragment key={i}>
              <Line points={[i * 40, 0, i * 40, 3000]} stroke="#f0f0f0" strokeWidth={1} />
              <Line points={[0, i * 40, 4000, i * 40]} stroke="#f0f0f0" strokeWidth={1} />
            </Fragment>
          ))}

          {layout.elements.map(el => renderElement(el))}

          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x1, selectionBox.x2)}
              y={Math.min(selectionBox.y1, selectionBox.y2)}
              width={Math.abs(selectionBox.x2 - selectionBox.x1)}
              height={Math.abs(selectionBox.y2 - selectionBox.y1)}
              fill="rgba(0, 161, 255, 0.3)"
              stroke="rgba(0, 161, 255, 1)"
              strokeWidth={1}
            />
          )}

          {selectedIds.length > 0 && (
            <Transformer
              ref={transformerRef}
              flipEnabled={false}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [models, setModels] = useState<Record<string, FactoryLayout>>(() => {
    const saved = localStorage.getItem('factory-models');
    return saved ? JSON.parse(saved) : { 'Mặc định': INITIAL_LAYOUT };
  });
  const [currentModelName, setCurrentModelName] = useState<string>(() => {
    return localStorage.getItem('current-model-name') || 'Mặc định';
  });
  const [layout, setLayout] = useState<FactoryLayout>(() => {
    return models[currentModelName] || INITIAL_LAYOUT;
  });
  const [history, setHistory] = useState<FactoryLayout[]>([]);
  const [clipboard, setClipboard] = useState<LayoutElement[]>([]);
  const [newModelName, setNewModelName] = useState('');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [editingModelName, setEditingModelName] = useState<string | null>(null);
  const [tempModelName, setTempModelName] = useState('');
  const [appName, setAppName] = useState(() => localStorage.getItem('app-name') || 'FactoryFlow AI');
  const [isEditingAppName, setIsEditingAppName] = useState(false);
  const [tempAppName, setTempAppName] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  useEffect(() => {
    const updatedModels = { ...models, [currentModelName]: layout };
    setModels(updatedModels);
    localStorage.setItem('factory-models', JSON.stringify(updatedModels));
    localStorage.setItem('current-model-name', currentModelName);
  }, [layout, currentModelName]);

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setLayout(previous);
  };

  const copyElement = () => {
    const selected = layout.elements.filter(el => selectedIds.includes(el.id));
    if (selected.length > 0) {
      setClipboard(selected);
    }
  };

  const pasteElement = () => {
    if (!clipboard || (Array.isArray(clipboard) && clipboard.length === 0)) return;
    
    const elementsToPaste = Array.isArray(clipboard) ? clipboard : [clipboard];
    const newElements = elementsToPaste.map(el => ({
      ...el,
      id: Math.random().toString(36).substr(2, 9),
      x: el.x + 20,
      y: el.y + 20,
    }));

    updateLayoutWithHistory(prev => ({
      ...prev,
      elements: [...prev.elements, ...newElements]
    }));
    setSelectedIds(newElements.map(el => el.id));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        copyElement();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        pasteElement();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          deleteElement();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, layout, selectedIds, clipboard]);

  const updateLayoutWithHistory = (newLayout: FactoryLayout | ((prev: FactoryLayout) => FactoryLayout)) => {
    setHistory(prev => [...prev.slice(-29), layout]);
    if (typeof newLayout === 'function') {
      setLayout(newLayout);
    } else {
      setLayout(newLayout);
    }
  };

  const saveNewModel = () => {
    if (!newModelName.trim()) return;
    const updatedModels = { ...models, [newModelName]: layout };
    setModels(updatedModels);
    setCurrentModelName(newModelName);
    setNewModelName('');
    localStorage.setItem('factory-models', JSON.stringify(updatedModels));
    localStorage.setItem('current-model-name', newModelName);
  };

  const loadModel = (name: string) => {
    setCurrentModelName(name);
    setLayout(models[name]);
    setIsModelMenuOpen(false);
  };

  const deleteModel = (name: string) => {
    if (Object.keys(models).length <= 1) return;
    const { [name]: _, ...rest } = models;
    setModels(rest);
    if (currentModelName === name) {
      const nextName = Object.keys(rest)[0];
      setCurrentModelName(nextName);
      setLayout(rest[nextName]);
    }
    localStorage.setItem('factory-models', JSON.stringify(rest));
  };

  const duplicateModel = (name: string) => {
    const baseName = `${name} (Copy)`;
    let newName = baseName;
    let counter = 1;
    while (models[newName]) {
      newName = `${baseName} ${counter}`;
      counter++;
    }
    const updatedModels = { ...models, [newName]: models[name] };
    setModels(updatedModels);
    localStorage.setItem('factory-models', JSON.stringify(updatedModels));
  };

  const renameModel = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName || models[newName]) {
      setEditingModelName(null);
      return;
    }
    const { [oldName]: modelData, ...rest } = models;
    const updatedModels = { ...rest, [newName]: modelData };
    setModels(updatedModels);
    if (currentModelName === oldName) {
      setCurrentModelName(newName);
    }
    setEditingModelName(null);
    localStorage.setItem('factory-models', JSON.stringify(updatedModels));
  };

  const addElement = (type: ElementType) => {
    const colors = {
      machine: '#fff',
      workstation: '#fff',
      storage: '#fff',
      conveyor: '#2d5a27',
      area: '#fff',
      label: '#000',
      arrow: '#000',
      worker: '#fbbf24'
    };
    
    const newElement: LayoutElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 100,
      y: 100,
      width: type === 'conveyor' ? 400 : (type === 'worker' ? 40 : 100),
      height: type === 'conveyor' ? 40 : (type === 'worker' ? 40 : 100),
      name: type === 'worker' ? 'Công nhân mới' : `Mới ${type}`,
      status: 'active',
      color: colors[type],
      showCross: type === 'storage',
      task: type === 'worker' ? 'Mô tả công việc' : undefined
    };
    
    updateLayoutWithHistory(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));
  };

  const updateElement = (id: string, updates: Partial<LayoutElement>) => {
    updateLayoutWithHistory(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el)
    }));
  };

  const updateElements = (ids: string[], updates: (el: LayoutElement) => Partial<LayoutElement>) => {
    updateLayoutWithHistory(prev => ({
      ...prev,
      elements: prev.elements.map(el => ids.includes(el.id) ? { ...el, ...updates(el) } : el)
    }));
  };

  const updateViewport = (x: number, y: number, zoom: number) => {
    setLayout(prev => ({
      ...prev,
      viewport: { x, y, zoom }
    }));
  };

  const resetView = () => {
    updateViewport(0, 0, 1);
  };

  const deleteElement = () => {
    if (selectedIds.length === 0) return;
    updateLayoutWithHistory(prev => ({
      ...prev,
      elements: prev.elements.filter(el => !selectedIds.includes(el.id)),
      connections: prev.connections.filter(c => !selectedIds.includes(c.fromId) && !selectedIds.includes(c.toId))
    }));
    setSelectedIds([]);
  };

  const saveAppName = () => {
    if (tempAppName.trim()) {
      setAppName(tempAppName);
      localStorage.setItem('app-name', tempAppName);
    }
    setIsEditingAppName(false);
  };

  const selectedElement = layout.elements.find(el => selectedIds.length === 1 && el.id === selectedIds[0]);

  return (
    <div ref={containerRef} className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden relative">
      {/* Sidebar Left: Tools */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col shadow-sm z-20 transition-all duration-300 relative ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none'}`}>
        <div className="p-6 border-bottom border-slate-100 min-w-[256px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Factory className="text-white w-5 h-5" />
            </div>
            {isEditingAppName ? (
              <input
                autoFocus
                type="text"
                value={tempAppName}
                onChange={(e) => setTempAppName(e.target.value)}
                onBlur={saveAppName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveAppName();
                  if (e.key === 'Escape') setIsEditingAppName(false);
                }}
                className="font-bold text-xl tracking-tight w-full outline-none border-b-2 border-indigo-500 bg-transparent"
              />
            ) : (
              <h1 
                className="font-bold text-xl tracking-tight cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => {
                  setTempAppName(appName);
                  setIsEditingAppName(true);
                }}
                title="Nhấp để đổi tên"
              >
                {appName}
              </h1>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Thiết kế Layout</p>
        </div>

        <div className="px-4 py-2 border-b border-slate-100 min-w-[256px]">
          <div className="relative">
            <button 
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="w-full flex items-center justify-between p-2 text-sm font-semibold bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FolderOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="truncate">{currentModelName}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isModelMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  <div className="p-2 space-y-1">
                    {Object.keys(models).map(name => (
                      <div key={name} className="flex items-center justify-between group px-2 py-1.5 rounded-lg hover:bg-slate-50">
                        {editingModelName === name ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input 
                              autoFocus
                              type="text"
                              value={tempModelName}
                              onChange={(e) => setTempModelName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') renameModel(name, tempModelName);
                                if (e.key === 'Escape') setEditingModelName(null);
                              }}
                              className="flex-1 text-xs p-1 rounded border border-indigo-300 outline-none"
                            />
                            <button 
                              onClick={() => renameModel(name, tempModelName)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => loadModel(name)}
                              className={`flex-1 text-left text-xs font-medium truncate ${currentModelName === name ? 'text-indigo-600' : 'text-slate-600'}`}
                            >
                              {name}
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => {
                                  setEditingModelName(name);
                                  setTempModelName(name);
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600"
                                title="Đổi tên"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => duplicateModel(name)}
                                className="p-1 text-slate-400 hover:text-indigo-600"
                                title="Nhân bản"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              {Object.keys(models).length > 1 && (
                                <button 
                                  onClick={() => deleteModel(name)}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-100 bg-slate-50">
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        placeholder="Tên model mới..."
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        className="flex-1 text-[10px] p-1.5 rounded border border-slate-200 outline-none"
                      />
                      <button 
                        onClick={saveNewModel}
                        className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        <FilePlus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto min-w-[256px]">
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase mb-3 px-2">Thêm thiết bị</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addElement('machine')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
                <Cpu className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 mb-1" />
                <span className="text-[10px] font-medium">Thiết bị</span>
              </button>
              <button onClick={() => addElement('conveyor')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
                <ArrowRightLeft className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 mb-1" />
                <span className="text-[10px] font-medium">Băng tải</span>
              </button>
              <button onClick={() => addElement('area')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
                <Factory className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 mb-1" />
                <span className="text-[10px] font-medium">Khu vực</span>
              </button>
              <button onClick={() => addElement('label')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
                <Plus className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 mb-1" />
                <span className="text-[10px] font-medium">Ghi chú</span>
              </button>
              <button onClick={() => addElement('arrow')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
                <ArrowRightLeft className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 mb-1" />
                <span className="text-[10px] font-medium">Mũi tên</span>
              </button>
              <button onClick={() => addElement('worker')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
                <User className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 mb-1" />
                <span className="text-[10px] font-medium">Công nhân</span>
              </button>
            </div>
          </section>

          {selectedElement && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 p-4 rounded-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-slate-700 uppercase">Cấu hình</h2>
                <button onClick={deleteElement} className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Tên thiết bị / Công nhân</label>
                  <input 
                    type="text" 
                    value={selectedElement.name}
                    onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
                    className="w-full text-sm p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                {selectedElement.type === 'worker' && (
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Công việc đảm nhận</label>
                    <input 
                      type="text" 
                      value={selectedElement.task || ''}
                      onChange={(e) => updateElement(selectedElement.id, { task: e.target.value })}
                      className="w-full text-sm p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ví dụ: Kiểm tra chất lượng..."
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Dài (mm)</label>
                    <input 
                      type="number" 
                      value={Math.round(selectedElement.width * MM_PER_PX)}
                      onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) / MM_PER_PX })}
                      className="w-full text-sm p-2 rounded-lg border border-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Rộng (mm)</label>
                    <input 
                      type="number" 
                      value={Math.round(selectedElement.height * MM_PER_PX)}
                      onChange={(e) => updateElement(selectedElement.id, { height: parseInt(e.target.value) / MM_PER_PX })}
                      className="w-full text-sm p-2 rounded-lg border border-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Cỡ chữ</label>
                    <input 
                      type="number" 
                      value={selectedElement.fontSize || 10}
                      onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                      className="w-full text-sm p-2 rounded-lg border border-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Xoay (độ)</label>
                    <div className="flex gap-1">
                      <input 
                        type="number" 
                        value={selectedElement.rotation || 0}
                        onChange={(e) => updateElement(selectedElement.id, { rotation: parseInt(e.target.value) })}
                        className="w-full text-sm p-2 rounded-lg border border-slate-200 outline-none"
                      />
                      <button 
                        onClick={() => updateElement(selectedElement.id, { rotation: ((selectedElement.rotation || 0) + 90) % 360 })}
                        className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Xoay 90°"
                      >
                        <RotateCw className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedElement.showCross}
                      onChange={(e) => updateElement(selectedElement.id, { showCross: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500">Ký hiệu X</span>
                  </label>
                </div>
              </div>
            </motion.section>
          )}
          {selectedIds.length > 1 && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 p-4 rounded-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-slate-700 uppercase">Đã chọn {selectedIds.length} đối tượng</h2>
                <button onClick={deleteElement} className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 italic">Bạn có thể di chuyển hoặc xóa các đối tượng đã chọn cùng lúc.</p>
            </motion.section>
          )}
        </nav>
      </aside>

      {/* Toggle Sidebar Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-1/2 -translate-y-1/2 z-30 bg-white border border-slate-200 p-1 rounded-full shadow-md hover:bg-slate-50 transition-all duration-300 ${isSidebarOpen ? 'left-[244px]' : 'left-2'}`}
        title={isSidebarOpen ? "Ẩn thanh công cụ" : "Hiện thanh công cụ"}
      >
        <ChevronLeft className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} />
      </button>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header Toolbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Factory Mode
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            </button>
            <button 
              onClick={resetView}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 rotate-45" /> Reset View
            </button>
            <button 
              onClick={undo}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4 rotate-180" /> Hoàn tác (Ctrl+Z)
            </button>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 p-6 bg-slate-50 relative">
          <Canvas 
            layout={layout} 
            onUpdateElement={updateElement} 
            onUpdateElements={updateElements}
            onSelectElements={setSelectedIds}
            onUpdateViewport={updateViewport}
            selectedIds={selectedIds}
          />
        </div>
      </main>
    </div>
  );
}
