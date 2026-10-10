import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import {
  db,
  initDatabase,
  recalculateMenuAvailability,
  checkAndAutoGeneratePOs,
  getKitchenWorkloadInfo,
  atomicPlaceOrder,
  logAudit
} from './db.js';
import {
  getCustomerDb,
  syncCustomerProfile,
  syncOrderToCustomerDb,
  getCustomerDbDetails,
  listAllCustomerDatabases,
  adjustCustomerLoyalty,
  updateCustomerAllergies,
  getCustomerDbFilePath,
  seedInitialCustomerDatabases
} from './customerDbManager.js';

// Initialize SQLite schema and seeds
initDatabase();
seedInitialCustomerDatabases(db);
db.exec("UPDATE users SET phone = '9876543210' WHERE username = 'sophia.guest';");

// Migrate prices, wages and coupons to Indian Rupee (₹ INR)
try {
  db.exec(`
    UPDATE menu_items SET price = CASE id
      WHEN 1 THEN 280.00
      WHEN 2 THEN 320.00
      WHEN 3 THEN 240.00
      WHEN 4 THEN 420.00
      WHEN 5 THEN 890.00
      WHEN 6 THEN 680.00
      WHEN 7 THEN 590.00
      WHEN 8 THEN 520.00
      WHEN 9 THEN 450.00
      WHEN 10 THEN 780.00
      WHEN 11 THEN 340.00
      WHEN 12 THEN 980.00
      ELSE price
    END;

    UPDATE employees SET wage_rate = 650.00, overtime_rate = 975.00 WHERE position LIKE '%Manager%';
    UPDATE employees SET wage_rate = 450.00, overtime_rate = 675.00 WHERE position LIKE '%Chef%';
    UPDATE employees SET wage_rate = 250.00, overtime_rate = 375.00 WHERE position LIKE '%Waiter%';

    UPDATE suppliers SET min_order_value = 2500.00;
    UPDATE coupons SET min_order_amount = 500.00, max_discount = 250.00;

    UPDATE order_items SET unit_price = unit_price * 50 WHERE unit_price < 50;
    UPDATE orders SET 
      subtotal = subtotal * 50,
      tax_amount = tax_amount * 50,
      service_charge = service_charge * 50,
      discount_amount = discount_amount * 50,
      total_amount = total_amount * 50
    WHERE total_amount < 200;
  `);
} catch (e) {
  console.error('INR price migration:', e);
}

// Ensure ingredients table has expiry_date column and populate initial dates
try {
  db.exec("ALTER TABLE ingredients ADD COLUMN expiry_date DATE;");
} catch (e) {
  // column already exists
}

try {
  db.exec(`
    UPDATE ingredients SET expiry_date = CASE name
      WHEN 'Organic Whole Milk' THEN DATE('now', '+3 days')
      WHEN 'Wild Alaskan Salmon Fillets' THEN DATE('now', '+4 days')
      WHEN 'Fresh Porcini & Wild Mushrooms' THEN DATE('now', '+5 days')
      WHEN 'Artisanal Brioche Buns & Bread' THEN DATE('now', '+6 days')
      WHEN 'Hass Avocados' THEN DATE('now', '+7 days')
      WHEN 'Grade A Heavy Whipping Cream' THEN DATE('now', '+8 days')
      WHEN 'Genovese Basil Pesto' THEN DATE('now', '+12 days')
      WHEN 'A5 Wagyu Beef Patties' THEN DATE('now', '+14 days')
      WHEN 'Prime Beef Short Ribs' THEN DATE('now', '+15 days')
      WHEN 'Barista Oat Milk' THEN DATE('now', '+28 days')
      WHEN 'Aged 24-Month Parmigiano Reggiano' THEN DATE('now', '+45 days')
      WHEN 'Single-Origin Ethiopian Beans' THEN DATE('now', '+60 days')
      WHEN '72% Belgian Dark Chocolate' THEN DATE('now', '+90 days')
      WHEN 'Artisanal Salted Caramel' THEN DATE('now', '+90 days')
      WHEN 'White Truffle Infused Olive Oil' THEN DATE('now', '+120 days')
      WHEN 'Italian Arborio Rice' THEN DATE('now', '+180 days')
      WHEN 'Bronze-Die Rigatoni Pasta' THEN DATE('now', '+180 days')
      WHEN 'Organic Tricolor Quinoa' THEN DATE('now', '+210 days')
      WHEN 'Kashmir Saffron Threads' THEN DATE('now', '+365 days')
      ELSE DATE('now', '+30 days')
    END
    WHERE expiry_date IS NULL;
  `);
} catch (e) {
  console.error('Ingredient expiry_date migration:', e);
}

recalculateMenuAvailability();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

// Real-time WebSocket broadcasting utility
export function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to SmartServe Real-Time Stream' }));
  ws.on('message', message => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'PING') ws.send(JSON.stringify({ type: 'PONG' }));
    } catch (e) {}
  });
});

// ==========================================
// 1. AUTH / PERSONAS / USER SWITCHING
// ==========================================
app.get('/api/auth/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.role, u.email, u.phone, u.avatar, u.loyalty_points,
           e.position, e.wage_rate
    FROM users u
    LEFT JOIN employees e ON u.id = e.user_id
    ORDER BY u.id
  `).all();
  res.json(users);
});

app.get('/api/auth/me/:id', (req, res) => {
  const user = db.prepare(`
    SELECT u.*, e.id as employee_id, e.position, e.wage_rate, e.overtime_rate
    FROM users u
    LEFT JOIN employees e ON u.id = e.user_id
    WHERE u.id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const safeUser = { ...user };
  delete safeUser.password_hash;
  res.json(safeUser);
});

// Staff & Admin Authentication (Credentials: Username/Email + Password)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter both username/email and password.' });
  }

  const cleanIdentifier = String(username).trim();
  const cleanPassword = String(password).trim();

  const user = db.prepare(`
    SELECT u.*, e.id as employee_id, e.position, e.wage_rate, e.overtime_rate
    FROM users u
    LEFT JOIN employees e ON u.id = e.user_id
    WHERE LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?)
  `).get(cleanIdentifier, cleanIdentifier);

  if (!user) {
    return res.status(401).json({ error: 'No account found with this username or email.' });
  }

  if (user.password_hash !== cleanPassword) {
    return res.status(401).json({ error: 'Incorrect password. Please verify your credentials.' });
  }

  logAudit(user.full_name, user.role, 'AUTH_LOGIN', 'user', user.id, `User ${user.username} logged in successfully`);

  const safeUser = { ...user };
  delete safeUser.password_hash;

  const token = `smartserve_token_${user.id}_${Date.now()}`;
  res.json({
    success: true,
    message: `Welcome back, ${user.full_name}!`,
    user: safeUser,
    token
  });
});

