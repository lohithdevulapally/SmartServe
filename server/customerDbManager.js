import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const CUSTOMER_DBS_DIR = path.join(__dirname, 'customer_dbs');

// Ensure customer databases directory exists
if (!fs.existsSync(CUSTOMER_DBS_DIR)) {
  fs.mkdirSync(CUSTOMER_DBS_DIR, { recursive: true });
}

// In-memory cache of opened customer SQLite database connections
const openConnections = new Map();

/**
 * Sanitize identifier to create safe file name
 */
export function getCustomerDbFilename(customerPhoneOrId) {
  const safeId = String(customerPhoneOrId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `customer_${safeId}.db`;
}

/**
 * Get the absolute file path for a customer's dedicated SQLite database
 */
export function getCustomerDbFilePath(customerPhoneOrId) {
  const filename = getCustomerDbFilename(customerPhoneOrId);
  return path.join(CUSTOMER_DBS_DIR, filename);
}

/**
 * Initialize or retrieve a customer's dedicated SQLite database connection
 */
export function getCustomerDb(customerPhoneOrId) {
  const dbPath = getCustomerDbFilePath(customerPhoneOrId);
  
  if (openConnections.has(dbPath)) {
    return openConnections.get(dbPath);
  }

  const customerDb = new DatabaseSync(dbPath);
  
  // Enable WAL mode & foreign keys for performance and ACID isolation
  try {
    customerDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);
  } catch (e) {
    // Ignore if already set
  }

  // Create isolated schema inside this customer's dedicated database
  customerDb.exec(`
    -- Customer Identity & Preference Profile
    CREATE TABLE IF NOT EXISTS customer_profile (
      id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      avatar TEXT DEFAULT '✨',
      vip_tier TEXT DEFAULT 'Standard',
      loyalty_points INTEGER DEFAULT 100,
      allergy_exclusions TEXT DEFAULT '',
      dietary_preference TEXT DEFAULT 'All',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Dedicated Customer Orders History
    CREATE TABLE IF NOT EXISTS customer_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER UNIQUE NOT NULL,
      table_number TEXT NOT NULL,
      status TEXT NOT NULL,
      total_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      items_json TEXT NOT NULL,
      special_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Dedicated Loyalty Points Ledger
    CREATE TABLE IF NOT EXISTS loyalty_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      change_amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      action_type TEXT NOT NULL, -- 'earned_order', 'reward_redemption', 'bonus', 'admin_adjustment'
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Personal Dining Notes & Allergies
    CREATE TABLE IF NOT EXISTS dining_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_type TEXT NOT NULL, -- 'allergy', 'preference', 'special_occasion'
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  openConnections.set(dbPath, customerDb);
  return customerDb;
}

/**
 * Synchronize customer profile into their dedicated SQLite database
 */
export function syncCustomerProfile(customer) {
  if (!customer || (!customer.phone && !customer.id)) return null;

  const key = customer.phone || customer.id;
  const db = getCustomerDb(key);

  const existing = db.prepare('SELECT id FROM customer_profile LIMIT 1').get();

  if (existing) {
    db.prepare(`
      UPDATE customer_profile 
      SET full_name = ?, 
          phone = ?, 
          email = ?, 
          avatar = ?, 
          loyalty_points = ?,
          allergy_exclusions = COALESCE(?, allergy_exclusions),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      customer.full_name,
      customer.phone,
      customer.email || '',
      customer.avatar || '✨',
      Number(customer.loyalty_points || 0),
      customer.allergy_exclusions || '',
      existing.id
    );
  } else {
    let vipTier = 'Standard';
    const pts = Number(customer.loyalty_points || 0);
    if (pts >= 800) vipTier = 'VIP Gold';
    else if (pts >= 400) vipTier = 'VIP Silver';

    db.prepare(`
      INSERT INTO customer_profile (id, full_name, phone, email, avatar, vip_tier, loyalty_points, allergy_exclusions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customer.id || 1,
      customer.full_name,
      customer.phone,
      customer.email || '',
      customer.avatar || '✨',
      vipTier,
      pts,
      customer.allergy_exclusions || ''
    );

    // Initial loyalty ledger entry
    db.prepare(`
      INSERT INTO loyalty_ledger (change_amount, balance_after, action_type, description)
      VALUES (?, ?, 'bonus', 'Initial welcome dining points allocated')
    `).run(pts, pts);
  }

  return db;
}

/**
 * Synchronize an order into the customer's dedicated SQLite database
 */
export function syncOrderToCustomerDb(order, customerPhoneOrId) {
  if (!order || !customerPhoneOrId) return;

  try {
    const db = getCustomerDb(customerPhoneOrId);

    const itemsSummary = typeof order.items === 'string' 
      ? order.items 
      : JSON.stringify(order.items || []);

    const existing = db.prepare('SELECT id FROM customer_orders WHERE order_id = ?').get(order.id);

    if (existing) {
      db.prepare(`
        UPDATE customer_orders 
        SET status = ?, 
            total_amount = ?, 
            final_amount = ?
        WHERE order_id = ?
      `).run(
        order.status,
        Number(order.total_amount || 0),
        Number(order.total_amount || 0),
        order.id
      );
    } else {
      db.prepare(`
        INSERT INTO customer_orders (order_id, table_number, status, total_amount, discount_amount, final_amount, items_json, special_instructions, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      `).run(
        order.id,
        order.table_number || 'T-1',
        order.status || 'placed',
        Number(order.total_amount || 0),
        Number(order.discount_amount || 0),
        Number(order.total_amount || 0),
        itemsSummary,
        order.notes || '',
        order.created_at || new Date().toISOString()
      );

      // Award points into dedicated loyalty ledger
      const pointsEarned = Math.floor(Number(order.total_amount || 0) * 0.1);
      if (pointsEarned > 0) {
        const prof = db.prepare('SELECT loyalty_points FROM customer_profile LIMIT 1').get();
        const currentBal = prof ? prof.loyalty_points : 0;
        const newBal = currentBal + pointsEarned;

        db.prepare('UPDATE customer_profile SET loyalty_points = ? WHERE id = ?').run(newBal, prof ? prof.id : 1);
        db.prepare(`
          INSERT INTO loyalty_ledger (change_amount, balance_after, action_type, description)
          VALUES (?, ?, 'earned_order', ?)
        `).run(pointsEarned, newBal, `Earned 10% points for Order #${order.id}`);
      }
    }
  } catch (err) {
    console.error('Error syncing order to customer database:', err);
  }
}

