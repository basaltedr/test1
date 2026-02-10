import * as SQLite from 'expo-sqlite';
import { BusinessSettings, SalesPeriodStats, TopProduct } from '../types';

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
  invoiceTemplate: 'modern',
  invoiceColor: '#1B6FEE',
  logoBase64: '',
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

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6B7280'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      lowStockThreshold INTEGER NOT NULL DEFAULT 5,
      categoryId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
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

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('sale','restock','adjustment')),
      quantity INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (productId) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migrate: add columns if missing (safe for existing DBs)
  try {
    await database.execAsync(`ALTER TABLE products ADD COLUMN lowStockThreshold INTEGER NOT NULL DEFAULT 5`);
  } catch { /* column already exists */ }
  try {
    await database.execAsync(`ALTER TABLE products ADD COLUMN categoryId INTEGER REFERENCES categories(id) ON DELETE SET NULL`);
  } catch { /* column already exists */ }

  // Seed default settings if empty
  const count = await database.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM settings');
  if ((count?.cnt ?? 0) === 0) {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await database.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }
}

// ── Categories ────────────────────────────────────────────

export async function getAllCategories(): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync('SELECT * FROM categories ORDER BY name');
}

export async function addCategory(name: string, color: string): Promise<any> {
  const database = await getDatabase();
  return database.runAsync('INSERT INTO categories (name, color) VALUES (?, ?)', [name, color]);
}

export async function updateCategory(id: number, name: string, color: string): Promise<any> {
  const database = await getDatabase();
  return database.runAsync('UPDATE categories SET name = ?, color = ? WHERE id = ?', [name, color, id]);
}

