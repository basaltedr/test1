import * as SQLite from 'expo-sqlite';
import { BusinessSettings } from '../types';

let db: SQLite.SQLiteDatabase;

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'GestiVente',
  address: '',
  phone: '',
  email: '',
  taxId: '',
  footerMessage: 'Merci pour votre achat !',
  currencyCode: 'XOF',
  currencySymbol: 'FCFA',
  currencyLocale: 'fr-FR',
};

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('shop.db');
    await initDatabase(db);
  }
  return db;
}

async function initDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      clientName TEXT NOT NULL DEFAULT 'Client',
      date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      total REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (invoiceId) REFERENCES invoices(id),
      FOREIGN KEY (productId) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default settings if empty
  const count = await database.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM settings');
  if ((count?.cnt ?? 0) === 0) {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await database.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }
}

// ── Products ──────────────────────────────────────────────

export async function getAllProducts(): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync('SELECT * FROM products ORDER BY name');
}

export async function addProduct(name: string, price: number, stock: number): Promise<any> {
  const database = await getDatabase();
  return database.runAsync(
    'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)',
    [name, price, stock]
  );
}

export async function updateProduct(id: number, name: string, price: number, stock: number): Promise<any> {
  const database = await getDatabase();
  return database.runAsync(
    'UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?',
    [name, price, stock, id]
  );
}

export async function deleteProduct(id: number): Promise<any> {
  const database = await getDatabase();
  return database.runAsync('DELETE FROM products WHERE id = ?', [id]);
}

// ── Invoices ──────────────────────────────────────────────

export async function createInvoice(
  clientName: string,
  items: { productId: number; productName: string; quantity: number; unitPrice: number }[]
): Promise<number> {
  const database = await getDatabase();

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  // Generate invoice number: FAC-YYYYMMDD-XXXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const countResult = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM invoices WHERE date LIKE ?",
    [`${now.toISOString().slice(0, 10)}%`]
  );
  const seq = ((countResult?.cnt ?? 0) + 1).toString().padStart(4, '0');
  const invoiceNumber = `FAC-${dateStr}-${seq}`;

  const result = await database.runAsync(
    'INSERT INTO invoices (number, clientName, total) VALUES (?, ?, ?)',
    [invoiceNumber, clientName, total]
  );

  const invoiceId = result.lastInsertRowId;

  for (const item of items) {
    await database.runAsync(
      'INSERT INTO invoice_items (invoiceId, productId, productName, quantity, unitPrice, total) VALUES (?, ?, ?, ?, ?, ?)',
      [invoiceId, item.productId, item.productName, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
    );
    // Decrease stock
    await database.runAsync(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [item.quantity, item.productId]
    );
  }

  return invoiceId;
}

export async function getAllInvoices(): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync('SELECT * FROM invoices ORDER BY date DESC');
}

export async function getInvoiceWithItems(invoiceId: number): Promise<{ invoice: any; items: any[] }> {
  const database = await getDatabase();
  const invoice = await database.getFirstAsync('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  const items = await database.getAllAsync('SELECT * FROM invoice_items WHERE invoiceId = ?', [invoiceId]);
  return { invoice, items };
}

// ── Settings ──────────────────────────────────────────────

export async function getSettings(): Promise<BusinessSettings> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in settings) {
      (settings as any)[row.key] = row.value;
    }
  }
  return settings;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function saveSettings(settings: Partial<BusinessSettings>): Promise<void> {
  const database = await getDatabase();
  for (const [key, value] of Object.entries(settings)) {
    await database.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
}

// ── Dashboard stats ───────────────────────────────────────

export async function getDashboardStats(): Promise<{
  totalProducts: number;
  totalInvoices: number;
  todaySales: number;
  totalRevenue: number;
}> {
  const database = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);

  const products = await database.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM products');
  const invoices = await database.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM invoices');
  const todaySales = await database.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE date LIKE ?",
    [`${today}%`]
  );
  const totalRevenue = await database.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(total), 0) as total FROM invoices'
  );

  return {
    totalProducts: products?.cnt ?? 0,
    totalInvoices: invoices?.cnt ?? 0,
    todaySales: todaySales?.total ?? 0,
    totalRevenue: totalRevenue?.total ?? 0,
  };
}
