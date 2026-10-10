import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'smartserve.db');

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode & foreign keys
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

export function initDatabase() {
  db.exec(`
    -- Users & Profiles
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'admin', 'waiter', 'kitchen', 'customer'
      email TEXT,
      phone TEXT,
      avatar TEXT,
      loyalty_points INTEGER DEFAULT 120,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Employees
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      position TEXT NOT NULL,
      wage_rate REAL NOT NULL, -- hourly rate in USD
      overtime_rate REAL NOT NULL, -- overtime multiplier or rate
      employment_status TEXT DEFAULT 'active', -- 'active', 'on_leave', 'terminated'
      hire_date DATE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Attendance & Shift Tracking
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      clock_in DATETIME NOT NULL,
      clock_out DATETIME,
      break_minutes INTEGER DEFAULT 0,
      break_start DATETIME,
      verified_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'clocked_in', -- 'clocked_in', 'on_break', 'clocked_out'
      audit_reason TEXT,
      corrected_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    -- Payroll Reviews
    CREATE TABLE IF NOT EXISTS payroll_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      regular_hours REAL NOT NULL,
      overtime_hours REAL NOT NULL,
      hourly_rate REAL NOT NULL,
      gross_estimate REAL NOT NULL,
      adjustments REAL DEFAULT 0,
      net_estimate REAL NOT NULL,
      status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'paid'
      approved_by INTEGER,
      approved_at DATETIME,
      payment_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      lead_time_days INTEGER DEFAULT 2,
      min_order_value REAL DEFAULT 50.0,
      rating REAL DEFAULT 4.8,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ingredients & Stock
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      unit TEXT NOT NULL, -- 'g', 'ml', 'pcs', 'kg'
      current_stock REAL NOT NULL,
      min_threshold REAL NOT NULL,
      target_stock REAL NOT NULL,
      unit_cost REAL NOT NULL,
      supplier_id INTEGER,
      expiry_date DATE,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    -- Inventory Movements Log
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      change_amount REAL NOT NULL,
      previous_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      reason TEXT NOT NULL, -- 'order_deduction', 'delivery_restock', 'wastage', 'manual_adjustment'
      reference_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );

    -- Purchase Orders (Automatic / Manual Reordering)
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      status TEXT DEFAULT 'suggested', -- 'suggested', 'approved', 'ordered', 'received', 'verified', 'cancelled'
      total_cost REAL NOT NULL,
      items_json TEXT NOT NULL, -- array of { ingredient_id, name, quantity, unit, unit_cost }
      expected_delivery DATE,
      verified_by INTEGER,
      verified_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    -- Menu Categories & Items
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      icon TEXT,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      prep_time_minutes INTEGER DEFAULT 10,
      image_url TEXT,
      is_available INTEGER DEFAULT 1, -- 1 = in stock, 0 = unavailable
      dietary_tags TEXT, -- JSON array: ["vegetarian", "vegan", "gluten_free", ...]
      allergens TEXT, -- JSON array: ["dairy", "nuts", "gluten", ...]
      cross_contamination_risk TEXT,
      customizable_options TEXT, -- JSON array: [{ name, options: [{ label, price }] }]
      calories INTEGER,
      is_hurry_mode INTEGER DEFAULT 0, -- 1 if naturally quick (< 10 min)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- Recipes (Binds Menu Item to Ingredients)
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_item_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity_required REAL NOT NULL,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
      UNIQUE(menu_item_id, ingredient_id)
    );

    -- Restaurant Tables & Floor Plan
    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL,
      section TEXT DEFAULT 'Main Dining',
      status TEXT DEFAULT 'available', -- 'available', 'occupied', 'reserved', 'cleaning'
      assigned_waiter_id INTEGER,
      current_order_id INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_waiter_id) REFERENCES employees(id)
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      order_type TEXT DEFAULT 'dine_in', -- 'dine_in', 'takeaway'
      table_id INTEGER,
      status TEXT DEFAULT 'placed', -- 'placed', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL,
      service_charge REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      prep_time_estimate INTEGER DEFAULT 15,
      hurry_mode INTEGER DEFAULT 0,
      special_instructions TEXT,
      payment_status TEXT DEFAULT 'pending', -- 'pending', 'split_pending', 'paid', 'refunded'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
    );

    -- Order Items
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      selected_options TEXT, -- JSON
      special_instructions TEXT,
      item_status TEXT DEFAULT 'pending', -- 'pending', 'preparing', 'ready'
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );

    -- Bill Splits
    CREATE TABLE IF NOT EXISTS bill_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      split_type TEXT NOT NULL, -- 'equal', 'by_item'
      person_name TEXT NOT NULL,
      assigned_items TEXT, -- JSON
      subtotal_share REAL NOT NULL,
      tax_share REAL NOT NULL,
      service_share REAL NOT NULL,
      discount_share REAL DEFAULT 0,
      total_share REAL NOT NULL,
      payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
      payment_reference TEXT,
      paid_at DATETIME,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      split_id INTEGER,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL, -- 'card', 'apple_pay', 'upi', 'cash'
      transaction_reference TEXT NOT NULL,
      status TEXT DEFAULT 'successful', -- 'successful', 'failed', 'refunded'
      gateway_provider TEXT DEFAULT 'Stripe (Sandbox Mode)',
      failure_reason TEXT,
      refund_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- Service Requests (Water, Cutlery, Waiter, Bill)
    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      table_number TEXT NOT NULL,
      request_type TEXT NOT NULL, -- 'water', 'cutlery', 'napkins', 'waiter_call', 'bill'
      status TEXT DEFAULT 'pending', -- 'pending', 'acknowledged', 'completed'
      assigned_staff_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
    );

    -- Order Issues & Delays
    CREATE TABLE IF NOT EXISTS order_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      reported_by TEXT NOT NULL,
      issue_type TEXT NOT NULL, -- 'delay', 'kitchen_bottleneck', 'incorrect_item', 'allergy_concern'
      description TEXT NOT NULL,
      severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
      status TEXT DEFAULT 'reported', -- 'reported', 'investigating', 'resolved'
      resolution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- Loyalty Program & Ledger
    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      points_cost INTEGER NOT NULL,
      reward_type TEXT NOT NULL, -- 'discount_fixed', 'free_item', 'discount_percent'
      reward_value REAL NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER,
      points_change INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Coupons & Promotional Offers
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      discount_type TEXT NOT NULL, -- 'percentage', 'fixed'
      discount_value REAL NOT NULL,
      min_order_amount REAL DEFAULT 0,
      max_discount REAL,
      expiry_date DATE NOT NULL,
      usage_limit INTEGER DEFAULT 1000,
      times_used INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    -- Customer Inconvenience Compensation
    CREATE TABLE IF NOT EXISTS compensations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      order_id INTEGER,
      issue_id INTEGER,
      compensation_type TEXT NOT NULL, -- 'loyalty_points', 'coupon', 'refund'
      value_amount REAL NOT NULL,
      description TEXT NOT NULL,
      authorized_by TEXT NOT NULL,
      status TEXT DEFAULT 'granted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (issue_id) REFERENCES order_issues(id)
    );

    -- Ratings and Feedback
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      customer_name TEXT NOT NULL,
      food_rating INTEGER NOT NULL,
      service_rating INTEGER NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- Shift Handover Notes
    CREATE TABLE IF NOT EXISTS shift_handover_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_name TEXT NOT NULL,
      shift_type TEXT NOT NULL, -- 'morning', 'afternoon', 'evening'
      notes TEXT NOT NULL,
      urgent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Operational Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- 'inventory_cogs', 'utilities', 'maintenance', 'staff_bonus', 'packaging'
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      expense_date DATE DEFAULT (DATE('now')),
      recorded_by TEXT DEFAULT 'Admin System',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT,
      role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Run initial seed if users table is empty
  seedInitialData();
}

export function logAudit(userName, role, action, entityType, entityId, details) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_name, role, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userName || 'System', role || 'system', action, entityType, String(entityId || ''), typeof details === 'object' ? JSON.stringify(details) : String(details || ''));
  } catch (err) {
    console.error('Audit log failure:', err);
  }
}

// Evaluate each dish against available inventory
export function recalculateMenuAvailability() {
  const menuItems = db.prepare('SELECT id, name FROM menu_items').all();
  let unavailableCount = 0;

  for (const item of menuItems) {
    const recipeRows = db.prepare(`
      SELECT r.quantity_required, i.current_stock, i.name as ingredient_name
      FROM recipes r
      JOIN ingredients i ON r.ingredient_id = i.id
      WHERE r.menu_item_id = ?
    `).all(item.id);

    let isAvailable = 1;
    if (recipeRows.length > 0) {
      for (const row of recipeRows) {
        if (row.current_stock < row.quantity_required) {
          isAvailable = 0;
          break;
        }
      }
    }

    db.prepare('UPDATE menu_items SET is_available = ? WHERE id = ?').run(isAvailable, item.id);
    if (!isAvailable) unavailableCount++;
  }

  return unavailableCount;
}

// Check if any ingredients have reached <= min_threshold and auto-generate suggested POs
export function checkAndAutoGeneratePOs() {
  const lowStock = db.prepare(`
    SELECT i.*, s.name as supplier_name, s.min_order_value, s.lead_time_days
    FROM ingredients i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.current_stock <= i.min_threshold
  `).all();

  const generatedPOs = [];

  for (const item of lowStock) {
    if (!item.supplier_id) continue;

    // Check if there's already an active (suggested, approved, or ordered) PO for this ingredient
    const existingPOs = db.prepare(`
      SELECT id, items_json FROM purchase_orders 
      WHERE supplier_id = ? AND status IN ('suggested', 'approved', 'ordered')
    `).all(item.supplier_id);

    let alreadyCovered = false;
    for (const po of existingPOs) {
      try {
        const poItems = JSON.parse(po.items_json);
        if (poItems.some(p => p.ingredient_id === item.id)) {
          alreadyCovered = true;
          break;
        }
      } catch (e) {}
    }

    if (alreadyCovered) continue;

    // Calculate suggested reorder quantity (target - current)
    const suggestedQty = Math.max(item.target_stock - item.current_stock, item.min_threshold * 2);
    const totalCost = Number((suggestedQty * item.unit_cost).toFixed(2));
    const poNumber = `PO-${Date.now().toString().slice(-6)}-${item.id}`;

    const itemsJson = JSON.stringify([{
      ingredient_id: item.id,
      name: item.name,
      quantity: suggestedQty,
      unit: item.unit,
      unit_cost: item.unit_cost,
      line_total: totalCost
    }]);

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + (item.lead_time_days || 2));

    const result = db.prepare(`
      INSERT INTO purchase_orders (po_number, supplier_id, status, total_cost, items_json, expected_delivery, notes)
      VALUES (?, ?, 'suggested', ?, ?, ?, ?)
    `).run(
      poNumber,
      item.supplier_id,
      totalCost,
      itemsJson,
      expectedDate.toISOString().split('T')[0],
      `Auto-generated: ${item.name} stock (${item.current_stock} ${item.unit}) dropped below threshold (${item.min_threshold} ${item.unit})`
    );

    generatedPOs.push({ id: result.lastInsertRowid, poNumber, ingredient: item.name, quantity: suggestedQty });
  }

  return generatedPOs;
}

// Calculate current kitchen workload factor
export function getKitchenWorkloadInfo() {
  const activeOrders = db.prepare(`
    SELECT id, status, prep_time_estimate, hurry_mode, created_at
    FROM orders
    WHERE status IN ('confirmed', 'preparing')
  `).all();

  const queuedOrders = db.prepare(`
    SELECT id FROM orders WHERE status = 'placed'
  `).all();

  const totalActive = activeOrders.length;
  const queuedCount = queuedOrders.length;
  // Dynamic queue delay: each active preparing order adds ~2.5 mins kitchen queue delay
  const queueDelayMinutes = Math.min(Math.round(totalActive * 2.5), 30);
  const capacityPct = Math.min(Math.round(((totalActive + queuedCount) / 12) * 100), 100);

  return {
    activeOrdersCount: totalActive,
    queuedOrdersCount: queuedCount,
    queueDelayMinutes,
    capacityPct,
    isBottleneck: totalActive >= 8
  };
}

// Atomic Place Order with inventory deductions and transaction safeguards
export function atomicPlaceOrder(orderData) {
  // Validate items
  const { customer_id, customer_name, order_type, table_id, items, hurry_mode, special_instructions, coupon_code } = orderData;
  if (!items || items.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  // Pre-check stock for all items
  for (const item of items) {
    const recipes = db.prepare(`
      SELECT r.quantity_required, i.name as ingredient_name, i.current_stock, i.unit
      FROM recipes r
      JOIN ingredients i ON r.ingredient_id = i.id
      WHERE r.menu_item_id = ?
    `).all(item.menu_item_id);

    for (const r of recipes) {
      const needed = r.quantity_required * item.quantity;
      if (r.current_stock < needed) {
        throw new Error(`Insufficient stock for "${r.ingredient_name}" required by ${item.name}. Available: ${r.current_stock}${r.unit}, Needed: ${needed}${r.unit}.`);
      }
    }
  }

  // Calculate pricing
  let subtotal = 0;
  for (const item of items) {
    subtotal += (item.unit_price * item.quantity);
  }

  let discount_amount = 0;
  if (coupon_code) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(coupon_code);
    if (coupon) {
      if (subtotal >= coupon.min_order_amount) {
        if (coupon.discount_type === 'percentage') {
          discount_amount = (subtotal * coupon.discount_value) / 100;
          if (coupon.max_discount && discount_amount > coupon.max_discount) {
            discount_amount = coupon.max_discount;
          }
        } else {
          discount_amount = coupon.discount_value;
        }
        db.prepare('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?').run(coupon.id);
      }
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount_amount);
  const tax_amount = Number((discountedSubtotal * 0.08).toFixed(2)); // 8% tax
  const service_charge = Number((discountedSubtotal * 0.05).toFixed(2)); // 5% service charge
  const total_amount = Number((discountedSubtotal + tax_amount + service_charge).toFixed(2));

  // Calculate estimated wait time based on dishes and kitchen load
  const maxDishPrep = Math.max(...items.map(it => it.prep_time_minutes || 10));
  const kitchen = getKitchenWorkloadInfo();
  const prep_time_estimate = maxDishPrep + kitchen.queueDelayMinutes;

  const order_number = `ORD-${Date.now().toString().slice(-6)}`;

  // Begin transaction
  db.exec('BEGIN TRANSACTION');
  try {
    const orderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, customer_id, customer_name, order_type, table_id,
        status, subtotal, tax_amount, service_charge, discount_amount,
        total_amount, prep_time_estimate, hurry_mode, special_instructions, payment_status
      ) VALUES (?, ?, ?, ?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    const orderRes = orderStmt.run(
      order_number,
      customer_id || 1,
      customer_name || 'Guest Customer',
      order_type || 'dine_in',
      table_id || null,
      subtotal,
      tax_amount,
      service_charge,
      discount_amount,
      total_amount,
      prep_time_estimate,
      hurry_mode ? 1 : 0,
      special_instructions || ''
    );

    const order_id = orderRes.lastInsertRowid;

    // Insert order items & deduct ingredients
    const itemStmt = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, name, quantity, unit_price, selected_options, special_instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      itemStmt.run(
        order_id,
        item.menu_item_id,
        item.name,
        item.quantity,
        item.unit_price,
        item.selected_options ? JSON.stringify(item.selected_options) : null,
        item.special_instructions || ''
      );

      // Deduct recipe ingredients
      const recipes = db.prepare('SELECT * FROM recipes WHERE menu_item_id = ?').all(item.menu_item_id);
      for (const r of recipes) {
        const totalDeduct = r.quantity_required * item.quantity;
        const ing = db.prepare('SELECT current_stock, name FROM ingredients WHERE id = ?').get(r.ingredient_id);
        const newStock = Math.max(0, ing.current_stock - totalDeduct);

        db.prepare('UPDATE ingredients SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newStock, r.ingredient_id);

        db.prepare(`
          INSERT INTO inventory_movements (ingredient_id, change_amount, previous_stock, new_stock, reason, reference_id, notes)
          VALUES (?, ?, ?, ?, 'order_deduction', ?, ?)
        `).run(
          r.ingredient_id,
          -totalDeduct,
          ing.current_stock,
          newStock,
          order_number,
          `Deducted for Order #${order_number} (${item.quantity}x ${item.name})`
        );
      }
    }

    // If dine-in, mark table as occupied
    if (table_id) {
      db.prepare("UPDATE restaurant_tables SET status = 'occupied', current_order_id = ? WHERE id = ?")
        .run(order_id, table_id);
    }

    // Default 1-person split bill
    db.prepare(`
      INSERT INTO bill_splits (
        order_id, split_type, person_name, assigned_items, subtotal_share,
        tax_share, service_share, discount_share, total_share, payment_status
      ) VALUES (?, 'equal', ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      order_id,
      customer_name || 'Customer',
      JSON.stringify(items.map(it => ({ name: it.name, quantity: it.quantity, price: it.unit_price }))),
      subtotal,
      tax_amount,
      service_charge,
      discount_amount,
      total_amount
    );

    // Record Loyalty points: 10 points per dollar
    const earnedPoints = Math.floor(total_amount * 10);
    if (customer_id) {
      db.prepare('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?')
        .run(earnedPoints, customer_id);
      db.prepare(`
        INSERT INTO loyalty_transactions (user_id, order_id, points_change, reason)
        VALUES (?, ?, ?, ?)
      `).run(customer_id, order_id, earnedPoints, `Earned from Order #${order_number}`);
    }

    db.exec('COMMIT');

    // Recalculate menu items availability in case any ingredient ran out!
    recalculateMenuAvailability();
    checkAndAutoGeneratePOs();

    logAudit(customer_name, 'customer', 'CREATE_ORDER', 'order', order_id, { order_number, total_amount });

    return {
      success: true,
      order_id,
      order_number,
      total_amount,
      prep_time_estimate,
      earnedPoints
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Seed initial rich data
function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  console.log('Seeding SmartServe initial persistent database...');

  // 1. Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, email, phone, avatar, loyalty_points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const uAdmin = insertUser.run('diana.admin', 'admin123', 'Diana Vance', 'admin', 'diana@smartserve.io', '+1-555-0101', '👑', 500);
  const uChef = insertUser.run('gordon.chef', 'chef123', 'Chef Gordon Laurent', 'kitchen', 'gordon@smartserve.io', '+1-555-0102', '👨‍🍳', 100);
  const uWaiter = insertUser.run('marcus.waiter', 'waiter123', 'Marcus Reed', 'waiter', 'marcus@smartserve.io', '+1-555-0103', '🤵', 150);
  const uCustomer = insertUser.run('sophia.guest', 'guest123', 'Sophia Lee', 'customer', 'sophia@gmail.com', '+1-555-0199', '✨', 840);

  // 2. Employees
  const insertEmp = db.prepare(`
    INSERT INTO employees (user_id, position, wage_rate, overtime_rate, employment_status, hire_date)
    VALUES (?, ?, ?, ?, 'active', ?)
  `);
  const empAdmin = insertEmp.run(uAdmin.lastInsertRowid, 'General Manager', 38.50, 57.75, '2024-01-15');
  const empChef = insertEmp.run(uChef.lastInsertRowid, 'Executive Chef', 32.00, 48.00, '2024-02-01');
  const empWaiter = insertEmp.run(uWaiter.lastInsertRowid, 'Lead Service Waiter', 21.50, 32.25, '2024-03-10');

  // Attendance history for employees
  const insertAtt = db.prepare(`
    INSERT INTO attendance (employee_id, clock_in, clock_out, break_minutes, verified_hours, status, audit_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  // Previous verified shifts
  insertAtt.run(empChef.lastInsertRowid, '2026-10-09 08:00:00', '2026-10-09 16:30:00', 30, 8.0, 'clocked_out', 'Standard Day Shift verified');
  insertAtt.run(empWaiter.lastInsertRowid, '2026-10-09 11:00:00', '2026-10-09 19:30:00', 30, 8.0, 'clocked_out', 'Evening Shift verified');
  // Today's active clocked-in shifts
  insertAtt.run(empChef.lastInsertRowid, '2026-10-10 07:30:00', null, 0, 3.2, 'clocked_in', 'Morning prep shift active');
  insertAtt.run(empWaiter.lastInsertRowid, '2026-10-10 09:00:00', null, 0, 1.7, 'clocked_in', 'Floor service active');

  // 3. Suppliers
  const insertSup = db.prepare(`
    INSERT INTO suppliers (name, contact_name, email, phone, address, lead_time_days, min_order_value, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const supBeans = insertSup.run('Artisan Roasters Co.', 'Lucas Graham', 'orders@artisanroasters.com', '+1-800-ROASTS', 'Seattle, WA', 1, 60.0, 4.9);
  const supDairy = insertSup.run('Valley Organic Farm & Dairy', 'Martha Stewart', 'supply@valleyorganic.com', '+1-800-DAIRY', 'Petaluma, CA', 1, 40.0, 4.8);
  const supMeats = insertSup.run('Heritage Prime Provisions', 'Arthur Pendelton', 'sales@heritageprovisions.com', '+1-800-PRIMECO', 'Omaha, NE', 2, 100.0, 4.9);
  const supProduce = insertSup.run('Golden Harvest Green Grocers', 'Elena Rostova', 'elena@goldenharvest.com', '+1-800-HARVEST', 'Salinas, CA', 1, 35.0, 4.7);

  // 4. Ingredients
  const insertIng = db.prepare(`
    INSERT INTO ingredients (name, category, unit, current_stock, min_threshold, target_stock, unit_cost, supplier_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const ingBeans = insertIng.run('Single-Origin Ethiopian Beans', 'Beverage', 'g', 4200, 1000, 10000, 0.045, supBeans.lastInsertRowid);
  const ingMilk = insertIng.run('Organic Whole Milk', 'Dairy', 'ml', 18500, 5000, 30000, 0.003, supDairy.lastInsertRowid);
  const ingOatMilk = insertIng.run('Barista Oat Milk', 'Dairy Alternative', 'ml', 12000, 4000, 20000, 0.005, supDairy.lastInsertRowid);
  const ingCaramel = insertIng.run('Artisanal Salted Caramel', 'Syrup', 'ml', 3500, 800, 5000, 0.015, supBeans.lastInsertRowid);
  const ingBelgianChoc = insertIng.run('72% Belgian Dark Chocolate', 'Confection', 'g', 2400, 600, 4000, 0.035, supBeans.lastInsertRowid);
  
  const ingBrioche = insertIng.run('Artisanal Brioche Buns & Bread', 'Bakery', 'pcs', 45, 15, 80, 0.90, supProduce.lastInsertRowid);
  const ingSalmon = insertIng.run('Wild Alaskan Salmon Fillets', 'Seafood', 'g', 3800, 1200, 6000, 0.042, supMeats.lastInsertRowid);
  const ingWagyu = insertIng.run('A5 Wagyu Beef Patties', 'Meat', 'g', 4500, 1500, 8000, 0.055, supMeats.lastInsertRowid);
  const ingMushrooms = insertIng.run('Fresh Porcini & Wild Mushrooms', 'Produce', 'g', 2600, 800, 5000, 0.025, supProduce.lastInsertRowid);
  const ingArborio = insertIng.run('Italian Arborio Rice', 'Grains', 'g', 8500, 2000, 12000, 0.008, supProduce.lastInsertRowid);
  const ingParmesan = insertIng.run('Aged 24-Month Parmigiano Reggiano', 'Cheese', 'g', 2900, 600, 4000, 0.032, supDairy.lastInsertRowid);
  const ingRigatoni = insertIng.run('Bronze-Die Rigatoni Pasta', 'Pasta', 'g', 7200, 2000, 10000, 0.006, supProduce.lastInsertRowid);
  const ingPesto = insertIng.run('Genovese Basil Pesto', 'Sauce', 'g', 2200, 600, 3500, 0.028, supProduce.lastInsertRowid);
  const ingAvocado = insertIng.run('Hass Avocados', 'Produce', 'pcs', 32, 10, 60, 1.20, supProduce.lastInsertRowid);
  const ingQuinoa = insertIng.run('Organic Tricolor Quinoa', 'Grains', 'g', 4800, 1000, 6000, 0.009, supProduce.lastInsertRowid);
  const ingShortRib = insertIng.run('Prime Beef Short Ribs', 'Meat', 'g', 5000, 1500, 8000, 0.048, supMeats.lastInsertRowid);
  const ingHeavyCream = insertIng.run('Grade A Heavy Whipping Cream', 'Dairy', 'ml', 9400, 2500, 15000, 0.004, supDairy.lastInsertRowid);
  
  // NOTE: Intentionally exhausted ingredient to demonstrate out-of-stock live handling & alternatives!
  const ingSaffron = insertIng.run('Kashmir Saffron Threads', 'Spices', 'g', 0, 15, 50, 4.50, supProduce.lastInsertRowid);
  // Low stock ingredient to demonstrate auto reorder PO & warning
  const ingTruffleOil = insertIng.run('White Truffle Infused Olive Oil', 'Oils', 'ml', 180, 250, 1000, 0.080, supProduce.lastInsertRowid);

  // 5. Categories
  const insertCat = db.prepare('INSERT INTO categories (name, icon, display_order) VALUES (?, ?, ?)');
  const catCoffee = insertCat.run('Artisanal Coffee & Tea', '☕', 1);
  const catBakery = insertCat.run('Pastries & Brunch', '🥐', 2);
  const catMains = insertCat.run('Gourmet Mains', '🍽️', 3);
  const catPasta = insertCat.run('Handcrafted Pasta & Risotto', '🍝', 4);
  const catBowls = insertCat.run('Healthy Bowls & Greens', '🥗', 5);
  const catDesserts = insertCat.run('Signature Desserts', '🍮', 6);

  // 6. Menu Items
  const insertMenu = db.prepare(`
    INSERT INTO menu_items (
      category_id, name, description, price, prep_time_minutes,
      image_url, is_available, dietary_tags, allergens, cross_contamination_risk,
      customizable_options, calories, is_hurry_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Coffee
  const m1 = insertMenu.run(
    catCoffee.lastInsertRowid,
    'Iced Salted Caramel Macchiato',
    'Chilled single-origin espresso layered over velvety milk, Madagascar vanilla, and house-made sea-salt caramel drizzle.',
    5.80, 4,
    'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify(['vegetarian', 'gluten_free']),
    JSON.stringify(['dairy']),
    'Prepared in a workstation handling almond and oat milks.',
    JSON.stringify([
      { name: 'Milk Choice', options: [{ label: 'Whole Milk', price: 0 }, { label: 'Oat Milk (+0.75)', price: 0.75 }] },
      { name: 'Sweetness', options: [{ label: 'Standard', price: 0 }, { label: 'Half Sweet', price: 0 }, { label: 'Extra Caramel (+0.50)', price: 0.50 }] }
    ]),
    240, 1 // Hurry mode eligible!
  );

  const m2 = insertMenu.run(
    catCoffee.lastInsertRowid,
    'Belgian Dark Chocolate Mocha Royale',
    'Double ristretto espresso folded into melted 72% Belgian dark chocolate, steamed milk, and dusted with cacao.',
    6.50, 5,
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify(['vegetarian', 'gluten_free']),
    JSON.stringify(['dairy']),
    'Shared steam wand thoroughly purged after dairy drinks.',
    JSON.stringify([
      { name: 'Espresso Roast', options: [{ label: 'Signature Roast', price: 0 }, { label: 'Decaf Blend', price: 0 }] },
      { name: 'Whipped Cream', options: [{ label: 'House Whipped Cream', price: 0 }, { label: 'No Whip', price: 0 }] }
    ]),
    290, 1 // Hurry mode
  );

  const m3 = insertMenu.run(
    catCoffee.lastInsertRowid,
    'Velvet Microfoam Flat White',
    'Ristretto shots crowned with a silky thin layer of microfoam for rich espresso sweetness.',
    4.90, 4,
    'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify(['vegetarian', 'gluten_free']),
    JSON.stringify(['dairy']),
    'Gluten-free equipment verified.',
    JSON.stringify([
      { name: 'Milk Choice', options: [{ label: 'Organic Whole Milk', price: 0 }, { label: 'Oat Milk (+0.75)', price: 0.75 }] }
    ]),
    150, 1 // Hurry mode
  );

  // Pastries / Brunch
  const m4 = insertMenu.run(
    catBakery.lastInsertRowid,
    'Smoked Salmon & Capers Brioche Tartine',
    'Toasted artisanal brioche topped with whipped chive cream cheese, wild smoked salmon, fried capers, and fresh dill.',
    13.50, 8,
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify([]),
    JSON.stringify(['fish', 'dairy', 'gluten']),
    'Bakery prep area handles tree nuts and sesame.',
    JSON.stringify([
      { name: 'Egg Add-on', options: [{ label: 'No Egg', price: 0 }, { label: 'Poached Organic Egg (+2.00)', price: 2.00 }] }
    ]),
    460, 1 // Hurry mode (<10 min)
  );

  // Mains
  const m5 = insertMenu.run(
    catMains.lastInsertRowid,
    'Pan-Seared Herb Butter Alaskan Salmon',
    'Crispy skin wild salmon fillet basted in garlic-thyme butter, served with charred asparagus and crushed fingerling potatoes.',
    24.00, 16,
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify(['gluten_free']),
    JSON.stringify(['fish', 'dairy']),
    'Cooked on a dedicated seafood and grill section.',
    JSON.stringify([
      { name: 'Doneness', options: [{ label: 'Medium Rare (Chef Recommended)', price: 0 }, { label: 'Medium Well', price: 0 }] },
      { name: 'Butter Style', options: [{ label: 'Garlic Herb Butter', price: 0 }, { label: 'Dairy-Free Lemon Olive Oil', price: 0 }] }
    ]),
    580, 0
  );

  const m6 = insertMenu.run(
    catMains.lastInsertRowid,
    'Artisan Wagyu Smash Burger & Truffle Fries',
    'Double A5 Wagyu patties, aged Wisconsin cheddar, caramelized shallots, house truffle aioli on a toasted brioche bun.',
    19.50, 14,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify([]),
    JSON.stringify(['dairy', 'gluten', 'egg']),
    'Fryer oil shared with potato items only; gluten present in bun.',
    JSON.stringify([
      { name: 'Cheese Choice', options: [{ label: 'Aged Cheddar', price: 0 }, { label: 'Swiss Gruyère (+1.00)', price: 1.00 }] },
      { name: 'Fries Style', options: [{ label: 'Parmesan Truffle Fries', price: 0 }, { label: 'Sweet Potato Fries (+1.50)', price: 1.50 }] }
    ]),
    820, 0
  );

  // Pasta & Risotto
  const m7 = insertMenu.run(
    catPasta.lastInsertRowid,
    'Wild Mushroom & White Truffle Risotto',
    'Slow-simmered Carnaroli rice, sautéed porcini and wild chanterelles, finished with 24-month Parmigiano and white truffle drizzle.',
    18.50, 15,
    'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify(['vegetarian', 'gluten_free']),
    JSON.stringify(['dairy']),
    '100% vegetarian vegetable stock used.',
    JSON.stringify([
      { name: 'Cheese Level', options: [{ label: 'Generous Parmesan', price: 0 }, { label: 'Light Parmesan', price: 0 }, { label: 'Vegan Nut Cheese (+1.50)', price: 1.50 }] }
    ]),
    540, 0
  );

  const m8 = insertMenu.run(
    catPasta.lastInsertRowid,
    'Rustic Genovese Pesto Rigatoni',
    'Bronze-extruded rigatoni tossed in freshly crushed sweet basil, toasted pine nuts, blistered cherry tomatoes, and buffalo mozzarella.',
    16.00, 12,
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281781?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify(['vegetarian']),
    JSON.stringify(['dairy', 'gluten', 'nuts']),
    'Contains pine nuts; processed in a nut-friendly kitchen.',
    JSON.stringify([
      { name: 'Add Protein', options: [{ label: 'No Protein (Classic Veg)', price: 0 }, { label: 'Grilled Herb Chicken (+4.50)', price: 4.50 }, { label: 'Seared Wild Salmon (+6.00)', price: 6.00 }] }
    ]),
    610, 0
  );

  // Healthy Bowls
  const m9 = insertMenu.run(
    catBowls.lastInsertRowid,
    'Green Goddess Avocado & Quinoa Superbowl',
    'Sliced ripe Hass avocado, tricolor warm quinoa, organic edamame, baby spinach, roasted pepitas, and green goddess tahini vinaigrette.',
    14.00, 7,
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify(['vegan', 'vegetarian', 'gluten_free']),
    JSON.stringify(['sesame']),
    'Dedicated vegan prep knives and cutting boards utilized.',
    JSON.stringify([
      { name: 'Dressing', options: [{ label: 'Green Goddess Tahini', price: 0 }, { label: 'Lemon Herb Vinaigrette', price: 0 }] }
    ]),
    410, 1 // Hurry mode (<10 min)
  );

  // Mains - Braised
  const m10 = insertMenu.run(
    catPasta.lastInsertRowid,
    '12-Hour Braised Beef Short Rib Ragù',
    'Hand-torn wide pappardelle ribbons tossed in tender wine-braised short rib, San Marzano tomato reduction, and shaved pecorino.',
    22.00, 14,
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify([]),
    JSON.stringify(['dairy', 'gluten']),
    'Gluten-friendly substitution available upon server request.',
    JSON.stringify([
      { name: 'Spice Factor', options: [{ label: 'Mild & Rich', price: 0 }, { label: 'Calabrian Chili Kick (+0.50)', price: 0.50 }] }
    ]),
    690, 0
  );

  // Desserts
  const m11 = insertMenu.run(
    catDesserts.lastInsertRowid,
    'Madagascar Vanilla Bean Crème Brûlée',
    'Silky rich custard infused with real Madagascar bourbon vanilla bean, finished with a fire-caramelized turbinado glass crust.',
    8.50, 5,
    'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=800&q=80',
    1,
    JSON.stringify(['vegetarian', 'gluten_free']),
    JSON.stringify(['dairy', 'egg']),
    'Contains dairy and eggs.',
    JSON.stringify([]),
    340, 1 // Hurry mode
  );

  // OUT OF STOCK DISH (Intentionally requires Kashmir Saffron which is 0 in stock)
  const m12 = insertMenu.run(
    catMains.lastInsertRowid,
    'Imperial Kashmir Saffron Seafood Bouillabaisse',
    'Slow-simmered coastal seafood stew infused with prized Kashmir saffron broth, wild salmon, blue prawns, and garlic rouille baguette.',
    28.50, 20,
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
    0, // Marked 0 because Saffron is out of stock!
    JSON.stringify(['gluten_free']),
    JSON.stringify(['shellfish', 'fish']),
    'Contains shellfish and finfish.',
    JSON.stringify([
      { name: 'Bread Choice', options: [{ label: 'Classic Baguette Rouille', price: 0 }, { label: 'Gluten-Free Toast', price: 0 }] }
    ]),
    510, 0
  );

  // 7. Bind Recipes to Menu Items
  const insertRecipe = db.prepare('INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES (?, ?, ?)');

  // Iced Salted Caramel Macchiato: Beans (18g), Milk (180ml), Caramel (25ml)
  insertRecipe.run(m1.lastInsertRowid, ingBeans.lastInsertRowid, 18);
  insertRecipe.run(m1.lastInsertRowid, ingMilk.lastInsertRowid, 180);
  insertRecipe.run(m1.lastInsertRowid, ingCaramel.lastInsertRowid, 25);

  // Dark Chocolate Mocha: Beans (18g), Milk (200ml), Chocolate (30g)
  insertRecipe.run(m2.lastInsertRowid, ingBeans.lastInsertRowid, 18);
  insertRecipe.run(m2.lastInsertRowid, ingMilk.lastInsertRowid, 200);
  insertRecipe.run(m2.lastInsertRowid, ingBelgianChoc.lastInsertRowid, 30);

  // Velvet Flat White: Beans (18g), Milk (160ml)
  insertRecipe.run(m3.lastInsertRowid, ingBeans.lastInsertRowid, 18);
  insertRecipe.run(m3.lastInsertRowid, ingMilk.lastInsertRowid, 160);

  // Brioche Tartine: Brioche (1pc), Salmon (80g)
  insertRecipe.run(m4.lastInsertRowid, ingBrioche.lastInsertRowid, 1);
  insertRecipe.run(m4.lastInsertRowid, ingSalmon.lastInsertRowid, 80);

  // Pan-Seared Salmon: Salmon (200g)
  insertRecipe.run(m5.lastInsertRowid, ingSalmon.lastInsertRowid, 200);

  // Wagyu Burger: Wagyu (180g), Brioche (1pc), Heavy Cream/Sauce (20ml)
  insertRecipe.run(m6.lastInsertRowid, ingWagyu.lastInsertRowid, 180);
  insertRecipe.run(m6.lastInsertRowid, ingBrioche.lastInsertRowid, 1);

  // Truffle Risotto: Arborio (100g), Mushrooms (80g), Parmesan (25g), Truffle Oil (10ml)
  insertRecipe.run(m7.lastInsertRowid, ingArborio.lastInsertRowid, 100);
  insertRecipe.run(m7.lastInsertRowid, ingMushrooms.lastInsertRowid, 80);
  insertRecipe.run(m7.lastInsertRowid, ingParmesan.lastInsertRowid, 25);
  insertRecipe.run(m7.lastInsertRowid, ingTruffleOil.lastInsertRowid, 10);

  // Pesto Rigatoni: Rigatoni (140g), Pesto (50g), Parmesan (20g)
  insertRecipe.run(m8.lastInsertRowid, ingRigatoni.lastInsertRowid, 140);
  insertRecipe.run(m8.lastInsertRowid, ingPesto.lastInsertRowid, 50);
  insertRecipe.run(m8.lastInsertRowid, ingParmesan.lastInsertRowid, 20);

  // Superbowl: Avocado (1pc), Quinoa (80g)
  insertRecipe.run(m9.lastInsertRowid, ingAvocado.lastInsertRowid, 1);
  insertRecipe.run(m9.lastInsertRowid, ingQuinoa.lastInsertRowid, 80);

  // Short Rib Ragù: Short Rib (180g), Rigatoni/Pasta (120g), Parmesan (20g)
  insertRecipe.run(m10.lastInsertRowid, ingShortRib.lastInsertRowid, 180);
  insertRecipe.run(m10.lastInsertRowid, ingRigatoni.lastInsertRowid, 120);
  insertRecipe.run(m10.lastInsertRowid, ingParmesan.lastInsertRowid, 20);

  // Crème Brûlée: Heavy Cream (120ml)
  insertRecipe.run(m11.lastInsertRowid, ingHeavyCream.lastInsertRowid, 120);

  // Bouillabaisse: Saffron (2g) [STOCK IS 0!], Salmon (120g)
  insertRecipe.run(m12.lastInsertRowid, ingSaffron.lastInsertRowid, 2);
  insertRecipe.run(m12.lastInsertRowid, ingSalmon.lastInsertRowid, 120);

  // 8. Restaurant Tables
  const insertTable = db.prepare('INSERT INTO restaurant_tables (table_number, capacity, section, status, assigned_waiter_id) VALUES (?, ?, ?, ?, ?)');
  insertTable.run('T-1', 2, 'Window Patio', 'available', empWaiter.lastInsertRowid);
  insertTable.run('T-2', 4, 'Main Dining Hall', 'occupied', empWaiter.lastInsertRowid);
  insertTable.run('T-3', 2, 'Espresso Bar Corner', 'available', empWaiter.lastInsertRowid);
  insertTable.run('T-4', 6, 'Fireplace Alcove', 'reserved', empWaiter.lastInsertRowid);
  insertTable.run('T-5', 4, 'Mezzanine Garden', 'cleaning', empWaiter.lastInsertRowid);
  insertTable.run('T-6', 8, 'Private Wine Cellar', 'available', empWaiter.lastInsertRowid);

  // 9. Coupons
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, expiry_date, usage_limit, times_used, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
  `);
  insertCoupon.run('WELCOME15', '15% Off Your Entire Order (Min $25 spend)', 'percentage', 15.0, 25.0, 20.0, '2027-12-31', 500);
  insertCoupon.run('SAVETEN', '$10 Flat Off On Gourmet Feast (Min $50 spend)', 'fixed', 10.0, 50.0, 10.0, '2027-12-31', 300);
  insertCoupon.run('COFFEEVIBE', '$4 Off Coffee & Bakery Pairing', 'fixed', 4.0, 12.0, 4.0, '2027-12-31', 1000);

  // 10. Loyalty Rewards
  const insertReward = db.prepare(`
    INSERT INTO loyalty_rewards (title, description, points_cost, reward_type, reward_value, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insertReward.run('$5 Off Dining Voucher', 'Redeem 500 points for a direct $5 discount on your current bill.', 500, 'discount_fixed', 5.0);
  insertReward.run('Complimentary Signature Dessert', 'Redeem 750 points for our artisanal Crème Brûlée.', 750, 'discount_fixed', 8.5);
  insertReward.run('$15 VIP Epicurean Voucher', 'Redeem 1200 points for a $15 discount on orders over $40.', 1200, 'discount_fixed', 15.0);

  // 11. Initial Sample Orders (Active and Past)
  const o1 = db.prepare(`
    INSERT INTO orders (
      order_number, customer_id, customer_name, order_type, table_id,
      status, subtotal, tax_amount, service_charge, discount_amount,
      total_amount, prep_time_estimate, hurry_mode, special_instructions, payment_status
    ) VALUES ('ORD-948120', ?, 'Sophia Lee', 'dine_in', 2, 'preparing', 36.30, 2.90, 1.82, 0, 41.02, 18, 0, 'Extra crispy parmesan on risotto please', 'pending')
  `).run(uCustomer.lastInsertRowid);

  // Order items for ORD-948120
  db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, name, quantity, unit_price, selected_options, special_instructions, item_status)
    VALUES (?, ?, 'Wild Mushroom & White Truffle Risotto', 1, 18.50, '{"Cheese Level":"Generous Parmesan"}', 'Extra crispy parmesan', 'preparing')
  `).run(o1.lastInsertRowid, m7.lastInsertRowid);

  db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, name, quantity, unit_price, selected_options, special_instructions, item_status)
    VALUES (?, ?, 'Smoked Salmon & Capers Brioche Tartine', 1, 13.50, '{"Egg Add-on":"No Egg"}', '', 'ready')
  `).run(o1.lastInsertRowid, m4.lastInsertRowid);

  db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, name, quantity, unit_price, selected_options, special_instructions, item_status)
    VALUES (?, ?, 'Velvet Microfoam Flat White', 1, 4.90, '{"Milk Choice":"Organic Whole Milk"}', '', 'ready')
  `).run(o1.lastInsertRowid, m3.lastInsertRowid);

  // Split bill for ORD-948120 (Equal split test setup)
  db.prepare(`
    INSERT INTO bill_splits (order_id, split_type, person_name, assigned_items, subtotal_share, tax_share, service_share, discount_share, total_share, payment_status)
    VALUES (?, 'equal', 'Sophia Lee', '[]', 18.15, 1.45, 0.91, 0, 20.51, 'paid')
  `).run(o1.lastInsertRowid);

  db.prepare(`
    INSERT INTO bill_splits (order_id, split_type, person_name, assigned_items, subtotal_share, tax_share, service_share, discount_share, total_share, payment_status)
    VALUES (?, 'equal', 'Guest Friend', '[]', 18.15, 1.45, 0.91, 0, 20.51, 'pending')
  `).run(o1.lastInsertRowid);

  // Record payment for Sophia's share
  db.prepare(`
    INSERT INTO payments (order_id, split_id, amount, payment_method, transaction_reference, status, gateway_provider)
    VALUES (?, 1, 20.51, 'card', 'TXN_STRIPE_9841284', 'successful', 'Stripe (Sandbox Mode)')
  `).run(o1.lastInsertRowid);

  // 12. Active Service Requests
  const insertReq = db.prepare('INSERT INTO service_requests (table_id, table_number, request_type, status, assigned_staff_id) VALUES (?, ?, ?, ?, ?)');
  insertReq.run(2, 'T-2', 'water', 'pending', empWaiter.lastInsertRowid);
  insertReq.run(2, 'T-2', 'napkins', 'acknowledged', empWaiter.lastInsertRowid);

  // 13. Initial Purchase Order (for demonstration of receiving & verification workflow)
  const poItems = JSON.stringify([
    { ingredient_id: ingSaffron.lastInsertRowid, name: 'Kashmir Saffron Threads', quantity: 20, unit: 'g', unit_cost: 4.50, line_total: 90.0 },
    { ingredient_id: ingTruffleOil.lastInsertRowid, name: 'White Truffle Infused Olive Oil', quantity: 500, unit: 'ml', unit_cost: 0.08, line_total: 40.0 }
  ]);
  db.prepare(`
    INSERT INTO purchase_orders (po_number, supplier_id, status, total_cost, items_json, expected_delivery, notes)
    VALUES ('PO-849102', ?, 'ordered', 130.00, ?, '2026-10-11', 'Priority replenishment for Bouillabaisse & Risotto')
  `).run(supProduce.lastInsertRowid, poItems);

  // 14. Handover note
  db.prepare(`
    INSERT INTO shift_handover_notes (staff_name, shift_type, notes, urgent)
    VALUES ('Marcus Reed', 'morning', 'Table 4 reserved for food critic party at 7:30 PM. Saffron shipment PO-849102 arriving by courier around 11:30 AM.', 1)
  `).run();

  // 15. Operational Expenses
  const insertExp = db.prepare('INSERT INTO expenses (category, amount, description, recorded_by) VALUES (?, ?, ?, ?)');
  insertExp.run('utilities', 320.0, 'Monthly Gas & High-Capacity Espresso Power', 'Admin Diana');
  insertExp.run('maintenance', 150.0, 'Water Filtration Reverse Osmosis Cartridge Replacement', 'Chef Gordon');
  insertExp.run('packaging', 85.0, 'Eco-Friendly Biodegradable Takeaway Boxes', 'Admin Diana');

  // 16. Sample Feedback
  db.prepare(`
    INSERT INTO feedbacks (order_id, customer_name, food_rating, service_rating, comment)
    VALUES (?, 'Sophia Lee', 5, 5, 'The Wild Mushroom Truffle Risotto was exquisite! Fast service and warm ambiance.')
  `).run(o1.lastInsertRowid);

  console.log('SmartServe database successfully seeded with realistic artisanal restaurant data!');
}
