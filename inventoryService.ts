
import { Product, SerialUnit, UnitStatus, Transaction, Warehouse, Customer, ProductionPlan, SalesOrder, SalesOrderItem } from './types';

const STORAGE_KEY = 'RO_MASTER_DB_V3_FINAL';
const DRAFT_KEY = 'RO_MASTER_DRAFTS_V3';

interface DraftData {
  inbound: string[];
  outbound: string[];
  productionCheck: string[];
}

class InventoryService {
  private products: Product[] = [];
  private units: SerialUnit[] = [];
  private transactions: Transaction[] = [];
  private warehouses: Warehouse[] = [];
  private customers: Customer[] = [];
  private productionPlans: ProductionPlan[] = []; 
  private salesOrders: SalesOrder[] = [];
  private drafts: DraftData = { inbound: [], outbound: [], productionCheck: [] };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        this.products = parsed.products || [];
        this.units = parsed.units || [];
        this.transactions = parsed.transactions || [];
        this.warehouses = parsed.warehouses || [{ id: 'wh-default', name: 'Kho Tổng', maxCapacity: 1000 }];
        this.customers = parsed.customers || [];
        this.productionPlans = parsed.productionPlans || [];
        this.salesOrders = parsed.salesOrders || [];
      } catch (e) {
        console.error("Storage error:", e);
      }
    } else {
      this.warehouses = [{ id: 'wh-default', name: 'Kho Tổng', maxCapacity: 1000 }];
    }

    const savedDrafts = localStorage.getItem(DRAFT_KEY);
    if (savedDrafts) {
      try {
        this.drafts = JSON.parse(savedDrafts);
      } catch (e) {
        this.drafts = { inbound: [], outbound: [], productionCheck: [] };
      }
    }
  }

  private persist() {
    const data = {
      products: this.products,
      units: this.units,
      transactions: this.transactions,
      warehouses: this.warehouses,
      customers: this.customers,
      productionPlans: this.productionPlans,
      salesOrders: this.salesOrders,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // --- DRAFT MANAGEMENT ---
  getDrafts() { return this.drafts; }
  
  saveDraft(key: keyof DraftData, list: string[]) {
    this.drafts[key] = list;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(this.drafts));
  }

  clearDraft(key: keyof DraftData) {
    this.drafts[key] = [];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(this.drafts));
  }

  resetDatabase() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DRAFT_KEY);
    window.location.reload();
  }

  getProducts() { return this.products; }
  getUnits() { return this.units; }
  getTransactions() { return this.transactions; }
  getWarehouses() { return this.warehouses; }
  getCustomers() { return this.customers; }
  getProductionPlans() { return this.productionPlans; }
  getSalesOrders() { return this.salesOrders; }
  getProductById(id: string) { return this.products.find(p => p.id === id); }
  getUnitBySerial(serial: string) { return this.units.find(u => u.serialNumber === serial); }
  
  getWarehouseCurrentStock(whName: string) {
    return this.units.filter(u => u.warehouseLocation === whName && u.status === UnitStatus.NEW).length;
  }

  getSerialHistory(serial: string) { 
    return this.transactions.filter(t => t.serialNumbers.includes(serial))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 
  }

  getHistoryByDateRange(types: string[], start: string, end: string) {
      const s = start ? new Date(start).setHours(0,0,0,0) : 0;
      const e = end ? new Date(end).setHours(23,59,59,999) : 9999999999999;
      return this.transactions.filter(t => types.includes(t.type) && new Date(t.date).getTime() >= s && new Date(t.date).getTime() <= e)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  addProduct(p: Product) { this.products = [...this.products, p]; this.persist(); }
  updateProduct(id: string, updates: Partial<Product>) { this.products = this.products.map(p => p.id === id ? { ...p, ...updates } : p); this.persist(); }
  deleteProduct(id: string) { this.products = this.products.filter(p => p.id !== id); this.persist(); }
  
  addWarehouse(wh: Warehouse) { this.warehouses = [...this.warehouses, wh]; this.persist(); }
  updateWarehouse(id: string, updates: Partial<Warehouse>) { this.warehouses = this.warehouses.map(w => w.id === id ? { ...w, ...updates } : w); this.persist(); }
  deleteWarehouse(id: string) { this.warehouses = this.warehouses.filter(w => w.id !== id); this.persist(); }

  addCustomer(c: Customer) { this.customers = [...this.customers, c]; this.persist(); }
  updateCustomer(id: string, updates: Partial<Customer>) { this.customers = this.customers.map(c => c.id === id ? { ...c, ...updates } : c); this.persist(); }
  deleteCustomer(id: string) { this.customers = this.customers.filter(c => c.id !== id); this.persist(); }

  addProductionPlan(name: string, productId: string, serials: string[]) {
    const plan = { id: `plan-${Date.now()}`, name, productId, createdDate: new Date().toISOString(), serials };
    this.productionPlans = [plan, ...this.productionPlans];
    this.persist();
    return plan;
  }
  updateProductionPlan(id: string, name: string, productId: string, serials: string[]) { this.productionPlans = this.productionPlans.map(p => p.id === id ? { ...p, name, productId, serials } : p); this.persist(); }
  deleteProductionPlan(id: string) { this.productionPlans = this.productionPlans.filter(p => p.id !== id); this.persist(); }

  addSalesOrder(code: string, targetName: string, items: SalesOrderItem[], type: 'SALE' | 'TRANSFER', destination?: string) {
    const order: SalesOrder = { id: `so-${Date.now()}`, code, type, status: 'PENDING', customerName: type === 'SALE' ? targetName : undefined, destinationWarehouse: type === 'TRANSFER' ? destination : undefined, createdDate: new Date().toISOString(), items: items.map(i => ({ ...i, scannedCount: 0 })) };
    this.salesOrders = [order, ...this.salesOrders];
    this.persist();
    return order;
  }

  deleteSalesOrder(id: string) {
    this.salesOrders = this.salesOrders.filter(o => o.id !== id);
    this.persist();
  }

  importUnits(productId: string, serials: string[], initialLocation: string, planName?: string) {
    let remainingSerials = [...serials];
    const allWhs = this.getWarehouses();
    let whIdx = allWhs.findIndex(w => w.name === initialLocation);
    if (whIdx === -1) whIdx = 0;

    const finalAssignments: { location: string, serials: string[] }[] = [];

    while (remainingSerials.length > 0 && whIdx < allWhs.length) {
      const currentWh = allWhs[whIdx];
      const currentStock = this.getWarehouseCurrentStock(currentWh.name);
      const capacity = currentWh.maxCapacity || 999999;
      const spaceLeft = Math.max(0, capacity - currentStock);

      if (spaceLeft > 0) {
        const canTake = remainingSerials.slice(0, spaceLeft);
        finalAssignments.push({ location: currentWh.name, serials: canTake });
        remainingSerials = remainingSerials.slice(spaceLeft);
      }
      whIdx++;
    }

    if (remainingSerials.length > 0) {
      const lastLoc = finalAssignments.length > 0 ? finalAssignments[finalAssignments.length - 1] : { location: initialLocation, serials: [] };
      lastLoc.serials.push(...remainingSerials);
      if (finalAssignments.length === 0) finalAssignments.push(lastLoc);
    }

    const updatedUnits = [...this.units];
    finalAssignments.forEach(assign => {
      let isReimportTx = false;
      assign.serials.forEach(s => {
        const idx = updatedUnits.findIndex(u => u.serialNumber === s);
        if (idx !== -1) {
          const existingUnit = updatedUnits[idx];
          if (existingUnit.status === UnitStatus.SOLD) {
             if (existingUnit.isReimported) throw new Error(`Mã ${s} đã từng được tái nhập rồi.`);
             updatedUnits[idx] = { ...existingUnit, status: UnitStatus.NEW, warehouseLocation: assign.location, importDate: new Date().toISOString(), isReimported: true };
             isReimportTx = true;
          } else {
             throw new Error(`Mã ${s} hiện đang tồn kho.`);
          }
        } else {
          updatedUnits.push({ serialNumber: s, productId, status: UnitStatus.NEW, warehouseLocation: assign.location, importDate: new Date().toISOString(), isReimported: false });
        }
      });

      this.transactions = [{ 
        id: `tx-in-${Date.now()}-${assign.location}`, 
        type: 'INBOUND', 
        date: new Date().toISOString(), 
        productId, 
        quantity: assign.serials.length, 
        serialNumbers: assign.serials, 
        toLocation: assign.location, 
        isReimportTx, 
        planName 
      }, ...this.transactions];
    });

    this.units = updatedUnits;
    this.persist();
  }

  transferUnits(productId: string, serials: string[], toLoc: string) {
    const firstUnit = this.units.find(u => u.serialNumber === serials[0]);
    const fromLoc = firstUnit?.warehouseLocation;
    this.units = this.units.map(u => serials.includes(u.serialNumber) ? { ...u, warehouseLocation: toLoc } : u);
    this.transactions = [{ 
      id: `tx-tr-${Date.now()}`, 
      type: 'TRANSFER', 
      date: new Date().toISOString(), 
      productId, 
      quantity: serials.length, 
      serialNumbers: serials, 
      fromLocation: fromLoc,
      toLocation: toLoc 
    }, ...this.transactions];
    this.persist();
  }

  exportUnits(productId: string, serials: string[], customer: string, fromLoc: string) {
    this.units = this.units.map(u => serials.includes(u.serialNumber) ? { ...u, status: UnitStatus.SOLD, exportDate: new Date().toISOString(), customerName: customer, warehouseLocation: 'OUT' } : u);
    this.transactions = [{ 
      id: `tx-out-${Date.now()}`, 
      type: 'OUTBOUND', 
      date: new Date().toISOString(), 
      productId, 
      quantity: serials.length, 
      serialNumbers: serials, 
      customer,
      fromLocation: fromLoc 
    }, ...this.transactions];
    this.persist();
  }

  checkSerialImported(s: string) { return this.units.some(u => u.serialNumber === s); }

  deleteUnit(serial: string) {
    this.units = this.units.filter(u => u.serialNumber !== serial);
    this.persist();
  }

  updateUnit(oldSerial: string, updates: Partial<SerialUnit>) {
    const idx = this.units.findIndex(u => u.serialNumber === oldSerial);
    if (idx !== -1) {
      this.units[idx] = { ...this.units[idx], ...updates };
      this.persist();
    }
  }

  addUnitManual(productId: string, serial: string, warehouse: string) {
    if (this.getUnitBySerial(serial)) {
      throw new Error(`Mã ${serial} đã tồn tại trong hệ thống.`);
    }
    const newUnit: SerialUnit = {
      serialNumber: serial,
      productId,
      status: UnitStatus.NEW,
      warehouseLocation: warehouse,
      importDate: new Date().toISOString(),
      isReimported: false
    };
    this.units = [...this.units, newUnit];
    
    // Also add a transaction for traceability
    this.transactions = [{
      id: `tx-manual-${Date.now()}`,
      type: 'INBOUND',
      date: new Date().toISOString(),
      productId,
      quantity: 1,
      serialNumbers: [serial],
      toLocation: warehouse,
      planName: 'NHẬP THỦ CÔNG'
    }, ...this.transactions];

    this.persist();
  }
}

export const inventoryService = new InventoryService();