// Customer Authentication (Name & Phone Number - Frictionless Dining Access)
app.post('/api/auth/customer-login', (req, res) => {
  const { full_name, phone, table_number } = req.body;
  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Please enter both your Full Name and Mobile Phone Number.' });
  }

  const cleanName = String(full_name).trim();
  const cleanPhone = String(phone).trim().replace(/\D/g, ''); // Numbers only

  // Validation 1: Name must contain ONLY letters (no numbers)
  if (!/^[a-zA-Z\s'-]+$/.test(cleanName)) {
    return res.status(400).json({ error: 'Name must contain only letters (no numbers allowed).' });
  }

  // Validation 2: Phone must contain only numbers and be EXACTLY 10 digits
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Phone number must contain only numbers and be exactly 10 digits.' });
  }

  // Check if a customer exists with this phone number
  let user = db.prepare(`
    SELECT * FROM users 
    WHERE role = 'customer' AND (phone = ? OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '') = ?)
  `).get(cleanPhone, cleanPhone);

  let isNewCustomer = false;

  if (user) {
    // Update name if changed
    if (user.full_name !== cleanName) {
      db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(cleanName, user.id);
      user.full_name = cleanName;
    }
  } else {
    isNewCustomer = true;
    const baseUsername = `guest_${cleanPhone.slice(-6)}`;
    let username = baseUsername;

    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) {
      username = `${baseUsername}_${Date.now().toString().slice(-4)}`;
    }

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, email, phone, avatar, loyalty_points)
      VALUES (?, 'guest_nopass', ?, 'customer', null, ?, '✨', 150)
    `);

    const userRes = insertUser.run(username, cleanName, cleanPhone);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userRes.lastInsertRowid);
  }

  logAudit(cleanName, 'customer', 'CUSTOMER_AUTH', 'user', user.id, `Customer checked in with phone ${cleanPhone}`);

  // Synchronize isolated SQLite database for this customer
  syncCustomerProfile(user);

  const safeUser = { 
    ...user,
    db_filename: `customer_${cleanPhone}.db`,
    db_status: 'ACID Isolated SQLite'
  };
  delete safeUser.password_hash;

  const token = `smartserve_cust_${user.id}_${Date.now()}`;
  res.json({
    success: true,
    message: isNewCustomer 
      ? `Welcome to SmartServe, ${user.full_name}! 150 bonus loyalty points credited.` 
      : `Welcome back, ${user.full_name}! You have ${user.loyalty_points} loyalty points.`,
    user: safeUser,
    table_number: table_number || 'T-2',
    token,
    isNewCustomer
  });
});

// User Registration (Create Account)
app.post('/api/auth/register', (req, res) => {
  const { username, password, full_name, email, phone, role } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Full name, username, and password are required.' });
  }

  const cleanFullName = String(full_name).trim();
  const cleanUsername = String(username).trim().toLowerCase();
  const cleanPassword = String(password).trim();
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;
  const cleanPhone = phone ? String(phone).trim().replace(/\D/g, '') : null;
  const selectedRole = ['admin', 'waiter', 'kitchen', 'customer'].includes(role) ? role : 'customer';

  // Validation 1: Name must contain only letters (no numbers)
  if (!/^[a-zA-Z\s'-]+$/.test(cleanFullName)) {
    return res.status(400).json({ error: 'Full name must contain only letters (no numbers allowed).' });
  }

  // Validation 2: Email must contain '@'
  if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
    return res.status(400).json({ error: "Email must be valid and contain '@' (e.g. user@example.com)." });
  }

  // Validation 3: Phone must be 10 digits if provided
  if (cleanPhone && cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Phone number must contain only numbers and be exactly 10 digits.' });
  }

  // Check uniqueness
  const existing = db.prepare(`
    SELECT id FROM users 
    WHERE LOWER(username) = ? OR (email IS NOT NULL AND LOWER(email) = ?)
  `).get(cleanUsername, cleanEmail || '');

  if (existing) {
    return res.status(400).json({ error: 'An account with this username or email already exists.' });
  }

  // Determine avatar
  let avatar = '✨';
  if (selectedRole === 'admin') avatar = '👑';
  else if (selectedRole === 'kitchen') avatar = '👨‍🍳';
  else if (selectedRole === 'waiter') avatar = '🤵';

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, email, phone, avatar, loyalty_points)
    VALUES (?, ?, ?, ?, ?, ?, ?, 150)
  `);

  const userRes = insertUser.run(cleanUsername, cleanPassword, cleanFullName, selectedRole, cleanEmail, cleanPhone, avatar);
  const newUserId = userRes.lastInsertRowid;

  // If employee role, provision employee record
  let employeeId = null;
  let position = 'Guest Dining Customer';
  let wageRate = 0;
  let overtimeRate = 0;

  if (selectedRole === 'waiter') {
    position = 'Dining Floor Waiter';
    wageRate = 22.00;
    overtimeRate = 33.00;
  } else if (selectedRole === 'kitchen') {
    position = 'Station Line Chef';
    wageRate = 28.50;
    overtimeRate = 42.75;
  } else if (selectedRole === 'admin') {
    position = 'Assistant Restaurant Manager';
    wageRate = 36.00;
    overtimeRate = 54.00;
  }

  if (selectedRole !== 'customer') {
    const empRes = db.prepare(`
      INSERT INTO employees (user_id, position, wage_rate, overtime_rate, employment_status, hire_date)
      VALUES (?, ?, ?, ?, 'active', DATE('now'))
    `).run(newUserId, position, wageRate, overtimeRate);
    employeeId = empRes.lastInsertRowid;
  }

  logAudit(cleanFullName, selectedRole, 'AUTH_REGISTER', 'user', newUserId, `New account registered as ${selectedRole}`);

  const userObj = {
    id: newUserId,
    username: cleanUsername,
    full_name: cleanFullName,
    role: selectedRole,
    email: cleanEmail,
    phone: cleanPhone,
    avatar,
    loyalty_points: 150,
    employee_id: employeeId,
    position,
    wage_rate: wageRate,
    overtime_rate: overtimeRate
  };

  const token = `smartserve_token_${newUserId}_${Date.now()}`;

  res.status(201).json({
    success: true,
    message: 'Account created successfully! Welcome to SmartServe.',
    user: userObj,
    token
  });
});

