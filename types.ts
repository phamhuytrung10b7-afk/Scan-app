
export enum UnitStatus {
  NEW = 'NEW',
  SOLD = 'SOLD',
  WARRANTY = 'WARRANTY',
  EXHIBITION = 'EXHIBITION'
}

export interface Product {
  id: string;
  model: string;
  brand: string;
  specs: string; 
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  maxCapacity?: number; // Sức chứa tối đa (số lượng máy)
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  type: 'DEALER' | 'RETAIL'; 
}

export interface SerialUnit {
  serialNumber: string;
  productId: string;
  status: UnitStatus;
  warehouseLocation: string; 
  importDate: string;
  exportDate?: string;
  customerName?: string;
  isReimported?: boolean; 
}

export interface Transaction {
  id: string;
  type: 'INBOUND' | 'OUTBOUND' | 'TRANSFER';
  date: string;
  productId: string;
  quantity: number;
  serialNumbers: string[];
  fromLocation?: string; // Kho nguồn
  toLocation?: string;   // Kho đích
  customer?: string;   
  isReimportTx?: boolean; 
  planName?: string;    
}

export interface InventoryStats {
  totalUnits: number;
  lowStockModels: string[];
  recentTransactions: Transaction[];
}

export interface ProductionPlan {
  id: string;
  name: string; 
  productId: string; 
  createdDate: string;
  serials: string[]; 
}

export interface SalesOrderItem {
  productId: string;
  quantity: number;
  scannedCount: number;
}

export interface SalesOrder {
  id: string;
  code: string;
  type: 'SALE' | 'TRANSFER';
  status: 'PENDING' | 'COMPLETED';
  customerName?: string;
  destinationWarehouse?: string;
  createdDate: string;
  items: SalesOrderItem[];
}
