import { create } from 'zustand';
import { 
  Client, ProductService, Sale, FinancialRecord, 
  InventoryItem, CategoryType, SaleStatus, TransactionType, 
  FinancialCategory, AccountType 
} from './types';

interface AppState {
  clients: Client[];
  products: ProductService[];
  sales: Sale[];
  financials: FinancialRecord[];
  inventory: InventoryItem[];
  
  addClient: (client: Client) => void;
  addProduct: (product: ProductService) => void;
  updateProduct: (product: ProductService) => void;
  deleteProduct: (id: string) => void;
  addSale: (sale: Sale) => void;
  deleteSale: (id: string) => void;
  updateSaleStatus: (id: string, status: SaleStatus) => void;
  addFinancialRecord: (record: FinancialRecord) => void;
  updateFinancialRecord: (record: FinancialRecord) => void;
  deleteFinancialRecord: (id: string) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;
}

// --- SERVIÇOS DAS FOTOS ---
const initialProducts: ProductService[] = [
  { id: '1', name: 'Alongamento de fibra', category: CategoryType.UNHA, price: 150.00, cost: 0, duration: 150 },
  { id: '2', name: 'Banho de fibra', category: CategoryType.UNHA, price: 120.00, cost: 0, duration: 100 },
  { id: '3', name: 'Manutenção', category: CategoryType.UNHA, price: 95.00, cost: 0, duration: 100 },
  { id: '4', name: 'Manutenção de outro profissional', category: CategoryType.UNHA, price: 130.00, cost: 0, duration: 120 },
  { id: '5', name: 'Mão com esmaltação em gel', category: CategoryType.UNHA, price: 45.00, cost: 0, duration: 75 },
  { id: '6', name: 'Mão c/ esmaltação em gel e decoração', category: CategoryType.UNHA, price: 50.00, cost: 0, duration: 80 },
  { id: '7', name: 'Mão comum c/ decoração ou francesinha', category: CategoryType.UNHA, price: 35.00, cost: 0, duration: 80 },
  { id: '8', name: 'Mão simples', category: CategoryType.UNHA, price: 30.00, cost: 0, duration: 60 },
  { id: '9', name: 'Pé com esmaltação em gel', category: CategoryType.UNHA, price: 50.00, cost: 0, duration: 90 },
  { id: '10', name: 'Pé c/ esmalt. gel e Decoração', category: CategoryType.UNHA, price: 55.00, cost: 0, duration: 90 },
  { id: '11', name: 'Pé comum c/ decoração ou francesinha', category: CategoryType.UNHA, price: 35.00, cost: 0, duration: 90 },
  { id: '12', name: 'Pé comum simples', category: CategoryType.UNHA, price: 30.00, cost: 0, duration: 70 },
  { id: '13', name: 'Redificação no dedão do pé', category: CategoryType.UNHA, price: 25.00, cost: 0, duration: 30 },
  { id: '14', name: 'Remoção de alongamento/banho de gel', category: CategoryType.UNHA, price: 50.00, cost: 0, duration: 30 },
  { id: '15', name: 'Soft gel com esmaltação em gel', category: CategoryType.UNHA, price: 80.00, cost: 0, duration: 105 },
  { id: '16', name: 'Tempo', category: CategoryType.OUTRO, price: 0.00, cost: 0, duration: 30 },
];

// ESTOQUE ZERADO CONFORME PEDIDO
const initialInventory: InventoryItem[] = [];

export const useData = create<AppState>((set) => ({
  clients: [],
  products: initialProducts,
  sales: [],
  financials: [],
  inventory: initialInventory,

  addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProduct: (updatedProduct) => set((state) => ({
    products: state.products.map((p) => p.id === updatedProduct.id ? updatedProduct : p)
  })),
  deleteProduct: (id) => set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
  addSale: (sale) => set((state) => ({ sales: [...state.sales, sale] })),
  deleteSale: (id) => set((state) => ({ sales: state.sales.filter((s) => s.id !== id) })),
  updateSaleStatus: (id, status) => set((state) => ({
    sales: state.sales.map((s) => s.id === id ? { ...s, status } : s)
  })),
  addFinancialRecord: (record) => set((state) => ({ financials: [...state.financials, record] })),
  updateFinancialRecord: (updatedRecord) => set((state) => ({
    financials: state.financials.map((r) => r.id === updatedRecord.id ? updatedRecord : r)
  })),
  deleteFinancialRecord: (id) => set((state) => ({ financials: state.financials.filter((r) => r.id !== id) })),
  addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),
  updateInventoryItem: (updatedItem) => set((state) => ({
    inventory: state.inventory.map((i) => i.id === updatedItem.id ? updatedItem : i)
  })),
  deleteInventoryItem: (id) => set((state) => ({ inventory: state.inventory.filter((i) => i.id !== id) })),
}));