// User Logout
app.post('/api/auth/logout', (req, res) => {
  const { userId, userName, role } = req.body;
  if (userId) {
    logAudit(userName || 'User', role || 'unknown', 'AUTH_LOGOUT', 'user', userId, 'User logged out');
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ==========================================
// 2. LIVE MENU & DISH AVAILABILITY
// ==========================================
app.get('/api/menu', (req, res) => {
  const { category, dietary, maxPrice, hurry, search, excludeIngredient } = req.query;

  let query = `
    SELECT m.*, c.name as category_name
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    query += ' AND (m.category_id = ? OR c.name = ?)';
    params.push(category, category);
  }
  if (maxPrice) {
    query += ' AND m.price <= ?';
    params.push(Number(maxPrice));
  }
  if (hurry === '1') {
    query += ' AND m.is_hurry_mode = 1 AND m.is_available = 1';
  }
  if (search) {
    query += ' AND (m.name LIKE ? OR m.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY m.is_available DESC, m.category_id ASC, m.price ASC';

  const items = db.prepare(query).all(...params);

  // Parse JSON fields and attach required recipe ingredients info
  const enriched = items.map(item => {
    let dietary_tags = [];
    let allergens = [];
    let customizable_options = [];
    try { dietary_tags = JSON.parse(item.dietary_tags || '[]'); } catch (e) {}
    try { allergens = JSON.parse(item.allergens || '[]'); } catch (e) {}
    try { customizable_options = JSON.parse(item.customizable_options || '[]'); } catch (e) {}

    // Fetch required ingredients
    const recipes = db.prepare(`
      SELECT i.id, i.name, i.unit, i.current_stock, r.quantity_required
      FROM recipes r
      JOIN ingredients i ON r.ingredient_id = i.id
      WHERE r.menu_item_id = ?
    `).all(item.id);

    return {
      ...item,
      dietary_tags,
      allergens,
      customizable_options,
      ingredients: recipes,
      is_available: Boolean(item.is_available)
    };
  });

  // Filter in-memory for dietary if requested
  let filtered = enriched;
  if (dietary) {
    filtered = filtered.filter(it => it.dietary_tags.includes(dietary.toLowerCase()));
  }

  // Filter out any dishes that contain the excluded ingredient
  if (excludeIngredient && excludeIngredient.trim()) {
    const rawTerm = excludeIngredient.trim().toLowerCase();
    
    // Build set of search tokens including plurals and common allergen synonyms
    const tokens = new Set([rawTerm]);
    if (rawTerm.endsWith('s') && rawTerm.length > 3) tokens.add(rawTerm.slice(0, -1));
    else tokens.add(rawTerm + 's');

    if (['dairy', 'milk', 'cheese', 'butter', 'cream', 'curd', 'paneer', 'yogurt'].some(t => rawTerm.includes(t))) {
      ['dairy', 'milk', 'cheese', 'butter', 'cream', 'mozzarella', 'parmesan', 'parmigiano', 'cheddar', 'curd', 'paneer', 'whey', 'ghee', 'yogurt'].forEach(t => tokens.add(t));
    }
    if (['nut', 'nuts', 'peanut', 'almond', 'cashew', 'walnut'].some(t => rawTerm.includes(t))) {
      ['nut', 'nuts', 'peanut', 'almonds', 'almond', 'pine nut', 'cashew', 'walnut', 'pistachio'].forEach(t => tokens.add(t));
    }
    if (['gluten', 'wheat', 'flour', 'bread', 'pasta'].some(t => rawTerm.includes(t))) {
      ['gluten', 'wheat', 'flour', 'bread', 'brioche', 'pasta', 'rigatoni', 'bun'].forEach(t => tokens.add(t));
    }
    if (['egg', 'eggs'].some(t => rawTerm.includes(t))) {
      ['egg', 'eggs', 'aioli', 'mayo', 'mayonnaise'].forEach(t => tokens.add(t));
    }
    if (['fish', 'seafood', 'salmon', 'prawn', 'shrimp'].some(t => rawTerm.includes(t))) {
      ['fish', 'seafood', 'salmon', 'prawn', 'shrimp', 'crab', 'lobster'].forEach(t => tokens.add(t));
    }
    if (['mushroom', 'mushrooms', 'fungus'].some(t => rawTerm.includes(t))) {
      ['mushroom', 'mushrooms', 'porcini', 'chanterelle', 'truffle'].forEach(t => tokens.add(t));
    }
    if (['onion', 'garlic'].some(t => rawTerm.includes(t))) {
      ['onion', 'garlic', 'shallot', 'chive', 'scallion'].forEach(t => tokens.add(t));
    }

    filtered = filtered.filter(it => {
      // Check recipe ingredient names
      const hasIng = it.ingredients && it.ingredients.some(ing => {
        const iName = ing.name.toLowerCase();
        return Array.from(tokens).some(t => iName.includes(t));
      });
      // Check allergen labels
      const hasAllergen = it.allergens && it.allergens.some(a => {
        const aName = a.toLowerCase();
        return Array.from(tokens).some(t => aName.includes(t));
      });
      // Check descriptions, dish name, and risk notices
      const desc = (it.description || '').toLowerCase();
      const dishName = (it.name || '').toLowerCase();
      const risk = (it.cross_contamination_risk || '').toLowerCase();
      
      const hasInText = Array.from(tokens).some(t => desc.includes(t) || dishName.includes(t) || risk.includes(t));

      // Return true ONLY IF this dish DOES NOT contain that ingredient!
      return !(hasIng || hasAllergen || hasInText);
    });
  }

  res.json(filtered);
});

app.get('/api/menu/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
  res.json(cats);
});

// Single dish details + Smart Alternative Recommendations
app.get('/api/menu/:id', (req, res) => {
  const item = db.prepare(`
    SELECT m.*, c.name as category_name
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE m.id = ?
  `).get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Dish not found' });

  let dietary_tags = [];
  let allergens = [];
  let customizable_options = [];
  try { dietary_tags = JSON.parse(item.dietary_tags || '[]'); } catch (e) {}
  try { allergens = JSON.parse(item.allergens || '[]'); } catch (e) {}
  try { customizable_options = JSON.parse(item.customizable_options || '[]'); } catch (e) {}

  const recipes = db.prepare(`
    SELECT i.id, i.name, i.unit, i.current_stock, r.quantity_required
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.menu_item_id = ?
  `).all(item.id);

  // If dish is out of stock, find smart available alternatives!
  let alternatives = [];
  if (!item.is_available) {
    alternatives = db.prepare(`
      SELECT m.*, c.name as category_name
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      WHERE m.is_available = 1 AND m.id != ?
      ORDER BY (m.category_id = ?) DESC, ABS(m.price - ?) ASC
      LIMIT 3
    `).all(item.id, item.category_id, item.price);

    alternatives = alternatives.map(alt => ({
      ...alt,
      dietary_tags: JSON.parse(alt.dietary_tags || '[]'),
      allergens: JSON.parse(alt.allergens || '[]')
    }));
  }

  res.json({
    ...item,
    dietary_tags,
    allergens,
    customizable_options,
    ingredients: recipes,
    alternatives
  });
});

// Admin: Create Menu Item with Recipe Ingredients
app.post('/api/menu', (req, res) => {
  const {
    category_id, name, description, price, prep_time_minutes,
    image_url, dietary_tags, allergens, cross_contamination_risk,
    customizable_options, calories, is_hurry_mode, recipe_ingredients
  } = req.body;

  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO menu_items (
        category_id, name, description, price, prep_time_minutes,
        image_url, is_available, dietary_tags, allergens, cross_contamination_risk,
        customizable_options, calories, is_hurry_mode
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
    `).run(
      category_id,
      name,
      description || '',
      Number(price),
      Number(prep_time_minutes || 10),
      image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      JSON.stringify(dietary_tags || []),
      JSON.stringify(allergens || []),
      cross_contamination_risk || '',
      JSON.stringify(customizable_options || []),
      Number(calories || 350),
      is_hurry_mode ? 1 : 0
    );

    const newItemId = result.lastInsertRowid;

    // Attach recipes
    if (Array.isArray(recipe_ingredients)) {
      const insRecipe = db.prepare('INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES (?, ?, ?)');
      for (const ing of recipe_ingredients) {
        if (ing.ingredient_id && ing.quantity_required > 0) {
          insRecipe.run(newItemId, ing.ingredient_id, ing.quantity_required);
        }
      }
    }

    recalculateMenuAvailability();
    logAudit('Admin', 'admin', 'CREATE_MENU_ITEM', 'menu_item', newItemId, { name, price });
    broadcast('MENU_AVAILABILITY_CHANGED', { menu_item_id: newItemId, action: 'created' });

    res.status(201).json({ success: true, id: newItemId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update Menu Item
app.put('/api/menu/:id', (req, res) => {
  const { id } = req.params;
  const {
    category_id, name, description, price, prep_time_minutes,
    image_url, dietary_tags, allergens, cross_contamination_risk,
    customizable_options, calories, is_hurry_mode, recipe_ingredients
  } = req.body;

  try {
    db.prepare(`
      UPDATE menu_items SET
        category_id = ?, name = ?, description = ?, price = ?, prep_time_minutes = ?,
        image_url = ?, dietary_tags = ?, allergens = ?, cross_contamination_risk = ?,
        customizable_options = ?, calories = ?, is_hurry_mode = ?
      WHERE id = ?
    `).run(
      category_id,
      name,
      description,
      Number(price),
      Number(prep_time_minutes),
      image_url,
      JSON.stringify(dietary_tags || []),
      JSON.stringify(allergens || []),
      cross_contamination_risk,
      JSON.stringify(customizable_options || []),
      Number(calories),
      is_hurry_mode ? 1 : 0,
      id
    );

    // Update recipe bindings if provided
    if (Array.isArray(recipe_ingredients)) {
      db.prepare('DELETE FROM recipes WHERE menu_item_id = ?').run(id);
      const insRecipe = db.prepare('INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES (?, ?, ?)');
      for (const ing of recipe_ingredients) {
        if (ing.ingredient_id && ing.quantity_required > 0) {
          insRecipe.run(id, ing.ingredient_id, ing.quantity_required);
        }
      }
    }

    recalculateMenuAvailability();
    logAudit('Admin', 'admin', 'UPDATE_MENU_ITEM', 'menu_item', id, { name, price });
    broadcast('MENU_AVAILABILITY_CHANGED', { menu_item_id: id, action: 'updated' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete Menu Item
app.delete('/api/menu/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
    logAudit('Admin', 'admin', 'DELETE_MENU_ITEM', 'menu_item', req.params.id);
    broadcast('MENU_AVAILABILITY_CHANGED', { menu_item_id: req.params.id, action: 'deleted' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. INGREDIENTS & INVENTORY MANAGEMENT
// ==========================================
app.get('/api/ingredients', (req, res) => {
  const ingredients = db.prepare(`
    SELECT i.*, s.name as supplier_name, s.lead_time_days
    FROM ingredients i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    ORDER BY (i.current_stock <= i.min_threshold) DESC, i.name ASC
  `).all();

  const formatted = ingredients.map(ing => {
    let status = 'normal';
    if (ing.current_stock <= 0) status = 'out_of_stock';
    else if (ing.current_stock <= ing.min_threshold) status = 'low_stock';

    // Count affected dishes
    const affectedDishes = db.prepare(`
      SELECT m.id, m.name
      FROM recipes r
      JOIN menu_items m ON r.menu_item_id = m.id
      WHERE r.ingredient_id = ?
    `).all(ing.id);

    return {
      ...ing,
      status,
      affected_dishes: affectedDishes
    };
  });

  res.json(formatted);
});

// Manual stock adjustment (Wastage / Spill / Manual Count Correction)
app.post('/api/ingredients/:id/adjust', (req, res) => {
  const { id } = req.params;
  const { change_amount, reason, notes, user_name } = req.body;

  if (change_amount === undefined || change_amount === 0) {
    return res.status(400).json({ error: 'Valid change amount required' });
  }

  const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
  if (!ing) return res.status(404).json({ error: 'Ingredient not found' });

  const previous_stock = ing.current_stock;
  const new_stock = Math.max(0, previous_stock + Number(change_amount));

  db.prepare('UPDATE ingredients SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(new_stock, id);

  db.prepare(`
    INSERT INTO inventory_movements (ingredient_id, change_amount, previous_stock, new_stock, reason, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, Number(change_amount), previous_stock, new_stock, reason || 'manual_adjustment', notes || '');

  if (req.body.expiry_date) {
    db.prepare('UPDATE ingredients SET expiry_date = ? WHERE id = ?').run(req.body.expiry_date, id);
  }

  recalculateMenuAvailability();
  checkAndAutoGeneratePOs();

  logAudit(user_name || 'Admin', 'admin', 'ADJUST_INVENTORY', 'ingredient', id, { previous_stock, new_stock, reason, expiry_date: req.body.expiry_date });

  broadcast('INVENTORY_UPDATED', { ingredient_id: id, new_stock, expiry_date: req.body.expiry_date, name: ing.name });
  broadcast('MENU_AVAILABILITY_CHANGED', { reason: 'inventory_adjusted' });

  res.json({ success: true, ingredient_id: id, previous_stock, new_stock, expiry_date: req.body.expiry_date });
});

// Update ingredient expiry date directly
app.patch('/api/ingredients/:id/expiry', (req, res) => {
  const { id } = req.params;
  const { expiry_date, user_name } = req.body;
  if (!expiry_date) return res.status(400).json({ error: 'Valid expiry date required' });

  const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
  if (!ing) return res.status(404).json({ error: 'Ingredient not found' });

  db.prepare('UPDATE ingredients SET expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(expiry_date, id);

  logAudit(user_name || 'Admin', 'admin', 'UPDATE_EXPIRY_DATE', 'ingredient', id, { previous_expiry: ing.expiry_date, new_expiry: expiry_date });
  broadcast('INVENTORY_UPDATED', { ingredient_id: id, expiry_date, name: ing.name });

  res.json({ success: true, ingredient_id: id, expiry_date });
});

// Inventory Movements Log
app.get('/api/inventory/movements', (req, res) => {
  const rows = db.prepare(`
    SELECT m.*, i.name as ingredient_name, i.unit
    FROM inventory_movements m
    JOIN ingredients i ON m.ingredient_id = i.id
    ORDER BY m.created_at DESC
    LIMIT 60
  `).all();
  res.json(rows);
});

// ==========================================
// 4. KITCHEN WORKLOAD & QUEUE
// ==========================================
app.get('/api/kitchen/workload', (req, res) => {
  const info = getKitchenWorkloadInfo();
  res.json(info);
});

// ==========================================
// 5. ORDERS & CHECKOUT (ATOMIC & VALIDATED)
// ==========================================
app.get('/api/orders', (req, res) => {
  const { status, customer_id, table_id } = req.query;
  let sql = `
    SELECT o.*, t.table_number
    FROM orders o
    LEFT JOIN restaurant_tables t ON o.table_id = t.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (customer_id) {
    sql += ' AND o.customer_id = ?';
    params.push(customer_id);
  }
  if (table_id) {
    sql += ' AND o.table_id = ?';
    params.push(table_id);
  }

  sql += ' ORDER BY o.created_at DESC LIMIT 50';

  const orders = db.prepare(sql).all(...params);

  // Attach items and splits
  const enriched = orders.map(ord => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(ord.id);
    const splits = db.prepare('SELECT * FROM bill_splits WHERE order_id = ?').all(ord.id);
    const issues = db.prepare('SELECT * FROM order_issues WHERE order_id = ?').all(ord.id);

    return {
      ...ord,
      items: items.map(it => ({
        ...it,
        selected_options: JSON.parse(it.selected_options || '{}')
      })),
      splits: splits.map(sp => ({
        ...sp,
        assigned_items: JSON.parse(sp.assigned_items || '[]')
      })),
      issues
    };
  });

  res.json(enriched);
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, t.table_number
    FROM orders o
    LEFT JOIN restaurant_tables t ON o.table_id = t.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const splits = db.prepare('SELECT * FROM bill_splits WHERE order_id = ?').all(order.id);
  const payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(order.id);
  const issues = db.prepare('SELECT * FROM order_issues WHERE order_id = ?').all(order.id);

  res.json({
    ...order,
    items: items.map(it => ({
      ...it,
      selected_options: JSON.parse(it.selected_options || '{}')
    })),
    splits: splits.map(sp => ({
      ...sp,
      assigned_items: JSON.parse(sp.assigned_items || '[]')
    })),
    payments,
    issues
  });
});

// Place new order atomically
app.post('/api/orders', (req, res) => {
  try {
    const result = atomicPlaceOrder(req.body);

    // Sync order into customer's dedicated SQLite database
    try {
      const orderRec = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.order_id);
      const itemsRec = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(result.order_id);
      let customerPhoneOrId = req.body.customer_phone;
      if (!customerPhoneOrId && orderRec && orderRec.customer_id) {
        const cust = db.prepare('SELECT phone, id FROM users WHERE id = ?').get(orderRec.customer_id);
        if (cust) customerPhoneOrId = cust.phone || cust.id;
      }
      if (customerPhoneOrId) {
        syncOrderToCustomerDb({ ...orderRec, items: itemsRec }, customerPhoneOrId);
      }
    } catch (syncErr) {
      console.error('Customer DB sync error:', syncErr);
    }

    broadcast('ORDER_CREATED', { order_id: result.order_id, order_number: result.order_number });
    broadcast('INVENTORY_UPDATED', { reason: 'new_order_placed' });
    broadcast('MENU_AVAILABILITY_CHANGED', { reason: 'new_order_placed' });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Order Status Transitions
app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, user_name, role } = req.body;

  const validTransitions = ['placed', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
  if (!validTransitions.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // If cancelling order, restore inventory
  if (status === 'cancelled' && order.status !== 'cancelled') {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    for (const item of items) {
      const recipes = db.prepare('SELECT * FROM recipes WHERE menu_item_id = ?').all(item.menu_item_id);
      for (const r of recipes) {
        const restoreAmount = r.quantity_required * item.quantity;
        const ing = db.prepare('SELECT current_stock FROM ingredients WHERE id = ?').get(r.ingredient_id);
        const newStock = ing.current_stock + restoreAmount;
        db.prepare('UPDATE ingredients SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newStock, r.ingredient_id);
        db.prepare(`
          INSERT INTO inventory_movements (ingredient_id, change_amount, previous_stock, new_stock, reason, reference_id, notes)
          VALUES (?, ?, ?, ?, 'manual_adjustment', ?, 'Restored upon Order Cancellation')
        `).run(r.ingredient_id, restoreAmount, ing.current_stock, newStock, order.order_number);
      }
    }
    recalculateMenuAvailability();
    broadcast('INVENTORY_UPDATED', { reason: 'order_cancelled' });
  }

  // If completed, free up table
  if (status === 'completed' && order.table_id) {
    db.prepare("UPDATE restaurant_tables SET status = 'cleaning', current_order_id = NULL WHERE id = ?").run(order.table_id);
    broadcast('TABLE_UPDATED', { table_id: order.table_id, status: 'cleaning' });
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

  logAudit(user_name || 'Staff', role || 'staff', 'UPDATE_ORDER_STATUS', 'order', id, { previous: order.status, next: status });

  broadcast('ORDER_STATUS_CHANGED', { order_id: id, status });
  res.json({ success: true, status });
});

// Flag Order Issue / Delay
app.post('/api/orders/:id/issue', (req, res) => {
  const { id } = req.params;
  const { reported_by, issue_type, description, severity } = req.body;

  const result = db.prepare(`
    INSERT INTO order_issues (order_id, reported_by, issue_type, description, severity, status)
    VALUES (?, ?, ?, ?, ?, 'reported')
  `).run(id, reported_by || 'Staff', issue_type || 'delay', description, severity || 'medium');

  broadcast('ORDER_ISSUE_REPORTED', { order_id: id, issue_id: result.lastInsertRowid, issue_type, description });
  res.status(201).json({ success: true, issue_id: result.lastInsertRowid });
});

// ==========================================
// 6. SMART BILL SPLITTING & PAYMENT
// ==========================================
// Update or customize bill split
app.post('/api/orders/:id/split', (req, res) => {
  const { id } = req.params;
  const { split_type, splits } = req.body; // splits: array of { person_name, items: [...], total_share }

  if (!Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ error: 'Invalid splits array' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Delete previous pending splits
  db.prepare("DELETE FROM bill_splits WHERE order_id = ? AND payment_status = 'pending'").run(id);

  const insertSplit = db.prepare(`
    INSERT INTO bill_splits (
      order_id, split_type, person_name, assigned_items, subtotal_share,
      tax_share, service_share, discount_share, total_share, payment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  for (const s of splits) {
    insertSplit.run(
      id,
      split_type || 'custom',
      s.person_name,
      JSON.stringify(s.items || []),
      s.subtotal_share || (s.total_share * 0.85),
      s.tax_share || (s.total_share * 0.08),
      s.service_share || (s.total_share * 0.05),
      s.discount_share || 0,
      Number(s.total_share.toFixed(2))
    );
  }

  const updatedSplits = db.prepare('SELECT * FROM bill_splits WHERE order_id = ?').all(id);
  broadcast('BILL_SPLIT_UPDATED', { order_id: id, splits: updatedSplits });

  res.json({ success: true, splits: updatedSplits });
});

// Process online / in-person payment (with Sandbox Stripe simulation)
app.post('/api/orders/:id/pay', (req, res) => {
  const { id } = req.params;
  const { split_id, payment_method, amount, simulate_failure } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Handle intentional simulation failure test (Requirement 1.10)
  if (simulate_failure) {
    const txnRef = `TXN_FAIL_${Date.now()}`;
    db.prepare(`
      INSERT INTO payments (order_id, split_id, amount, payment_method, transaction_reference, status, gateway_provider, failure_reason)
      VALUES (?, ?, ?, ?, ?, 'failed', 'Stripe (Sandbox Mode)', 'Card declined: Insufficient funds simulation test')
    `).run(id, split_id || null, Number(amount || order.total_amount), payment_method || 'card', txnRef);

    return res.status(402).json({
      success: false,
      error: 'Payment declined by gateway: Card declined (Sandbox Simulation Test)',
      transaction_reference: txnRef
    });
  }

  // Prevent duplicate payments on the same split
  if (split_id) {
    const split = db.prepare('SELECT * FROM bill_splits WHERE id = ?').get(split_id);
    if (!split) return res.status(404).json({ error: 'Split record not found' });
    if (split.payment_status === 'paid') {
      return res.status(400).json({ error: 'This bill split share has already been paid' });
    }
  }

  const txnRef = `TXN_STRIPE_${Date.now().toString().slice(-7)}`;
  const payAmount = Number(amount || order.total_amount);

  db.prepare(`
    INSERT INTO payments (order_id, split_id, amount, payment_method, transaction_reference, status, gateway_provider)
    VALUES (?, ?, ?, ?, ?, 'successful', 'Stripe (Sandbox Mode)')
  `).run(id, split_id || null, payAmount, payment_method || 'card', txnRef);

  if (split_id) {
    db.prepare("UPDATE bill_splits SET payment_status = 'paid', payment_reference = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(txnRef, split_id);
  }

  // Check if all splits for order are now paid
  const pendingSplits = db.prepare("SELECT COUNT(*) as count FROM bill_splits WHERE order_id = ? AND payment_status = 'pending'").get(id).count;
  const newPaymentStatus = pendingSplits === 0 ? 'paid' : 'split_pending';

  db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(newPaymentStatus, id);

  logAudit(order.customer_name, 'customer', 'PROCESS_PAYMENT', 'payment', id, { amount: payAmount, txnRef, payment_method });

  broadcast('PAYMENT_PROCESSED', {
    order_id: id,
    split_id,
    amount: payAmount,
    transaction_reference: txnRef,
    order_payment_status: newPaymentStatus
  });

  res.json({
    success: true,
    transaction_reference: txnRef,
    gateway_provider: 'Stripe (Sandbox Mode)',
    payment_status: 'successful',
    order_payment_status: newPaymentStatus
  });
});

// Admin Refund Transaction
app.post('/api/payments/:id/refund', (req, res) => {
  const { id } = req.params;
  const { reason, authorized_by } = req.body;

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status === 'refunded') {
    return res.status(400).json({ error: 'Payment has already been refunded' });
  }

  const refundRef = `REF_${Date.now().toString().slice(-7)}`;
  db.prepare("UPDATE payments SET status = 'refunded', refund_reference = ? WHERE id = ?").run(refundRef, id);

  if (payment.split_id) {
    db.prepare("UPDATE bill_splits SET payment_status = 'refunded' WHERE id = ?").run(payment.split_id);
  }

  db.prepare("UPDATE orders SET payment_status = 'refunded' WHERE id = ?").run(payment.order_id);

  logAudit(authorized_by || 'Admin', 'admin', 'PROCESS_REFUND', 'payment', id, { amount: payment.amount, refundRef, reason });

  broadcast('PAYMENT_REFUNDED', { payment_id: id, order_id: payment.order_id, refund_reference: refundRef });
  res.json({ success: true, refund_reference: refundRef });
});

// ==========================================
// 7. RESTAURANT TABLES & FLOOR PLAN
// ==========================================
app.get('/api/tables', (req, res) => {
  const tables = db.prepare(`
    SELECT t.*, u.full_name as assigned_waiter_name, o.order_number, o.total_amount, o.status as order_status
    FROM restaurant_tables t
    LEFT JOIN employees e ON t.assigned_waiter_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN orders o ON t.current_order_id = o.id
    ORDER BY t.table_number ASC
  `).all();
  res.json(tables);
});

app.patch('/api/tables/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, user_name } = req.body;

  db.prepare('UPDATE restaurant_tables SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  logAudit(user_name || 'Staff', 'staff', 'UPDATE_TABLE_STATUS', 'table', id, { status });
  broadcast('TABLE_UPDATED', { table_id: id, status });
  res.json({ success: true, status });
});

app.patch('/api/tables/:id/assign', (req, res) => {
  const { id } = req.params;
  const { assigned_waiter_id, user_name } = req.body;

  db.prepare('UPDATE restaurant_tables SET assigned_waiter_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(assigned_waiter_id || null, id);

  broadcast('TABLE_UPDATED', { table_id: id, assigned_waiter_id });
  res.json({ success: true });
});

// ==========================================
// 8. SERVICE REQUESTS (WATER, CUTLERY, BILL)
// ==========================================
app.get('/api/service-requests', (req, res) => {
  const requests = db.prepare(`
    SELECT r.*, u.full_name as staff_name
    FROM service_requests r
    LEFT JOIN employees e ON r.assigned_staff_id = e.id
    LEFT JOIN users u ON e.user_id = u.id
    ORDER BY (r.status = 'pending') DESC, r.created_at DESC
    LIMIT 30
  `).all();
  res.json(requests);
});

app.post('/api/service-requests', (req, res) => {
  const { table_id, table_number, request_type } = req.body;
  if (!table_number || !request_type) {
    return res.status(400).json({ error: 'Table number and request type required' });
  }

  const result = db.prepare(`
    INSERT INTO service_requests (table_id, table_number, request_type, status)
    VALUES (?, ?, ?, 'pending')
  `).run(table_id || 1, table_number, request_type);

  const newReq = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(result.lastInsertRowid);
  broadcast('SERVICE_REQUEST_CREATED', newReq);
  res.status(201).json(newReq);
});

app.patch('/api/service-requests/:id', (req, res) => {
  const { id } = req.params;
  const { status, assigned_staff_id } = req.body;

  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE service_requests
    SET status = ?, assigned_staff_id = COALESCE(?, assigned_staff_id), completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `).run(status, assigned_staff_id || null, completedAt, id);

  broadcast('SERVICE_REQUEST_UPDATED', { id, status });
  res.json({ success: true, id, status });
});

// ==========================================
// 9. SUPPLIERS & PURCHASE ORDERS
// ==========================================
app.get('/api/suppliers', (req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
  res.json(suppliers);
});

app.get('/api/purchase-orders', (req, res) => {
  const pos = db.prepare(`
    SELECT po.*, s.name as supplier_name, s.phone as supplier_phone, s.email as supplier_email
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY (po.status = 'suggested') DESC, (po.status = 'ordered') DESC, po.created_at DESC
  `).all();

  const enriched = pos.map(p => ({
    ...p,
    items: JSON.parse(p.items_json || '[]')
  }));
  res.json(enriched);
});

// Create Purchase Order
app.post('/api/purchase-orders', (req, res) => {
  const { supplier_id, items, expected_delivery, notes } = req.body;
  if (!supplier_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Supplier and items required' });
  }

  const poNumber = `PO-${Date.now().toString().slice(-6)}`;
  let totalCost = 0;
  for (const it of items) totalCost += (it.quantity * it.unit_cost);

  const result = db.prepare(`
    INSERT INTO purchase_orders (po_number, supplier_id, status, total_cost, items_json, expected_delivery, notes)
    VALUES (?, ?, 'ordered', ?, ?, ?, ?)
  `).run(poNumber, supplier_id, totalCost, JSON.stringify(items), expected_delivery || null, notes || '');

  broadcast('PO_UPDATED', { id: result.lastInsertRowid, status: 'ordered' });
  res.status(201).json({ success: true, id: result.lastInsertRowid, po_number: poNumber });
});

// Approve Suggested PO
app.patch('/api/purchase-orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, user_name } = req.body;

  db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(status, id);
  logAudit(user_name || 'Admin', 'admin', 'UPDATE_PO_STATUS', 'purchase_order', id, { status });
  broadcast('PO_UPDATED', { id, status });
  res.json({ success: true, status });
});

// Service Staff / Admin: Delivery Received & Verified -> Restock Inventory!
app.post('/api/purchase-orders/:id/verify-receive', (req, res) => {
  const { id } = req.params;
  const { verified_by_name } = req.body;

  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
  if (!po) return res.status(404).json({ error: 'Purchase Order not found' });
  if (po.status === 'verified') {
    return res.status(400).json({ error: 'PO has already been verified and restocked' });
  }

  const items = JSON.parse(po.items_json || '[]');

  db.exec('BEGIN TRANSACTION');
  try {
    for (const item of items) {
      const ing = db.prepare('SELECT current_stock, name FROM ingredients WHERE id = ?').get(item.ingredient_id);
      if (ing) {
        const prevStock = ing.current_stock;
        const newStock = prevStock + Number(item.quantity);

        db.prepare('UPDATE ingredients SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newStock, item.ingredient_id);

        db.prepare(`
          INSERT INTO inventory_movements (ingredient_id, change_amount, previous_stock, new_stock, reason, reference_id, notes)
          VALUES (?, ?, ?, ?, 'delivery_restock', ?, ?)
        `).run(
          item.ingredient_id,
          Number(item.quantity),
          prevStock,
          newStock,
          po.po_number,
          `Delivery verified from PO #${po.po_number}`
        );
      }
    }

    db.prepare("UPDATE purchase_orders SET status = 'verified', verified_at = CURRENT_TIMESTAMP, notes = notes || ' [Verified]' WHERE id = ?")
      .run(id);

    // Record expense for the delivery cost
    db.prepare(`
      INSERT INTO expenses (category, amount, description, recorded_by)
      VALUES ('inventory_cogs', ?, ?, ?)
    `).run(po.total_cost, `Supplier Delivery Verified (${po.po_number})`, verified_by_name || 'Staff');

    db.exec('COMMIT');

    // Automatically recheck menu items! If any were out of stock, they will immediately turn available!
    const unavailableCount = recalculateMenuAvailability();

    logAudit(verified_by_name || 'Staff', 'staff', 'VERIFY_DELIVERY_RESTOCK', 'purchase_order', id, { po_number: po.po_number, total_cost: po.total_cost });

    broadcast('INVENTORY_UPDATED', { reason: 'delivery_restocked', po_number: po.po_number });
    broadcast('MENU_AVAILABILITY_CHANGED', { reason: 'delivery_restocked', unavailable_count: unavailableCount });
    broadcast('PO_UPDATED', { id, status: 'verified' });

    res.json({ success: true, message: 'Delivery successfully verified and inventory replenished!', po_number: po.po_number });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. EMPLOYEES, ATTENDANCE & SHIFTS
// ==========================================
app.get('/api/employees', (req, res) => {
  const employees = db.prepare(`
    SELECT e.*, u.username, u.full_name, u.email, u.phone, u.avatar
    FROM employees e
    JOIN users u ON e.user_id = u.id
    ORDER BY u.full_name ASC
  `).all();
  res.json(employees);
});

app.get('/api/attendance', (req, res) => {
  const records = db.prepare(`
    SELECT a.*, u.full_name as employee_name, e.position, e.wage_rate
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    ORDER BY a.clock_in DESC
    LIMIT 60
  `).all();
  res.json(records);
});

// Personal Clock-In
app.post('/api/attendance/clock-in', (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id is required' });

  // Check if already clocked in
  const active = db.prepare("SELECT id FROM attendance WHERE employee_id = ? AND status IN ('clocked_in', 'on_break')").get(employee_id);
  if (active) return res.status(400).json({ error: 'Employee is already clocked in' });

  const result = db.prepare(`
    INSERT INTO attendance (employee_id, clock_in, status)
    VALUES (?, CURRENT_TIMESTAMP, 'clocked_in')
  `).run(employee_id);

  broadcast('ATTENDANCE_UPDATED', { employee_id, status: 'clocked_in' });
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// Start Break
app.post('/api/attendance/break-start', (req, res) => {
  const { employee_id } = req.body;
  const active = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND status = 'clocked_in'").get(employee_id);
  if (!active) return res.status(400).json({ error: 'No active clocked-in shift found' });

  db.prepare("UPDATE attendance SET status = 'on_break', break_start = CURRENT_TIMESTAMP WHERE id = ?").run(active.id);
  broadcast('ATTENDANCE_UPDATED', { employee_id, status: 'on_break' });
  res.json({ success: true });
});

// End Break
app.post('/api/attendance/break-end', (req, res) => {
  const { employee_id } = req.body;
  const active = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND status = 'on_break'").get(employee_id);
  if (!active) return res.status(400).json({ error: 'No active break shift found' });

  // Calculate break duration in minutes
  const breakStart = new Date(active.break_start || Date.now());
  const now = new Date();
  const minutes = Math.max(1, Math.round((now - breakStart) / 60000));

  db.prepare(`
    UPDATE attendance
    SET status = 'clocked_in', break_start = NULL, break_minutes = break_minutes + ?
    WHERE id = ?
  `).run(minutes, active.id);

  broadcast('ATTENDANCE_UPDATED', { employee_id, status: 'clocked_in' });
  res.json({ success: true, break_minutes_added: minutes });
});

// Clock-Out
app.post('/api/attendance/clock-out', (req, res) => {
  const { employee_id } = req.body;
  const active = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND status IN ('clocked_in', 'on_break')").get(employee_id);
  if (!active) return res.status(400).json({ error: 'No active shift found to clock out' });

  const clockIn = new Date(active.clock_in);
  const now = new Date();
  const diffHours = (now - clockIn) / 3600000;
  const verifiedHours = Math.max(0.1, Number((diffHours - ((active.break_minutes || 0) / 60)).toFixed(2)));

  db.prepare(`
    UPDATE attendance
    SET clock_out = CURRENT_TIMESTAMP, status = 'clocked_out', verified_hours = ?
    WHERE id = ?
  `).run(verifiedHours, active.id);

  broadcast('ATTENDANCE_UPDATED', { employee_id, status: 'clocked_out', verified_hours: verifiedHours });
  res.json({ success: true, verified_hours: verifiedHours });
});

// Admin Attendance Correction with Audit Reason
app.put('/api/attendance/:id', (req, res) => {
  const { id } = req.params;
  const { clock_in, clock_out, break_minutes, verified_hours, audit_reason, corrected_by } = req.body;

  if (!audit_reason) {
    return res.status(400).json({ error: 'Audit reason is mandatory for attendance corrections' });
  }

  db.prepare(`
    UPDATE attendance
    SET clock_in = ?, clock_out = ?, break_minutes = ?, verified_hours = ?,
        audit_reason = ?, corrected_by = ?
    WHERE id = ?
  `).run(clock_in, clock_out, break_minutes, verified_hours, audit_reason, corrected_by || 1, id);

  logAudit('Admin', 'admin', 'CORRECT_ATTENDANCE', 'attendance', id, { verified_hours, audit_reason });
  broadcast('ATTENDANCE_UPDATED', { id, action: 'corrected' });
  res.json({ success: true });
});

// ==========================================
// 11. AUTOMATIC SALARY ESTIMATION & PAYROLL
// ==========================================
app.get('/api/payroll/estimates', (req, res) => {
  const employees = db.prepare(`
    SELECT e.*, u.full_name, u.email
    FROM employees e
    JOIN users u ON e.user_id = u.id
    WHERE e.employment_status = 'active'
  `).all();

  const estimates = employees.map(emp => {
    // Sum attendance verified hours for the last 30 days
    const hoursRow = db.prepare(`
      SELECT SUM(verified_hours) as total_hours
      FROM attendance
      WHERE employee_id = ?
    `).get(emp.id);

    const totalHours = Number((hoursRow.total_hours || 16.5).toFixed(1));
    const regularHours = Math.min(totalHours, 40);
    const overtimeHours = Math.max(0, totalHours - 40);
    const regularPay = regularHours * emp.wage_rate;
    const overtimePay = overtimeHours * (emp.overtime_rate || emp.wage_rate * 1.5);
    const grossEstimate = Number((regularPay + overtimePay).toFixed(2));

    // Check if payroll record approved
    const payrollRec = db.prepare(`
      SELECT * FROM payroll_records
      WHERE employee_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(emp.id);

    return {
      employee_id: emp.id,
      full_name: emp.full_name,
      position: emp.position,
      wage_rate: emp.wage_rate,
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      total_hours: totalHours,
      gross_estimate: grossEstimate,
      payroll_record: payrollRec || { status: 'draft' }
    };
  });

  res.json(estimates);
});

// Admin Approve Payroll
app.post('/api/payroll/approve', (req, res) => {
  const { employee_id, period_start, period_end, regular_hours, overtime_hours, gross_estimate, approved_by_name } = req.body;

  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const result = db.prepare(`
    INSERT INTO payroll_records (
      employee_id, period_start, period_end, regular_hours, overtime_hours,
      hourly_rate, gross_estimate, net_estimate, status, approved_by, approved_at, payment_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1, CURRENT_TIMESTAMP, 'Approved by Admin for Direct Deposit batch')
  `).run(
    employee_id,
    period_start || '2026-10-01',
    period_end || '2026-10-15',
    regular_hours,
    overtime_hours,
    emp.wage_rate,
    gross_estimate,
    gross_estimate
  );

  logAudit(approved_by_name || 'Admin', 'admin', 'APPROVE_PAYROLL', 'payroll', result.lastInsertRowid, { employee_id, gross_estimate });

  res.json({ success: true, record_id: result.lastInsertRowid, status: 'approved' });
});

// ==========================================
// 12. ANALYTICS & PROFIT COGS
// ==========================================
app.get('/api/analytics/overview', (req, res) => {
  // Sales calculations
  const totalSalesRow = db.prepare("SELECT SUM(total_amount) as total, COUNT(*) as orders_count FROM orders WHERE status != 'cancelled'").get();
  const totalSales = Number((totalSalesRow.total || 0).toFixed(2));
  const ordersCount = totalSalesRow.orders_count || 0;
  const aov = ordersCount > 0 ? Number((totalSales / ordersCount).toFixed(2)) : 0;

  // Active orders
  const activeOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('placed', 'confirmed', 'preparing', 'ready')").get().count;

  // Low stock ingredients
  const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM ingredients WHERE current_stock <= min_threshold').get().count;

  // Pending POs
  const pendingPOs = db.prepare("SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('suggested', 'ordered')").get().count;

  // Staff currently clocked in
  const staffOnDuty = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE status = 'clocked_in'").get().count;

  // Unresolved complaints
  const unresolvedIssues = db.prepare("SELECT COUNT(*) as count FROM order_issues WHERE status != 'resolved'").get().count;

  // Top selling dishes
  const topDishes = db.prepare(`
    SELECT oi.name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.unit_price) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'cancelled'
    GROUP BY oi.name
    ORDER BY total_sold DESC
    LIMIT 5
  `).all();

  // Expiring ingredients count (<= 7 days)
  const expiringSoonCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM ingredients 
    WHERE expiry_date IS NOT NULL 
      AND (julianday(expiry_date) - julianday('now')) <= 7
  `).get().count;

  // Hourly revenue trends today (from 08:00 to 22:00)
  const hourlySlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  const hourlyWeights = [0.08, 0.12, 0.22, 0.15, 0.10, 0.18, 0.12, 0.03];
  const hourlyTrend = hourlySlots.map((time, idx) => {
    const revenue = Number((totalSales * hourlyWeights[idx]).toFixed(2));
    const orders = Math.max(1, Math.round(ordersCount * hourlyWeights[idx]));
    return { time, revenue, orders };
  });

  // Daily revenue trends for the week
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyWeights = [0.11, 0.12, 0.13, 0.14, 0.18, 0.20, 0.12];
  const dailyTrend = days.map((day, idx) => {
    const revenue = Number((totalSales * dailyWeights[idx] * 0.95).toFixed(2));
    const orders = Math.max(1, Math.round(ordersCount * dailyWeights[idx]));
    return { day, revenue, orders };
  });

  // Category revenue breakdown
  const categoryRevenue = db.prepare(`
    SELECT c.name, SUM(oi.quantity * oi.unit_price) as revenue, SUM(oi.quantity) as items_sold
    FROM order_items oi
    JOIN menu_items m ON oi.menu_item_id = m.id
    JOIN categories c ON m.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'cancelled'
    GROUP BY c.name
    ORDER BY revenue DESC
  `).all();

  res.json({
    totalSales,
    ordersCount,
    aov,
    activeOrders,
    lowStockCount,
    expiringSoonCount,
    pendingPOs,
    staffOnDuty,
    unresolvedIssues,
    topDishes,
    revenueTrend: {
      hourly: hourlyTrend,
      daily: dailyTrend,
      byCategory: categoryRevenue
    }
  });
});

app.get('/api/analytics/profit-expenses', (req, res) => {
  const totalRevenueRow = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE status != 'cancelled'").get();
  const totalRevenue = Number((totalRevenueRow.total || 0).toFixed(2));

  // Operating Expenses
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC').all();
  let totalExpenses = 0;
  for (const exp of expenses) totalExpenses += exp.amount;
  totalExpenses = Number(totalExpenses.toFixed(2));

  // Estimated gross profit & net profit
  const estimatedGrossProfit = Number((totalRevenue * 0.65).toFixed(2)); // estimated gross margin ~65%
  const estimatedNetProfit = Number((estimatedGrossProfit - totalExpenses).toFixed(2));

  res.json({
    totalRevenue,
    totalExpenses,
    estimatedGrossProfit,
    estimatedNetProfit,
    expenses
  });
});

app.get('/api/analytics/staff-performance', (req, res) => {
  const staff = db.prepare(`
    SELECT e.id, u.full_name, e.position,
           COUNT(DISTINCT t.id) as tables_served,
           AVG(f.service_rating) as avg_rating
    FROM employees e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN restaurant_tables t ON t.assigned_waiter_id = e.id
    LEFT JOIN feedbacks f ON 1=1
    GROUP BY e.id
  `).all();
  res.json(staff);
});

// ==========================================
// 13. COUPONS & LOYALTY PROGRAM
// ==========================================
app.get('/api/coupons', (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons WHERE is_active = 1').all();
  res.json(coupons);
});

app.post('/api/coupons/validate', (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ valid: false, message: 'Coupon code required' });

  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(code);
  if (!coupon) return res.status(404).json({ valid: false, message: 'Invalid or expired coupon code' });

  if (new Date(coupon.expiry_date) < new Date()) {
    return res.status(400).json({ valid: false, message: 'Coupon has expired' });
  }

  if (subtotal < coupon.min_order_amount) {
    return res.status(400).json({
      valid: false,
      message: `Minimum order of $${coupon.min_order_amount.toFixed(2)} required to apply this coupon`
    });
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = (subtotal * coupon.discount_value) / 100;
    if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;
  } else {
    discount = coupon.discount_value;
  }

  res.json({
    valid: true,
    code: coupon.code,
    description: coupon.description,
    discount_amount: Number(discount.toFixed(2))
  });
});

app.get('/api/loyalty/rewards', (req, res) => {
  const rewards = db.prepare('SELECT * FROM loyalty_rewards WHERE is_active = 1').all();
  res.json(rewards);
});

app.get('/api/loyalty/ledger/:userId', (req, res) => {
  const user = db.prepare('SELECT loyalty_points FROM users WHERE id = ?').get(req.params.userId);
  const history = db.prepare('SELECT * FROM loyalty_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.params.userId);
  res.json({
    balance: user ? user.loyalty_points : 0,
    history
  });
});

// Redeem reward
app.post('/api/loyalty/redeem', (req, res) => {
  const { user_id, reward_id } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  const reward = db.prepare('SELECT * FROM loyalty_rewards WHERE id = ? AND is_active = 1').get(reward_id);

  if (!user || !reward) return res.status(404).json({ error: 'User or reward not found' });
  if (user.loyalty_points < reward.points_cost) {
    return res.status(400).json({ error: `Insufficient points. You have ${user.loyalty_points} pts; reward requires ${reward.points_cost} pts.` });
  }

  db.prepare('UPDATE users SET loyalty_points = loyalty_points - ? WHERE id = ?').run(reward.points_cost, user_id);
  db.prepare(`
    INSERT INTO loyalty_transactions (user_id, points_change, reason)
    VALUES (?, ?, ?)
  `).run(user_id, -reward.points_cost, `Redeemed reward: ${reward.title}`);

  res.json({
    success: true,
    reward_title: reward.title,
    discount_value: reward.reward_value,
    new_balance: user.loyalty_points - reward.points_cost
  });
});

// ==========================================
// 14. CUSTOMER COMPENSATION & COMPLAINTS
// ==========================================
app.get('/api/compensations', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, o.order_number, oi.issue_type
    FROM compensations c
    LEFT JOIN orders o ON c.order_id = o.id
    LEFT JOIN order_issues oi ON c.issue_id = oi.id
    ORDER BY c.created_at DESC
  `).all();
  res.json(rows);
});

app.post('/api/compensations', (req, res) => {
  const { customer_id, customer_name, order_id, issue_id, compensation_type, value_amount, description, authorized_by } = req.body;

  // Check if compensation already granted for this issue to prevent duplicate payouts
  if (issue_id) {
    const existing = db.prepare('SELECT id FROM compensations WHERE issue_id = ?').get(issue_id);
    if (existing) {
      return res.status(400).json({ error: 'Compensation has already been authorized for this issue.' });
    }
  }

  const result = db.prepare(`
    INSERT INTO compensations (
      customer_id, customer_name, order_id, issue_id, compensation_type,
      value_amount, description, authorized_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    customer_id || 1,
    customer_name || 'Customer',
    order_id || null,
    issue_id || null,
    compensation_type || 'loyalty_points',
    Number(value_amount || 200),
    description || 'Inconvenience resolution',
    authorized_by || 'Admin Diana'
  );

  // If loyalty points, award directly
  if (compensation_type === 'loyalty_points' && customer_id) {
    db.prepare('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?').run(Number(value_amount), customer_id);
    db.prepare(`
      INSERT INTO loyalty_transactions (user_id, order_id, points_change, reason)
      VALUES (?, ?, ?, ?)
    `).run(customer_id, order_id || null, Number(value_amount), `Inconvenience compensation bonus`);
  }

  // Mark issue as resolved
  if (issue_id) {
    db.prepare("UPDATE order_issues SET status = 'resolved', resolution_notes = ? WHERE id = ?")
      .run(`Compensated with ${value_amount} via ${compensation_type}`, issue_id);
  }

  logAudit(authorized_by || 'Admin', 'admin', 'ISSUE_COMPENSATION', 'compensation', result.lastInsertRowid, { value_amount, compensation_type });
  broadcast('COMPENSATION_ISSUED', { customer_name, compensation_type, value_amount });

  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// ==========================================
// 15. RATINGS & FEEDBACK
// ==========================================
app.get('/api/feedbacks', (req, res) => {
  const reviews = db.prepare(`
    SELECT f.*, o.order_number
    FROM feedbacks f
    LEFT JOIN orders o ON f.order_id = o.id
    ORDER BY f.created_at DESC
    LIMIT 40
  `).all();
  res.json(reviews);
});

app.post('/api/feedbacks', (req, res) => {
  const { order_id, customer_name, food_rating, service_rating, comment } = req.body;
  if (!food_rating || !service_rating) {
    return res.status(400).json({ error: 'Ratings are required' });
  }

  const result = db.prepare(`
    INSERT INTO feedbacks (order_id, customer_name, food_rating, service_rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(order_id || null, customer_name || 'Anonymous Guest', food_rating, service_rating, comment || '');

  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// ==========================================
// 16. SHIFT HANDOVER NOTES
// ==========================================
app.get('/api/shift-notes', (req, res) => {
  const notes = db.prepare('SELECT * FROM shift_handover_notes ORDER BY created_at DESC LIMIT 30').all();
  res.json(notes);
});

app.post('/api/shift-notes', (req, res) => {
  const { staff_name, shift_type, notes, urgent } = req.body;
  if (!notes) return res.status(400).json({ error: 'Notes cannot be empty' });

  const result = db.prepare(`
    INSERT INTO shift_handover_notes (staff_name, shift_type, notes, urgent)
    VALUES (?, ?, ?, ?)
  `).run(staff_name || 'Staff Member', shift_type || 'morning', notes, urgent ? 1 : 0);

  broadcast('HANDOVER_NOTE_CREATED', { id: result.lastInsertRowid, notes, staff_name });
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// ==========================================
// 17. REPORTS & DATA EXPORT (CSV / JSON)
// ==========================================
app.get('/api/reports/export', (req, res) => {
  const { type, format } = req.query; // type: sales, inventory, attendance, payroll

  let data = [];
  let filename = `report_${type || 'data'}_${Date.now()}`;

  if (type === 'sales') {
    data = db.prepare('SELECT order_number, customer_name, subtotal, tax_amount, total_amount, status, payment_status, created_at FROM orders').all();
    filename = `sales_report_${Date.now()}`;
  } else if (type === 'inventory') {
    data = db.prepare('SELECT name, category, unit, current_stock, min_threshold, target_stock, unit_cost FROM ingredients').all();
    filename = `inventory_report_${Date.now()}`;
  } else if (type === 'attendance') {
    data = db.prepare(`
      SELECT u.full_name, a.clock_in, a.clock_out, a.break_minutes, a.verified_hours, a.status, a.audit_reason
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN users u ON e.user_id = u.id
    `).all();
    filename = `attendance_report_${Date.now()}`;
  } else if (type === 'payroll') {
    data = db.prepare(`
      SELECT u.full_name, p.period_start, p.period_end, p.regular_hours, p.overtime_hours, p.gross_estimate, p.status, p.approved_at
      FROM payroll_records p
      JOIN employees e ON p.employee_id = e.id
      JOIN users u ON e.user_id = u.id
    `).all();
    filename = `payroll_report_${Date.now()}`;
  } else {
    data = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
    filename = `audit_logs_${Date.now()}`;
  }

  if (format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  }

  // Convert to CSV
  if (data.length === 0) return res.send('No data available');
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers, ...rows].join('\n');

  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

// ==========================================
// 18. AUDIT LOGS
// ==========================================
app.get('/api/audit-logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 60').all();
  res.json(logs);
});

// ==========================================
// 19. CUSTOMER DEDICATED DATABASES API (CRM)
// ==========================================

// Get all customer databases with summary metadata
app.get('/api/customers', (req, res) => {
  try {
    const mainUsers = db.prepare("SELECT * FROM users WHERE role = 'customer'").all();
    const customers = listAllCustomerDatabases(mainUsers);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get individual customer's dedicated SQLite database details (orders, loyalty history, notes)
app.get('/api/customers/:identifier', (req, res) => {
  try {
    const details = getCustomerDbDetails(req.params.identifier);
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust customer loyalty in their dedicated SQLite database
app.post('/api/customers/:identifier/loyalty', (req, res) => {
  const { change_amount, reason, admin_name } = req.body;
  if (change_amount === undefined || isNaN(change_amount)) {
    return res.status(400).json({ error: 'Valid points change amount required' });
  }

  try {
    const result = adjustCustomerLoyalty(req.params.identifier, Number(change_amount), reason);
    if (!result) return res.status(404).json({ error: 'Customer database not found' });

    // Sync to main DB
    try {
      db.prepare('UPDATE users SET loyalty_points = ? WHERE phone = ? OR id = ?')
        .run(result.newBalance, req.params.identifier, req.params.identifier);
    } catch {}

    logAudit(admin_name || 'Admin', 'admin', 'ADJUST_CUSTOMER_LOYALTY', 'customer_db', req.params.identifier, {
      change_amount,
      newBalance: result.newBalance,
      reason
    });

    broadcast('CUSTOMER_DATABASE_UPDATED', { identifier: req.params.identifier, action: 'loyalty_adjusted' });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update customer allergy exclusions in their dedicated SQLite database
app.patch('/api/customers/:identifier/allergies', (req, res) => {
  const { allergy_exclusions, admin_name } = req.body;
  try {
    const result = updateCustomerAllergies(req.params.identifier, allergy_exclusions || '');
    if (!result) return res.status(404).json({ error: 'Customer database not found' });

    logAudit(admin_name || 'Admin', 'admin', 'UPDATE_CUSTOMER_ALLERGIES', 'customer_db', req.params.identifier, {
      allergy_exclusions
    });

    broadcast('CUSTOMER_DATABASE_UPDATED', { identifier: req.params.identifier, action: 'allergies_updated' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Direct file download of customer's raw dedicated SQLite .db file
app.get('/api/customers/:identifier/download-db', (req, res) => {
  try {
    const filePath = getCustomerDbFilePath(req.params.identifier);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Customer SQLite database file not found' });
    }
    const filename = path.basename(filePath);
    res.download(filePath, filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SmartServe backend running on http://localhost:${PORT}`);
  console.log(`WebSocket stream running on ws://localhost:${PORT}/ws`);
});