/**
 * Read detailed records from a customer's dedicated SQLite database
 */
export function getCustomerDbDetails(customerPhoneOrId) {
  const db = getCustomerDb(customerPhoneOrId);
  const filePath = getCustomerDbFilePath(customerPhoneOrId);
  const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;

  const profile = db.prepare('SELECT * FROM customer_profile LIMIT 1').get() || {};
  const orders = db.prepare('SELECT * FROM customer_orders ORDER BY created_at DESC').all();
  const loyaltyHistory = db.prepare('SELECT * FROM loyalty_ledger ORDER BY created_at DESC').all();
  const notes = db.prepare('SELECT * FROM dining_notes ORDER BY created_at DESC').all();

  // Parse items_json safely for frontend
  const parsedOrders = orders.map(ord => {
    let parsedItems = [];
    try {
      parsedItems = JSON.parse(ord.items_json);
    } catch {
      parsedItems = [];
    }
    return {
      ...ord,
      items: parsedItems
    };
  });

  const totalSpent = parsedOrders.reduce((sum, o) => sum + (Number(o.final_amount) || 0), 0);

  return {
    database: {
      filename: path.basename(filePath),
      filePath: filePath,
      sizeBytes: stats ? stats.size : 0,
      sizeFormatted: stats ? `${(stats.size / 1024).toFixed(1)} KB` : '0 KB',
      createdAt: stats ? stats.birthtime : new Date(),
      updatedAt: stats ? stats.mtime : new Date(),
      tablesCount: 4,
      engine: 'SQLite 3 (ACID Isolated)'
    },
    profile: {
      ...profile,
      totalOrders: parsedOrders.length,
      totalSpent: totalSpent
    },
    orders: parsedOrders,
    loyaltyHistory,
    notes
  };
}

/**
 * List all customer databases with summary metadata
 */