export async function deleteCategory(id: number): Promise<any> {
  const database = await getDatabase();
  return database.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

// ── Products ──────────────────────────────────────────────

export async function getAllProducts(search?: string, categoryId?: number | null): Promise<any[]> {
  const database = await getDatabase();
  let query = `
    SELECT p.*, c.name as categoryName, c.color as categoryColor
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search && search.trim()) {
    query += ` AND p.name LIKE ?`;
    params.push(`%${search.trim()}%`);
  }
  if (categoryId !== undefined && categoryId !== null) {
    query += ` AND p.categoryId = ?`;
    params.push(categoryId);
  }
  query += ` ORDER BY p.name`;
  return database.getAllAsync(query, params);
}

export async function addProduct(name: string, price: number, stock: number, categoryId?: number | null, lowStockThreshold?: number): Promise<any> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO products (name, price, stock, categoryId, lowStockThreshold) VALUES (?, ?, ?, ?, ?)',
    [name, price, stock, categoryId ?? null, lowStockThreshold ?? 5]
  );
  // Record initial stock
  if (stock > 0) {
    await database.runAsync(
      'INSERT INTO stock_movements (productId, productName, type, quantity) VALUES (?, ?, ?, ?)',
      [result.lastInsertRowId, name, 'restock', stock]
    );
  }
  return result;
}

export async function updateProduct(id: number, name: string, price: number, stock: number, categoryId?: number | null, lowStockThreshold?: number): Promise<any> {
  const database = await getDatabase();
  // Get old stock to record movement
  const old = await database.getFirstAsync<{ stock: number; name: string }>('SELECT stock, name FROM products WHERE id = ?', [id]);
  const diff = stock - (old?.stock ?? 0);

  const result = await database.runAsync(
    'UPDATE products SET name = ?, price = ?, stock = ?, categoryId = ?, lowStockThreshold = ? WHERE id = ?',
    [name, price, stock, categoryId ?? null, lowStockThreshold ?? 5, id]
  );

  if (diff !== 0) {
    await database.runAsync(
      'INSERT INTO stock_movements (productId, productName, type, quantity) VALUES (?, ?, ?, ?)',
      [id, name, diff > 0 ? 'restock' : 'adjustment', Math.abs(diff)]
    );
  }
  return result;
}

export async function restockProduct(id: number, quantity: number): Promise<void> {
  const database = await getDatabase();
  const product = await database.getFirstAsync<{ name: string }>('SELECT name FROM products WHERE id = ?', [id]);
  await database.runAsync('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, id]);
  await database.runAsync(
    'INSERT INTO stock_movements (productId, productName, type, quantity) VALUES (?, ?, ?, ?)',
    [id, product?.name ?? '', 'restock', quantity]
  );
}

export async function deleteProduct(id: number): Promise<any> {
  const database = await getDatabase();
  return database.runAsync('DELETE FROM products WHERE id = ?', [id]);
}

export async function getLowStockProducts(): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    `SELECT p.*, c.name as categoryName, c.color as categoryColor
     FROM products p LEFT JOIN categories c ON p.categoryId = c.id
     WHERE p.stock <= p.lowStockThreshold
     ORDER BY p.stock ASC`
  );
}

// ── Stock Movements ───────────────────────────────────────

export async function getStockMovements(productId?: number, limit = 50): Promise<any[]> {
  const database = await getDatabase();
  let query = 'SELECT * FROM stock_movements';
  const params: any[] = [];
  if (productId) {
    query += ' WHERE productId = ?';
    params.push(productId);
  }
  query += ` ORDER BY date DESC LIMIT ?`;
  params.push(limit);
  return database.getAllAsync(query, params);
}

// ── Invoices ──────────────────────────────────────────────

export async function createInvoice(
  clientName: string,
  items: { productId: number; productName: string; quantity: number; unitPrice: number }[]
): Promise<number> {
  const database = await getDatabase();

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

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
    await database.runAsync('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
    // Record stock movement
    await database.runAsync(
      'INSERT INTO stock_movements (productId, productName, type, quantity) VALUES (?, ?, ?, ?)',
      [item.productId, item.productName, 'sale', item.quantity]
    );
  }

  return invoiceId;
}

export async function getAllInvoices(search?: string, dateFrom?: string, dateTo?: string): Promise<any[]> {
  const database = await getDatabase();
  let query = 'SELECT * FROM invoices WHERE 1=1';
  const params: any[] = [];

  if (search && search.trim()) {
    query += ` AND (number LIKE ? OR clientName LIKE ?)`;
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (dateFrom) {
    query += ` AND date >= ?`;
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ` AND date <= ?`;
    params.push(dateTo + ' 23:59:59');
  }
  query += ' ORDER BY date DESC';
  return database.getAllAsync(query, params);
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
  await database.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function saveSettings(settings: Partial<BusinessSettings>): Promise<void> {
  const database = await getDatabase();
  for (const [key, value] of Object.entries(settings)) {
    await database.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
}

// ── Dashboard stats ───────────────────────────────────────

export async function getDashboardStats(): Promise<{
  totalProducts: number;
  totalInvoices: number;
  todaySales: number;
  totalRevenue: number;
  lowStockCount: number;
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
  const lowStock = await database.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM products WHERE stock <= lowStockThreshold'
  );

  return {
    totalProducts: products?.cnt ?? 0,
    totalInvoices: invoices?.cnt ?? 0,
    todaySales: todaySales?.total ?? 0,
    totalRevenue: totalRevenue?.total ?? 0,
    lowStockCount: lowStock?.cnt ?? 0,
  };
}

// ── Sales history / analytics ─────────────────────────────

export async function getSalesByPeriod(period: 'day' | 'week' | 'month' | 'year'): Promise<SalesPeriodStats[]> {
  const database = await getDatabase();

  let groupExpr: string;
  let labelExpr: string;
  let limit: number;

  switch (period) {
    case 'day':
      groupExpr = "strftime('%Y-%m-%d', date)";
      labelExpr = "strftime('%d/%m', date)";
      limit = 14;
      break;
    case 'week':
      groupExpr = "strftime('%Y-%W', date)";
      labelExpr = "'S' || strftime('%W', date)";
      limit = 12;
      break;
    case 'month':
      groupExpr = "strftime('%Y-%m', date)";
      labelExpr = "strftime('%m/%Y', date)";
      limit = 12;
      break;
    case 'year':
      groupExpr = "strftime('%Y', date)";
      labelExpr = "strftime('%Y', date)";
      limit = 5;
      break;
  }

  return database.getAllAsync<SalesPeriodStats>(
    `SELECT ${labelExpr} as periodLabel,
            COALESCE(SUM(total), 0) as total,
            COUNT(*) as count
     FROM invoices
     GROUP BY ${groupExpr}
     ORDER BY ${groupExpr} DESC
     LIMIT ?`,
    [limit]
  );
}

export async function getTopProducts(limit = 5, dateFrom?: string): Promise<TopProduct[]> {
  const database = await getDatabase();
  let query = `
    SELECT productName,
           SUM(quantity) as totalQty,
           SUM(total) as totalRevenue
    FROM invoice_items
  `;
  const params: any[] = [];
  if (dateFrom) {
    query += ` WHERE invoiceId IN (SELECT id FROM invoices WHERE date >= ?)`;
    params.push(dateFrom);
  }
  query += ` GROUP BY productName ORDER BY totalRevenue DESC LIMIT ?`;
  params.push(limit);
  return database.getAllAsync<TopProduct>(query, params);
}

// ── Export helpers ─────────────────────────────────────────

export async function exportProductsCSV(): Promise<string> {
  const database = await getDatabase();
  const products = await database.getAllAsync<any>(
    `SELECT p.name, p.price, p.stock, p.lowStockThreshold, c.name as category, p.createdAt
     FROM products p LEFT JOIN categories c ON p.categoryId = c.id ORDER BY p.name`
  );
  let csv = 'Nom,Prix,Stock,Seuil alerte,Catégorie,Date création\n';
  for (const p of products) {
    csv += `"${p.name}",${p.price},${p.stock},${p.lowStockThreshold},"${p.category ?? ''}","${p.createdAt}"\n`;
  }
  return csv;
}

export async function exportInvoicesCSV(): Promise<string> {
  const database = await getDatabase();
  const invoices = await database.getAllAsync<any>('SELECT * FROM invoices ORDER BY date DESC');
  let csv = 'Numéro,Client,Date,Total\n';
  for (const inv of invoices) {
    csv += `"${inv.number}","${inv.clientName}","${inv.date}",${inv.total}\n`;
  }
  return csv;
}

export async function exportSalesDetailCSV(): Promise<string> {
  const database = await getDatabase();
  const items = await database.getAllAsync<any>(
    `SELECT i.number, i.clientName, i.date, ii.productName, ii.quantity, ii.unitPrice, ii.total
     FROM invoice_items ii
     JOIN invoices i ON ii.invoiceId = i.id
     ORDER BY i.date DESC`
  );
  let csv = 'Facture,Client,Date,Produit,Quantité,Prix unitaire,Total\n';
  for (const it of items) {
    csv += `"${it.number}","${it.clientName}","${it.date}","${it.productName}",${it.quantity},${it.unitPrice},${it.total}\n`;
  }
  return csv;
}
