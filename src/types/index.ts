export type OrderStatus = 'NOVO' | 'PREPARANDO' | 'PRONTO' | 'ENTREGANDO' | 'CONCLUIDO' | 'CANCELADO';
export type PaymentMethod = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO';
export type OrderType = 'LOCAL' | 'VIAGEM' | 'DELIVERY';

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  total_orders?: number;
  total_spent?: number;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: number;
  stock: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  custom_notes?: string;
  item_name?: string;
  image_url?: string;
}

export interface Order {
  id: number;
  customer_id: number;
  status: OrderStatus;
  order_type?: OrderType;
  total_amount: number;
  payment_method: PaymentMethod;
  notes: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_email?: string;
  items?: OrderItem[];
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  custom_notes?: string;
}

export interface SqlLogEntry {
  id: number;
  query: string;
  duration_ms: number;
  executed_at: string;
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'SCHEMA' | 'OTHER';
}

export interface QueryResult {
  columns: string[];
  values: any[][];
  rowCount: number;
  executionTimeMs: number;
}
