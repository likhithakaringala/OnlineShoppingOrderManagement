const $ = s => document.querySelector(s);
let currentUser = null;
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function message(text, bad = false) { $("#notice").textContent = text; $("#notice").className = bad ? "error" : "success"; }
function show(view) {
  ["shop","cart","orders","admin"].forEach(v => $(`#${v}-view`).hidden = v !== view);
  if (view === "cart") loadCart();
  if (view === "orders") loadOrders();
  if (view === "admin") loadAdmin();
}
document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));
async function loadUser() {
  const data = await api("/api/me"); currentUser = data.user;
  $("#user-label").textContent = currentUser ? `Hi, ${currentUser.name}` : "Guest";
  $("#auth-panel").hidden = !!currentUser; $("#logout-btn").hidden = !currentUser;
  $("#admin-nav").hidden = !currentUser || currentUser.role !== "admin";
  await loadProducts();
}
async function loadProducts() {
  const q = encodeURIComponent($("#search").value || "");
  const { products } = await api(`/api/products?q=${q}`);
  $("#products").innerHTML = products.map(p => `<article class="product"><span class="tag">${escapeHtml(p.category)}</span><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description)}</p><strong>₹${p.price.toFixed(2)}</strong><p>${p.stock} in stock</p><button data-add="${p.id}" ${p.stock < 1 ? "disabled" : ""}>Add to Cart</button></article>`).join("") || "<p>No products found.</p>";
  document.querySelectorAll("[data-add]").forEach(b => b.onclick = async () => {
    try { await api("/api/cart", { method:"POST", body:JSON.stringify({ productId:Number(b.dataset.add), quantity:1 }) }); message("Product added to cart."); updateCartCount(); }
    catch(e) { message(e.message, true); }
  });
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
async function updateCartCount() {
  if (!currentUser) { $("#cart-count").textContent = "0"; return; }
  try { const {items} = await api("/api/cart"); $("#cart-count").textContent = items.reduce((n,i)=>n+i.quantity,0); } catch {}
}
async function loadCart() {
  if (!currentUser) { $("#cart-items").innerHTML = "<p>Please log in to view your cart.</p>"; return; }
  const {items} = await api("/api/cart");
  const {products} = await api("/api/products");
  const rows = items.map(i => { const p=products.find(x=>x.id===i.productId); return p ? `<div class="cart-row"><div><b>${escapeHtml(p.name)}</b><p>₹${p.price.toFixed(2)} each</p></div><input aria-label="Quantity for ${escapeHtml(p.name)}" type="number" min="1" max="${p.stock}" value="${i.quantity}" data-qty="${p.id}"><button data-remove="${p.id}" class="secondary">Remove</button><b>₹${(p.price*i.quantity).toFixed(2)}</b></div>` : ""; }).join("");
  $("#cart-items").innerHTML = rows || "<p>Your cart is empty.</p>";
  document.querySelectorAll("[data-qty]").forEach(el => el.onchange = async () => {
    try { await api(`/api/cart/${el.dataset.qty}`, {method:"PUT",body:JSON.stringify({quantity:Number(el.value)})}); loadCart(); updateCartCount(); message("Cart quantity updated."); } catch(e){message(e.message,true);loadCart();}
  });
  document.querySelectorAll("[data-remove]").forEach(b => b.onclick = async () => { await api(`/api/cart/${b.dataset.remove}`,{method:"DELETE"}); loadCart(); updateCartCount(); message("Product removed."); });
}
async function loadOrders() {
  if (!currentUser) { $("#orders").innerHTML = "<p>Please log in to view orders.</p>"; return; }
  const {orders} = await api("/api/orders");
  $("#orders").innerHTML = orders.map(o => `<article class="order"><h3>Order #${o.id} · ${o.status}</h3><p>${new Date(o.createdAt).toLocaleString()}</p><p>${o.items.map(i=>`${escapeHtml(i.name)} × ${i.quantity}`).join(", ")}</p><b>Total: ₹${o.total.toFixed(2)}</b></article>`).join("") || "<p>No orders yet.</p>";
}
async function loadAdmin() {
  if (!currentUser || currentUser.role !== "admin") return;
  const {products} = await api("/api/products");
  $("#admin-products").innerHTML = `<h2>Current Products</h2>` + products.map(p=>`<div class="cart-row"><span>${escapeHtml(p.name)} · ₹${p.price} · Stock ${p.stock}</span><button class="secondary" data-delete="${p.id}">Delete</button></div>`).join("");
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{try{await api(`/api/products/${b.dataset.delete}`,{method:"DELETE"});loadAdmin();loadProducts();message("Product deleted.");}catch(e){message(e.message,true);}});
}
$("#login-form").onsubmit = async e => { e.preventDefault(); const f=new FormData(e.target); try {await api("/api/login",{method:"POST",body:JSON.stringify(Object.fromEntries(f))});e.target.reset();await loadUser();updateCartCount();message("Login successful.");}catch(err){message(err.message,true);} };
$("#register-form").onsubmit = async e => { e.preventDefault(); const f=new FormData(e.target); try {await api("/api/register",{method:"POST",body:JSON.stringify(Object.fromEntries(f))});e.target.reset();await loadUser();updateCartCount();message("Registration successful.");}catch(err){message(err.message,true);} };
$("#logout-btn").onclick = async()=>{await api("/api/logout",{method:"POST"});currentUser=null;await loadUser();updateCartCount();message("Logged out.");show("shop");};
$("#search").oninput = loadProducts;
$("#checkout-btn").onclick = async()=>{try{const {order}=await api("/api/checkout",{method:"POST"});message(`Order #${order.id} placed successfully.`);updateCartCount();show("orders");}catch(e){message(e.message,true);}};
$("#product-form").onsubmit = async e=>{e.preventDefault();const f=new FormData(e.target);try{await api("/api/products",{method:"POST",body:JSON.stringify(Object.fromEntries(f))});e.target.reset();loadAdmin();loadProducts();message("Product added.");}catch(err){message(err.message,true);}};
loadUser().then(updateCartCount).catch(e=>message(e.message,true));
