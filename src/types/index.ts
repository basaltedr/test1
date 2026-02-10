export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  createdAt: string;
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