export function listAllCustomerDatabases(mainDbUsers = []) {
  const result = [];
  
  // Ensure default seeded customers have databases
  mainDbUsers.forEach(u => {
    if (u.role === 'customer') {
      syncCustomerProfile(u);
    }
  });

  // Read all .db files in CUSTOMER_DBS_DIR
  if (!fs.existsSync(CUSTOMER_DBS_DIR)) return [];

  const files = fs.readdirSync(CUSTOMER_DBS_DIR).filter(f => f.endsWith('.db') && !f.includes('-wal') && !f.includes('-shm'));

  for (const file of files) {
    const fullPath = path.join(CUSTOMER_DBS_DIR, file);
    try {
      const stats = fs.statSync(fullPath);
      // Open safely
      const db = new DatabaseSync(fullPath);
      const profile = db.prepare('SELECT * FROM customer_profile LIMIT 1').get();
      const orderCount = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total FROM customer_orders').get();

      if (profile) {
        result.push({
          id: profile.id,
          full_name: profile.full_name,
          phone: profile.phone,
          email: profile.email,
          avatar: profile.avatar || '✨',
          vip_tier: profile.vip_tier || 'Standard',
          loyalty_points: profile.loyalty_points || 0,
          allergy_exclusions: profile.allergy_exclusions || '',
          total_orders: orderCount ? orderCount.count : 0,
          total_spent: orderCount ? orderCount.total : 0,
          db_filename: file,
          db_size_bytes: stats.size,
          db_size_formatted: `${(stats.size / 1024).toFixed(1)} KB`,
          last_updated: stats.mtime
        });
      }
    } catch (e) {
      console.error(`Error reading customer DB file ${file}:`, e);
    }
  }

  return result;
}

/**
 * Adjust customer loyalty points directly in their dedicated SQLite database
 */
