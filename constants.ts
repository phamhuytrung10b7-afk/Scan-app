import { Product, SerialUnit, UnitStatus, Transaction, Warehouse, Customer } from './types';

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_UNITS: SerialUnit[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_WAREHOUSES: Warehouse[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const NAV_ITEMS = [
  { label: 'Tổng quan', icon: 'LayoutDashboard', path: '/' },
  { label: 'Nhập kho', icon: 'Download', path: '/inbound' },
  { label: 'Xuất kho', icon: 'Upload', path: '/outbound' },
  { label: 'Tồn kho', icon: 'Package', path: '/inventory' },
  { label: 'Kiểm tra SX', icon: 'ClipboardCheck', path: '/production-check' },
  { label: 'Tra cứu IMEI', icon: 'Search', path: '/tracking' },
  { label: 'Cấu hình', icon: 'Settings', path: '/settings' },
];