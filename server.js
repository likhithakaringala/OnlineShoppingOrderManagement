const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "store.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "replace-this-secret-for-production",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax" }
}));

function initialData() {
  const passwordHash = bcrypt.hashSync("admin123", 10);
  return {
    users: [{ id: 1, name: "Store Admin", email: "admin@shop.com", passwordHash, role: "admin" }],
    products: [
      { id: 1, name: "Wireless Mouse", category: "Electronics", description: "Ergonomic wireless mouse", price: 599, stock: 20 },
      { id: 2, name: "USB Keyboard", category: "Electronics", description: "Comfortable USB keyboard", price: 899, stock: 15 },
      { id: 3, name: "Notebook", category: "Stationery", description: "A5 ruled notebook", price: 79, stock: 50 },
      { id: 4, name: "Water Bottle", category: "Accessories", description: "Reusable 1 litre bottle", price: 249, stock: 25 }
    ],
    orders: [],
    nextUserId: 2,
    nextProductId: 5,
    nextOrderId: 1
  };
}
function loadDB() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(initialData(), null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
let db = loadDB();
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Please log in first" });
  next();
}
function requireAdmin(req, res, next) {
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  next();
}

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: "Name, email and password (minimum 6 characters) are required" });
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: "Email is already registered" });
  const user = { id: db.nextUserId++, name: name.trim(), email: email.trim().toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10), role: "customer" };
  db.users.push(user); saveDB();
  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
});
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === String(email || "").toLowerCase());
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash))
    return res.status(401).json({ error: "Invalid email or password" });
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});
app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ message: "Logged out" })));
app.get("/api/me", (req, res) => {
  const user = db.users.find(u => u.id === req.session.userId);
  res.json({ user: user ? publicUser(user) : null });
});

app.get("/api/products", (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const products = db.products.filter(p =>
    !q || [p.name, p.category, p.description].some(v => v.toLowerCase().includes(q)));
  res.json({ products });
});
app.get("/api/products/:id", (req, res) => {
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({ product });
});
app.post("/api/products", requireLogin, requireAdmin, (req, res) => {
  const { name, category, description = "", price, stock } = req.body;
  if (!name || !category || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0)
    return res.status(400).json({ error: "Enter valid product details" });
  const product = { id: db.nextProductId++, name, category, description, price: Number(price), stock: Number(stock) };
  db.products.push(product); saveDB();
  res.status(201).json({ product });
});
app.put("/api/products/:id", requireLogin, requireAdmin, (req, res) => {
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  const { name, category, description, price, stock } = req.body;
  Object.assign(product, { name: name ?? product.name, category: category ?? product.category,
    description: description ?? product.description, price: price === undefined ? product.price : Number(price),
    stock: stock === undefined ? product.stock : Number(stock) });
  saveDB(); res.json({ product });
});
app.delete("/api/products/:id", requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const before = db.products.length;
  db.products = db.products.filter(p => p.id !== id);
  if (db.products.length === before) return res.status(404).json({ error: "Product not found" });
  saveDB(); res.json({ message: "Product deleted" });
});

app.get("/api/cart", requireLogin, (req, res) => res.json({ items: req.session.cart || [] }));
app.post("/api/cart", requireLogin, (req, res) => {
  const product = db.products.find(p => p.id === Number(req.body.productId));
  const quantity = Number(req.body.quantity || 1);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: "Invalid quantity" });
  const cart = req.session.cart || [];
  const existing = cart.find(i => i.productId === product.id);
  const newQty = (existing ? existing.quantity : 0) + quantity;
  if (newQty > product.stock) return res.status(400).json({ error: "Requested quantity exceeds available stock" });
  if (existing) existing.quantity = newQty;
  else cart.push({ productId: product.id, quantity });
  req.session.cart = cart; res.json({ items: cart, message: "Product added to cart" });
});
app.put("/api/cart/:productId", requireLogin, (req, res) => {
  const productId = Number(req.params.productId), quantity = Number(req.body.quantity);
  const product = db.products.find(p => p.id === productId);
  const cart = req.session.cart || [];
  const item = cart.find(i => i.productId === productId);
  if (!item || !product) return res.status(404).json({ error: "Cart item not found" });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.stock)
    return res.status(400).json({ error: "Quantity must be between 1 and available stock" });
  item.quantity = quantity; req.session.cart = cart; res.json({ items: cart, message: "Cart updated" });
});
app.delete("/api/cart/:productId", requireLogin, (req, res) => {
  req.session.cart = (req.session.cart || []).filter(i => i.productId !== Number(req.params.productId));
  res.json({ items: req.session.cart, message: "Product removed" });
});
app.post("/api/checkout", requireLogin, (req, res) => {
  const cart = req.session.cart || [];
  if (!cart.length) return res.status(400).json({ error: "Your cart is empty" });
  const orderItems = [];
  for (const item of cart) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product || product.stock < item.quantity) return res.status(400).json({ error: "Insufficient stock for an item" });
    orderItems.push({ productId: product.id, name: product.name, price: product.price, quantity: item.quantity });
  }
  const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  orderItems.forEach(i => { db.products.find(p => p.id === i.productId).stock -= i.quantity; });
  const order = { id: db.nextOrderId++, userId: req.session.userId, items: orderItems, total,
    status: "Placed", createdAt: new Date().toISOString() };
  db.orders.push(order); req.session.cart = []; saveDB();
  res.status(201).json({ order, message: "Order placed successfully" });
});
app.get("/api/orders", requireLogin, (req, res) =>
  res.json({ orders: db.orders.filter(o => o.userId === req.session.userId).sort((a,b) => b.id-a.id) }));

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, "0.0.0.0", () => console.log(`Online Shopping app running at http://localhost:${PORT}`));
