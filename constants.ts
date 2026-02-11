import { Client, ProductService, InventoryItem, CategoryType, Sale, SaleStatus, FinancialRecord, TransactionType, AccountType } from './types';

export const INITIAL_CLIENTS: Client[] = [
  { 
    id: '1', 
    name: 'Maria Silva', 
    phone: '(11) 99999-1111', 
    email: 'maria@email.com',
    cpf: '123.456.789-00',
    address: 'Rua das Flores, 123',
    hasPlan: true,
    dateRegistered: '2023-01-15',
    notes: 'Cliente prefere horários da manhã'
  },
  { 
    id: '2', 
    name: 'João Santos', 
    phone: '(11) 98888-2222', 
    email: 'joao@email.com',
    cpf: '234.567.890-11',
    address: 'Av. Paulista, 1000',
    hasPlan: false,
    dateRegistered: '2023-02-20' 
  },
];

// REMOVIDO: Corte Feminino e Coloração (Cabelo)
export const INITIAL_PRODUCTS: ProductService[] = [
  { id: '2', name: 'Manicure', category: CategoryType.UNHA, price: 35, cost: 5, duration: 30 },
  { id: '3', name: 'Shampoo Especial', category: CategoryType.PRODUTO, price: 45, cost: 20, duration: 15 },
  { id: '5', name: 'Alongamento de Fibra', category: CategoryType.UNHA, price: 150, cost: 30, duration: 150 },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Shampoo Especial', currentQty: 10, minAlert: 10, cost: 25.50, category: CategoryType.PRODUTO, type: 'VENDA' },
  { id: '2', name: 'Esmalte Vermelho', currentQty: 2, minAlert: 10, cost: 8.90, category: CategoryType.UNHA, type: 'INSUMO' },
];

export const INITIAL_SALES: Sale[] = [
  { id: '101', date: new Date().toISOString().split('T')[0], time: '09:00', clientId: '1', itemId: '2', finalValue: 35, status: SaleStatus.CONCLUIDO },
];

export const INITIAL_FINANCIALS: FinancialRecord[] = [
  { id: 'f1', date: '2023-10-01', description: 'Pagamento Conta Luz', type: TransactionType.SAIDA, category: 'Contas', value: 150, account: AccountType.NEGOCIO, paymentMethod: 'Boleto', status: 'Pago' },
  { id: 'f3', date: new Date().toISOString().split('T')[0], description: 'Manicure - Maria', type: TransactionType.ENTRADA, category: 'Serviço', value: 35, account: AccountType.NEGOCIO, relatedSaleId: '101', paymentMethod: 'Dinheiro', status: 'Pago' },
];