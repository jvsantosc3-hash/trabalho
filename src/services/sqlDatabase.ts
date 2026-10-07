import { PureSqlDatabase } from './sqlEngine';
import { Customer, MenuItem, Order, OrderItem, OrderStatus, PaymentMethod, QueryResult, SqlLogEntry } from '../types';

type Listener = () => void;

class SqlDatabaseService {
  private db: PureSqlDatabase | null = null;
  private isInitialized = false;
  private listeners: Set<Listener> = new Set();
  private sqlLogs: SqlLogEntry[] = [];
  private logIdCounter = 1;

  async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    try {
      this.db = new PureSqlDatabase();

      // Restore from localStorage if available
      const savedDb = localStorage.getItem('burgersql_db_state');
      if (savedDb) {
        try {
          this.db.deserialize(savedDb);
        } catch {
          this.setupSchema(true);
        }
      }

      this.setupSchema();
      this.isInitialized = true;
      this.notifyListeners();
    } catch (err) {
      console.error('SQL Engine init error:', err);
      this.db = new PureSqlDatabase();
      this.setupSchema(true);
      this.isInitialized = true;
      this.notifyListeners();
    }
  }

  private saveState(): void {
    if (!this.db) return;
    try {
      const dataStr = this.db.serialize();
      localStorage.setItem('burgersql_db_state', dataStr);
    } catch (e) {
      console.warn('Could not persist database state to localStorage:', e);
    }
  }

  public resetDatabase(): void {
    localStorage.removeItem('burgersql_db_state');
    if (!this.db) return;
    this.db.run(`
      DROP TABLE IF EXISTS order_items;
      DROP TABLE IF EXISTS orders;
      DROP TABLE IF EXISTS menu_items;
      DROP TABLE IF EXISTS customers;
    `);
    this.setupSchema(true);
    this.logQuery('DATABASE RESET TO DEFAULT SEED', 1, 'SCHEMA');
    this.notifyListeners();
  }

  private logQuery(query: string, durationMs: number, type: SqlLogEntry['type']): void {
    const entry: SqlLogEntry = {
      id: this.logIdCounter++,
      query: query.trim(),
      duration_ms: Math.round(durationMs * 100) / 100,
      executed_at: new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
    };
    this.sqlLogs.unshift(entry);
    if (this.sqlLogs.length > 100) {
      this.sqlLogs.pop();
    }
  }

  private determineQueryType(sql: string): SqlLogEntry['type'] {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('SELECT')) return 'SELECT';
    if (normalized.startsWith('INSERT')) return 'INSERT';
    if (normalized.startsWith('UPDATE')) return 'UPDATE';
    if (normalized.startsWith('DELETE')) return 'DELETE';
    if (normalized.startsWith('CREATE') || normalized.startsWith('DROP') || normalized.startsWith('ALTER')) return 'SCHEMA';
    return 'OTHER';
  }

  private setupSchema(forceSeed = false): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT,
        is_available INTEGER DEFAULT 1,
        stock INTEGER DEFAULT 50
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        order_type TEXT DEFAULT 'LOCAL',
        total_amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        custom_notes TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES menu_items(id)
      );
    `);

    // Check if table has data and clean orders
    const res = this.db.exec('SELECT COUNT(*) as count FROM menu_items;');
    const count = (res[0]?.values[0]?.[0] as number) || 0;

    let isCorrupted = false;
    try {
      const allOrd = this.db.exec('SELECT total_amount FROM orders;');
      if (allOrd.length > 0 && allOrd[0].values.length > 0) {
        for (const r of allOrd[0].values) {
          if (r[0] === null || r[0] === undefined || isNaN(Number(r[0]))) {
            isCorrupted = true;
            break;
          }
        }
      }
    } catch {
      isCorrupted = true;
    }

    if (count === 0 || forceSeed || isCorrupted) {
      if (isCorrupted && !forceSeed) {
        localStorage.removeItem('burgersql_db_state');
        this.db.run(`
          DROP TABLE IF EXISTS order_items;
          DROP TABLE IF EXISTS orders;
          DROP TABLE IF EXISTS menu_items;
          DROP TABLE IF EXISTS customers;
        `);
        this.setupSchema(true);
        return;
      }
      this.seedInitialData();
    }
  }

  private seedInitialData(): void {
    if (!this.db) return;

    // Seed customers
    this.db.run(`
      INSERT INTO customers (id, name, email, phone, address) VALUES
      (1, 'Lucas Silva', 'lucas.silva@email.com', '(11) 98765-4321', 'Rua Augusta, 450 - Consolação, SP'),
      (2, 'Mariana Costa', 'mariana.costa@email.com', '(11) 97654-3210', 'Av. Paulista, 1200, Ap 42 - Bela Vista, SP'),
      (3, 'Rodrigo Oliveira', 'rodrigo.oli@email.com', '(21) 99887-1122', 'Rua Barata Ribeiro, 300 - Copacabana, RJ'),
      (4, 'Camila Ferreira', 'camila.fe@email.com', '(31) 98456-7890', 'Rua das Flores, 78 - Savassi, BH'),
      (5, 'Felipe Santos', 'felipe.santos@email.com', '(11) 99123-4567', 'Rua Oscar Freire, 890 - Jardins, SP');
    `);

    // Seed menu items
    this.db.run(`
      INSERT INTO menu_items (id, name, description, price, category, image_url, is_available, stock) VALUES
      (1, 'Smash Bacon Supreme', 'Duplo blend 100g, queijo cheddar inglês derretido, bacon artesanal crocante e maionese defumada no pão brioche.', 38.90, 'Burgers Artesanais', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', 1, 45),
      (2, 'Truffle & Brie Burger', 'Blend angus 180g, queijo brie maçaricado, cebola caramelizada no vinho tinto, rúcula e maionese trufada.', 46.50, 'Burgers Especiais', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80', 1, 30),
      (3, 'Classic Smash Cheese', 'Duplo smash 90g com crostinha crocante, triplo cheddar fatiado, picles e molho especial secreto no brioche.', 32.00, 'Burgers Artesanais', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80', 1, 60),
      (4, 'Smoked BBQ Crispy Onions', 'Blend 180g, cheddar cremoso, onion rings sequinhas, fatias de bacon e barbecue caseiro defumado.', 42.90, 'Burgers Especiais', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=600&q=80', 1, 35),
      (5, 'Veggie Truffled Mushroom', 'Burger de cogumelos portobello e grão de bico grelhado, queijo emmental derretido e maionese de ervas.', 39.00, 'Burgers Especiais', 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=600&q=80', 1, 25),
      (6, 'Batata Rústica Alecrim & Alho', 'Batatas rústicas douradas com alecrim fresco, flor de sal marinho e alho confitado com molho da casa.', 21.00, 'Acompanhamentos', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', 1, 80),
      (7, 'Cheese Fries & Bacon Bits', 'Porção generosa de fritas cobertas com creme cheddar cremoso e farofa artesanal de bacon.', 28.50, 'Acompanhamentos', 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80', 1, 50),
      (8, 'Milkshake Nutella & Ninho', 'Sorvete artesanal batido com Nutella pura e finalizado com leite Ninho em pó e chantilly.', 24.00, 'Sobremesas', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80', 1, 40),
      (9, 'Refrigerante Artesanal Citrus 350ml', 'Refrigerante artesanal leve com extrato natural de limão siciliano e gengibre.', 9.50, 'Bebidas', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80', 1, 100),
      (10, 'Cerveja IPA Artesanal 500ml', 'Cerveja artesanal estilo American IPA com notas cítricas marcantes e amargor equilibrado.', 19.90, 'Bebidas', 'https://images.unsplash.com/photo-1608270191509-5a50785ecbfd?auto=format&fit=crop&w=600&q=80', 1, 50);
    `);

    // Seed orders
    this.db.run(`
      INSERT INTO orders (id, customer_id, status, order_type, total_amount, payment_method, notes, created_at, updated_at) VALUES
      (101, 1, 'PREPARANDO', 'VIAGEM', 67.40, 'PIX', 'Embalar para viagem com lacre térmico. Carne ao ponto para bem.', datetime('now', '-25 minutes'), datetime('now', '-10 minutes')),
      (102, 2, 'PRONTO', 'VIAGEM', 70.50, 'CARTAO_CREDITO', 'Para viagem com sachês extras da casa. Sem picles.', datetime('now', '-45 minutes'), datetime('now', '-5 minutes')),
      (103, 3, 'ENTREGANDO', 'DELIVERY', 95.80, 'PIX', 'Tocar o interfone 302.', datetime('now', '-60 minutes'), datetime('now', '-15 minutes')),
      (104, 4, 'CONCLUIDO', 'LOCAL', 42.90, 'CARTAO_DEBITO', 'Consumo no balcão.', datetime('now', '-120 minutes'), datetime('now', '-90 minutes')),
      (105, 5, 'NOVO', 'VIAGEM', 48.40, 'DINHEIRO', 'Retirada rápida para viagem.', datetime('now', '-5 minutes'), datetime('now', '-5 minutes'));
    `);

    // Seed order items
    this.db.run(`
      INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal, custom_notes) VALUES
      (101, 1, 1, 38.90, 38.90, 'Ponto da carne: bem passado'),
      (101, 7, 1, 28.50, 28.50, 'Cheddar bem quente'),
      (102, 2, 1, 46.50, 46.50, 'Sem picles'),
      (102, 8, 1, 24.00, 24.00, 'Chantilly caprichado'),
      (103, 4, 1, 42.90, 42.90, 'Barbecue extra'),
      (103, 6, 1, 21.00, 21.00, 'Alho confitado'),
      (103, 9, 2, 9.50, 19.00, 'Bem gelado'),
      (103, 8, 1, 24.00, 24.00, 'Para viagem'),
      (104, 4, 1, 42.90, 42.90, 'Tradicional'),
      (105, 1, 1, 38.90, 38.90, 'Carne suculenta'),
      (105, 9, 1, 9.50, 9.50, 'Com copo e gelo');
    `);

    this.saveState();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.saveState();
    this.listeners.forEach((listener) => listener());
  }

  // --- SQL Queries & Executions ---

  public executeCustomQuery(sqlString: string): QueryResult {
    if (!this.db) throw new Error('Banco de dados SQL não inicializado');

    const start = performance.now();
    try {
      const results = this.db.exec(sqlString);
      const duration = performance.now() - start;
      const type = this.determineQueryType(sqlString);
      this.logQuery(sqlString, duration, type);

      if (type !== 'SELECT') {
        this.notifyListeners();
      }

      if (!results || results.length === 0) {
        return {
          columns: ['Resultado'],
          values: [['Operação executada com sucesso. Nenhuma linha retornada.']],
          rowCount: 0,
          executionTimeMs: Math.round(duration * 100) / 100,
        };
      }

      const res = results[0];
      return {
        columns: res.columns,
        values: res.values,
        rowCount: res.values.length,
        executionTimeMs: Math.round(duration * 100) / 100,
      };
    } catch (err: any) {
      const duration = performance.now() - start;
      this.logQuery(`-- ERRO: ${sqlString}`, duration, 'OTHER');
      throw err;
    }
  }

  public getSqlLogs(): SqlLogEntry[] {
    return [...this.sqlLogs];
  }

  public clearSqlLogs(): void {
    this.sqlLogs = [];
    this.notifyListeners();
  }

  // --- High-level CRUD operations driven by standard SQL ---

  public getMenuItems(categoryFilter?: string): MenuItem[] {
    if (!this.db) return [];
    let sql = 'SELECT * FROM menu_items WHERE is_available = 1';
    if (categoryFilter && categoryFilter !== 'Todos') {
      sql += ` AND category = '${categoryFilter.replace(/'/g, "''")}'`;
    }
    sql += ' ORDER BY category, name;';

    const start = performance.now();
    const res = this.db.exec(sql);
    this.logQuery(sql, performance.now() - start, 'SELECT');

    if (!res || res.length === 0) return [];
    const { columns, values } = res[0];
    return values.map((row) => {
      const item: any = {};
      columns.forEach((col, idx) => {
        item[col] = row[idx];
      });
      return item as MenuItem;
    });
  }

  public getAllMenuItemsAdmin(): MenuItem[] {
    if (!this.db) return [];
    const sql = 'SELECT * FROM menu_items ORDER BY id DESC;';
    const start = performance.now();
    const res = this.db.exec(sql);
    this.logQuery(sql, performance.now() - start, 'SELECT');

    if (!res || res.length === 0) return [];
    const { columns, values } = res[0];
    return values.map((row) => {
      const item: any = {};
      columns.forEach((col, idx) => {
        item[col] = row[idx];
      });
      return item as MenuItem;
    });
  }

  public getCustomers(searchTerm?: string): Customer[] {
    if (!this.db) return [];
    let sql = `
      SELECT 
        c.id, c.name, c.email, c.phone, c.address, c.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
    `;
    if (searchTerm) {
      const clean = searchTerm.replace(/'/g, "''").toLowerCase();
      sql += ` WHERE LOWER(c.name) LIKE '%${clean}%' OR LOWER(c.email) LIKE '%${clean}%' OR c.phone LIKE '%${clean}%'`;
    }
    sql += ' GROUP BY c.id ORDER BY total_orders DESC, c.id DESC;';

    const start = performance.now();
    const res = this.db.exec(sql);
    this.logQuery(sql, performance.now() - start, 'SELECT');

    if (!res || res.length === 0) return [];
    const { columns, values } = res[0];
    return values.map((row) => {
      const item: any = {};
      columns.forEach((col, idx) => {
        item[col] = row[idx];
      });
      return item as Customer;
    });
  }

  public getOrders(statusFilter?: OrderStatus | 'TODOS'): Order[] {
    if (!this.db) return [];
    let sql = `
      SELECT 
        o.id, o.customer_id, o.status, o.order_type, o.total_amount, o.payment_method, o.notes, o.created_at, o.updated_at,
        c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.email as customer_email
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
    `;
    if (statusFilter && statusFilter !== 'TODOS') {
      sql += ` WHERE o.status = '${statusFilter}'`;
    }
    sql += ' ORDER BY o.id DESC;';

    const start = performance.now();
    const res = this.db.exec(sql);
    this.logQuery(sql, performance.now() - start, 'SELECT');

    if (!res || res.length === 0) return [];
    const { columns, values } = res[0];
    const orders: Order[] = values.map((row) => {
      const order: any = {};
      columns.forEach((col, idx) => {
        order[col] = row[idx];
      });
      return order as Order;
    });

    // Populate order items for each order
    for (const order of orders) {
      order.total_amount = Number(order.total_amount) || 0;
      order.order_type = order.order_type || 'LOCAL';
      order.items = this.getOrderItems(order.id);
    }

    return orders;
  }

  public getOrderItems(orderId: number): OrderItem[] {
    if (!this.db) return [];
    const sql = `
      SELECT 
        oi.id, oi.order_id, oi.item_id, oi.quantity, oi.unit_price, oi.subtotal, oi.custom_notes,
        mi.name as item_name, mi.image_url
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.id
      WHERE oi.order_id = ${orderId};
    `;
    const res = this.db.exec(sql);
    if (!res || res.length === 0) return [];
    const { columns, values } = res[0];
    return values.map((row) => {
      const item: any = {};
      columns.forEach((col, idx) => {
        item[col] = row[idx];
      });
      return item as OrderItem;
    });
  }

  public createOrder(
    customerId: number,
    items: { item: MenuItem; quantity: number; custom_notes?: string }[],
    paymentMethod: PaymentMethod,
    notes: string,
    orderType: import('../types').OrderType = 'LOCAL'
  ): number {
    if (!this.db) throw new Error('Database not ready');

    const totalAmount = items.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
    const start = performance.now();

    // Begin SQL Transaction
    this.db.run('BEGIN TRANSACTION;');

    const escapedNotes = (notes || '').replace(/'/g, "''");
    this.db.run(`
      INSERT INTO orders (customer_id, status, order_type, total_amount, payment_method, notes, created_at, updated_at)
      VALUES (${customerId}, 'NOVO', '${orderType}', ${totalAmount.toFixed(2)}, '${paymentMethod}', '${escapedNotes}', datetime('now'), datetime('now'));
    `);

    // Get the generated order ID
    const idRes = this.db.exec('SELECT last_insert_rowid() as id;');
    const orderId = idRes[0].values[0][0] as number;

    // Insert order items and decrease stock
    for (const line of items) {
      const subtotal = line.item.price * line.quantity;
      const notesLine = (line.custom_notes || '').replace(/'/g, "''");
      this.db.run(`
        INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal, custom_notes)
        VALUES (${orderId}, ${line.item.id}, ${line.quantity}, ${line.item.price.toFixed(2)}, ${subtotal.toFixed(2)}, '${notesLine}');
      `);
      this.db.run(`
        UPDATE menu_items SET stock = MAX(0, stock - ${line.quantity}) WHERE id = ${line.item.id};
      `);
    }

    this.db.run('COMMIT;');

    const duration = performance.now() - start;
    this.logQuery(`TRANSACTION: INSERT INTO orders #${orderId} & order_items (${items.length} itens)`, duration, 'INSERT');

    this.notifyListeners();
    return orderId;
  }

  public updateOrderStatus(orderId: number, status: OrderStatus): void {
    if (!this.db) return;
    const start = performance.now();
    const sql = `UPDATE orders SET status = '${status}', updated_at = datetime('now') WHERE id = ${orderId};`;
    this.db.run(sql);
    this.logQuery(sql, performance.now() - start, 'UPDATE');
    this.notifyListeners();
  }

  public createCustomer(name: string, email: string, phone: string, address: string): number {
    if (!this.db) throw new Error('Database not ready');
    const start = performance.now();
    const escName = name.replace(/'/g, "''");
    const escEmail = email.replace(/'/g, "''");
    const escPhone = phone.replace(/'/g, "''");
    const escAddress = address.replace(/'/g, "''");

    const sql = `
      INSERT INTO customers (name, email, phone, address, created_at)
      VALUES ('${escName}', '${escEmail}', '${escPhone}', '${escAddress}', datetime('now'));
    `;
    this.db.run(sql);
    const idRes = this.db.exec('SELECT last_insert_rowid() as id;');
    const id = idRes[0].values[0][0] as number;
    this.logQuery(sql, performance.now() - start, 'INSERT');
    this.notifyListeners();
    return id;
  }

  public updateCustomer(id: number, name: string, email: string, phone: string, address: string): void {
    if (!this.db) return;
    const start = performance.now();
    const escName = name.replace(/'/g, "''");
    const escEmail = email.replace(/'/g, "''");
    const escPhone = phone.replace(/'/g, "''");
    const escAddress = address.replace(/'/g, "''");

    const sql = `
      UPDATE customers 
      SET name = '${escName}', email = '${escEmail}', phone = '${escPhone}', address = '${escAddress}'
      WHERE id = ${id};
    `;
    this.db.run(sql);
    this.logQuery(sql, performance.now() - start, 'UPDATE');
    this.notifyListeners();
  }

  public deleteCustomer(id: number): void {
    if (!this.db) return;
    const start = performance.now();
    const sql = `DELETE FROM customers WHERE id = ${id};`;
    this.db.run(sql);
    this.logQuery(sql, performance.now() - start, 'DELETE');
    this.notifyListeners();
  }

  public createMenuItem(
    name: string,
    description: string,
    price: number,
    category: string,
    imageUrl: string,
    stock: number
  ): number {
    if (!this.db) throw new Error('Database not ready');
    const start = performance.now();
    const escName = name.replace(/'/g, "''");
    const escDesc = description.replace(/'/g, "''");
    const escCat = category.replace(/'/g, "''");
    const escImg = imageUrl.replace(/'/g, "''");

    const sql = `
      INSERT INTO menu_items (name, description, price, category, image_url, is_available, stock)
      VALUES ('${escName}', '${escDesc}', ${price.toFixed(2)}, '${escCat}', '${escImg}', 1, ${stock});
    `;
    this.db.run(sql);
    const idRes = this.db.exec('SELECT last_insert_rowid() as id;');
    const id = idRes[0].values[0][0] as number;
    this.logQuery(sql, performance.now() - start, 'INSERT');
    this.notifyListeners();
    return id;
  }

  public updateMenuItem(
    id: number,
    name: string,
    description: string,
    price: number,
    category: string,
    imageUrl: string,
    isAvailable: number,
    stock: number
  ): void {
    if (!this.db) return;
    const start = performance.now();
    const escName = name.replace(/'/g, "''");
    const escDesc = description.replace(/'/g, "''");
    const escCat = category.replace(/'/g, "''");
    const escImg = imageUrl.replace(/'/g, "''");

    const sql = `
      UPDATE menu_items 
      SET name = '${escName}', description = '${escDesc}', price = ${price.toFixed(2)}, 
          category = '${escCat}', image_url = '${escImg}', is_available = ${isAvailable}, stock = ${stock}
      WHERE id = ${id};
    `;
    this.db.run(sql);
    this.logQuery(sql, performance.now() - start, 'UPDATE');
    this.notifyListeners();
  }

  public toggleItemAvailability(id: number, currentAvailable: number): void {
    if (!this.db) return;
    const start = performance.now();
    const nextVal = currentAvailable === 1 ? 0 : 1;
    const sql = `UPDATE menu_items SET is_available = ${nextVal} WHERE id = ${id};`;
    this.db.run(sql);
    this.logQuery(sql, performance.now() - start, 'UPDATE');
    this.notifyListeners();
  }

  public deleteMenuItem(id: number): void {
    if (!this.db) return;
    const start = performance.now();
    const sql = `DELETE FROM menu_items WHERE id = ${id};`;
    this.db.run(sql);
    this.logQuery(sql, performance.now() - start, 'DELETE');
    this.notifyListeners();
  }

  // --- Real-time statistics aggregation directly via SQL queries ---

  public getDashboardStats() {
    if (!this.db) return { totalRevenue: 0, totalOrders: 0, activeOrders: 0, customersCount: 0 };

    try {
      const revRes = this.db.exec(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COUNT(id) as total_orders,
          SUM(CASE WHEN status IN ('NOVO', 'PREPARANDO', 'PRONTO', 'ENTREGANDO') THEN 1 ELSE 0 END) as active_orders
        FROM orders;
      `);
      const custRes = this.db.exec('SELECT COUNT(*) as count FROM customers;');

      const row = revRes[0]?.values[0] || [0, 0, 0];
      const custCount = custRes[0]?.values[0]?.[0] || 0;

      return {
        totalRevenue: (row[0] as number) || 0,
        totalOrders: (row[1] as number) || 0,
        activeOrders: (row[2] as number) || 0,
        customersCount: (custCount as number) || 0,
      };
    } catch {
      return { totalRevenue: 0, totalOrders: 0, activeOrders: 0, customersCount: 0 };
    }
  }

  public getTopSellingItems(): { name: string; total_sold: number; total_revenue: number }[] {
    if (!this.db) return [];
    try {
      const sql = `
        SELECT mi.name, SUM(oi.quantity) as total_sold, SUM(oi.subtotal) as total_revenue
        FROM order_items oi
        JOIN menu_items mi ON oi.item_id = mi.id
        GROUP BY mi.id
        ORDER BY total_sold DESC
        LIMIT 5;
      `;
      const res = this.db.exec(sql);
      if (!res || res.length === 0) return [];
      return res[0].values.map((v) => ({
        name: String(v[0] || ''),
        total_sold: Number(v[1]) || 0,
        total_revenue: Number(v[2]) || 0,
      }));
    } catch {
      return [];
    }
  }

  public simulateRandomOrder(): number | null {
    if (!this.db) return null;
    const customers = this.getCustomers();
    const menuItems = this.getMenuItems();
    if (customers.length === 0 || menuItems.length === 0) return null;

    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const itemCount = Math.floor(Math.random() * 2) + 1; // 1 to 2 items
    const selectedItems: { item: MenuItem; quantity: number; custom_notes?: string }[] = [];

    for (let i = 0; i < itemCount; i++) {
      const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      selectedItems.push({
        item: randomItem,
        quantity: Math.floor(Math.random() * 2) + 1,
        custom_notes: Math.random() > 0.5 ? 'Preparação padrão caprichada' : undefined,
      });
    }

    const methods: PaymentMethod[] = ['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO'];
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    const randomOrderType: import('../types').OrderType = Math.random() > 0.4 ? 'VIAGEM' : 'LOCAL';

    return this.createOrder(
      randomCustomer.id,
      selectedItems,
      randomMethod,
      randomOrderType === 'VIAGEM'
        ? 'Pedido para viagem gerado pelo simulador (embalagem térmica e lacre)'
        : 'Pedido no local gerado pelo simulador',
      randomOrderType
    );
  }
}

export const sqlDb = new SqlDatabaseService();