export function adjustCustomerLoyalty(customerPhoneOrId, changeAmount, reason) {
  const db = getCustomerDb(customerPhoneOrId);
  const profile = db.prepare('SELECT id, loyalty_points FROM customer_profile LIMIT 1').get();

  if (!profile) return null;

  const newBalance = Math.max(0, Number(profile.loyalty_points) + Number(changeAmount));

  db.prepare('UPDATE customer_profile SET loyalty_points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(newBalance, profile.id);

  db.prepare(`
    INSERT INTO loyalty_ledger (change_amount, balance_after, action_type, description)
    VALUES (?, ?, 'admin_adjustment', ?)
  `).run(Number(changeAmount), newBalance, reason || 'Adjusted by Restaurant Administrator');

  return {
    previousBalance: profile.loyalty_points,
    newBalance,
    changeAmount
  };
}

/**
 * Update allergy preferences directly in the customer's dedicated SQLite database
 */
export function updateCustomerAllergies(customerPhoneOrId, allergiesString) {
  const db = getCustomerDb(customerPhoneOrId);
  const profile = db.prepare('SELECT id FROM customer_profile LIMIT 1').get();

  if (!profile) return null;

  db.prepare('UPDATE customer_profile SET allergy_exclusions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(allergiesString, profile.id);

  return { success: true, allergies: allergiesString };
}

/**
 * Seed initial sample customer SQLite databases with rich dining history & loyalty ledgers
 */
export function seedInitialCustomerDatabases(mainDb) {
  const initialCustomers = [
    {
      full_name: 'Sophia Lee',
      phone: '9876543210',
      email: 'sophia.lee@gmail.com',
      avatar: '✨',
      vip_tier: 'VIP Gold',
      loyalty_points: 840,
      allergy_exclusions: 'Nuts, Dairy',
      orders: [
        {
          order_id: 101,
          table_number: 'T-2',
          status: 'completed',
          total_amount: 1420.00,
          discount_amount: 140.00,
          items: [
            { name: 'Velvet Microfoam Flat White', qty: 2, price: 240.00 },
            { name: 'Smoked Salmon & Capers Brioche Tartine', qty: 1, price: 420.00 },
            { name: 'Artisanal Saffron Sourdough Truffle Tart', qty: 1, price: 520.00 }
          ],
          created_at: '2026-10-08 13:20:00'
        },
        {
          order_id: 102,
          table_number: 'T-4',
          status: 'completed',
          total_amount: 980.00,
          discount_amount: 0,
          items: [
            { name: 'Belgian Dark Chocolate Mocha Royale', qty: 1, price: 320.00 },
            { name: 'Wagyu Tenderloin Steak Medallion', qty: 1, price: 660.00 }
          ],
          created_at: '2026-10-09 20:15:00'
        }
      ]
    },
    {
      full_name: 'Arjun Patel',
      phone: '9812345678',
      email: 'arjun.patel@outlook.com',
      avatar: '🌟',
      vip_tier: 'VIP Silver',
      loyalty_points: 520,
      allergy_exclusions: 'Gluten',
      orders: [
        {
          order_id: 103,
          table_number: 'T-1',
          status: 'completed',
          total_amount: 1260.00,
          discount_amount: 100.00,
          items: [
            { name: 'Black Angus Filet Mignon', qty: 1, price: 890.00 },
            { name: 'Iced Salted Caramel Macchiato', qty: 1, price: 280.00 }
          ],
          created_at: '2026-10-07 19:40:00'
        }
      ]
    },
    {
      full_name: 'Priya Sharma',
      phone: '9823456789',
      email: 'priya.sharma@gmail.com',
      avatar: '🌸',
      vip_tier: 'Standard',
      loyalty_points: 310,
      allergy_exclusions: 'Seafood',
      orders: [
        {
          order_id: 104,
          table_number: 'T-3',
          status: 'completed',
          total_amount: 760.00,
          discount_amount: 0,
          items: [
            { name: 'Belgian Dark Chocolate Mocha Royale', qty: 2, price: 320.00 },
            { name: 'Velvet Microfoam Flat White', qty: 1, price: 240.00 }
          ],
          created_at: '2026-10-08 16:10:00'
        }
      ]
    },
    {
      full_name: 'Rohan Mehta',
      phone: '9834567890',
      email: 'rohan.mehta@yahoo.com',
      avatar: '☕',
      vip_tier: 'VIP Gold',
      loyalty_points: 920,
      allergy_exclusions: '',
      orders: [
        {
          order_id: 105,
          table_number: 'T-6',
          status: 'completed',
          total_amount: 2450.00,
          discount_amount: 250.00,
          items: [
            { name: 'Artisanal Brioche Toast French Royale', qty: 2, price: 450.00 },
            { name: 'Wagyu Tenderloin Steak Medallion', qty: 2, price: 680.00 },
            { name: 'Single-Origin Ethiopian Pourover', qty: 2, price: 220.00 }
          ],
          created_at: '2026-10-09 21:00:00'
        }
      ]
    },
    {
      full_name: 'Ananya Sen',
      phone: '9845678901',
      email: 'ananya.sen@gmail.com',
      avatar: '💎',
      vip_tier: 'Standard',
      loyalty_points: 150,
      allergy_exclusions: 'Mushrooms',
      orders: [
        {
          order_id: 106,
          table_number: 'T-5',
          status: 'completed',
          total_amount: 520.00,
          discount_amount: 0,
          items: [
            { name: 'Velvet Microfoam Flat White', qty: 1, price: 240.00 },
            { name: 'Iced Salted Caramel Macchiato', qty: 1, price: 280.00 }
          ],
          created_at: '2026-10-10 11:30:00'
        }
      ]
    }
  ];

  initialCustomers.forEach(cust => {
    // 1. Ensure user exists in main DB
    if (mainDb) {
      try {
        const existing = mainDb.prepare('SELECT id FROM users WHERE phone = ?').get(cust.phone);
        if (!existing) {
          const username = `guest_${cust.phone.slice(-6)}`;
          mainDb.prepare(`
            INSERT INTO users (username, password_hash, full_name, role, email, phone, avatar, loyalty_points)
            VALUES (?, 'guest_nopass', ?, 'customer', ?, ?, ?, ?)
          `).run(username, cust.full_name, cust.email, cust.phone, cust.avatar, cust.loyalty_points);
        } else {
          mainDb.prepare('UPDATE users SET full_name = ?, email = ?, loyalty_points = ? WHERE phone = ?')
            .run(cust.full_name, cust.email, cust.loyalty_points, cust.phone);
        }
      } catch (e) {
        console.error('Error ensuring main DB customer:', e);
      }
    }

    // 2. Initialize and seed dedicated SQLite database
    const custDb = getCustomerDb(cust.phone);
    const existingProf = custDb.prepare('SELECT id FROM customer_profile LIMIT 1').get();

    if (!existingProf) {
      custDb.prepare(`
        INSERT INTO customer_profile (id, full_name, phone, email, avatar, vip_tier, loyalty_points, allergy_exclusions)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        cust.full_name,
        cust.phone,
        cust.email,
        cust.avatar,
        cust.vip_tier,
        cust.loyalty_points,
        cust.allergy_exclusions
      );

      // Seed orders
      cust.orders.forEach(ord => {
        custDb.prepare(`
          INSERT INTO customer_orders (order_id, table_number, status, total_amount, discount_amount, final_amount, items_json, special_instructions, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, '', ?)
        `).run(
          ord.order_id,
          ord.table_number,
          ord.status,
          ord.total_amount,
          ord.discount_amount,
          ord.total_amount - ord.discount_amount,
          JSON.stringify(ord.items),
          ord.created_at
        );
      });

      // Seed loyalty ledger
      custDb.prepare(`
        INSERT INTO loyalty_ledger (change_amount, balance_after, action_type, description, created_at)
        VALUES (?, ?, 'bonus', 'Welcome bonus loyalty points allocated upon registration', '2026-10-06 12:00:00')
      `).run(cust.loyalty_points, cust.loyalty_points);
    }
  });

  console.log(`[CustomerDB] Initialized dedicated SQLite databases for ${initialCustomers.length} customers.`);
}

