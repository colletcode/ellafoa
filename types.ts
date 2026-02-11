export enum CategoryType {
  CABELO = 'Cabelo',
  UNHA = 'Unha',
  PRODUTO = 'Produto',
  ESTETICA = 'Estética',
  OUTRO = 'Outro'
}

export enum SaleStatus {
  PENDENTE = 'Pendente',
  CONCLUIDO = 'Concluído',
  CANCELADO = 'Cancelado'
}

export enum TransactionType {
  ENTRADA = 'Entrada',
  SAIDA = 'Saída'
}

export enum FinancialCategory {
  INSUMO = 'Insumo',
  ALUGUEL = 'Aluguel',
  PRO_LABORE = 'Pró-labore',
  DIVIDA = 'DÍVIDA',
  SERVICO = 'Serviço',
  VENDA_PRODUTO = 'Venda Produto',
  OUTRO = 'Outro'
}

export enum AccountType {
  PESSOAL = 'Pessoal',
  NEGOCIO = 'Negócio'
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  address: string;
  hasPlan: boolean;
  dateRegistered: string;
}

export interface ProductService {
  id: string;
  name: string;
  description?: string;
  category: CategoryType;
  cost: number;
  duration: number; 
  price: number; 
  pricePix?: number;
  priceCredit?: number;
  priceDebit?: number;
  priceCash?: number;
}

export interface Sale {
  id: string;
  date: string;
  time?: string;
  clientId: string;
  itemId: string;
  finalValue: number;
  notes?: string;
  status: SaleStatus;
}

export interface FinancialRecord {
  id: string;
  date: string;
  description: string;
  notes?: string;
  type: TransactionType;
  category: FinancialCategory;
  value: number;
  account: AccountType;
  paymentMethod?: string;
  relatedSaleId?: string;
  status?: 'Pendente' | 'Pago'; 
}

export interface InventoryItem {
  id: string;
  name: string;
  currentQty: number;
  minAlert: number;
  cost: number;
  category: CategoryType;
  code?: string;
  entryDate?: string;
  type?: 'INSUMO' | 'VENDA';
}

// --- NOVO: CONFIGURAÇÕES DA AGENDA ---
export interface AgendaSettings {
  workingDays: string[]; // Dias que atende (Seg, Ter...)
  openTime: string;      // Horário Abertura (09:00)
  closeTime: string;     // Horário Fechamento (19:00)
  lunchStart?: string;   // Início Almoço
  lunchEnd?: string;     // Fim Almoço
  onlineBooking: boolean; // Link Ativo?
  linkUrl: string;       // O Link para o cliente
}