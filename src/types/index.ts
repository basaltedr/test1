export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  categoryId: number | null;
  categoryName?: string;
  categoryColor?: string;
  createdAt: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  type: 'sale' | 'restock' | 'adjustment';
  quantity: number;
  date: string;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: number;
  number: string;
  clientName: string;
  date: string;
  total: number;
  items?: InvoiceItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface BusinessSettings {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  footerMessage: string;
  currencyCode: string;
  currencySymbol: string;
  currencyLocale: string;
  invoiceTemplate: 'modern' | 'classic' | 'minimal' | 'elegant';
  invoiceColor: string;
  logoBase64: string;
}

export interface SalesPeriodStats {
  periodLabel: string;
  total: number;
  count: number;
}

export interface TopProduct {
  productName: string;
  totalQty: number;
  totalRevenue: number;
}
