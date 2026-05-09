const tg = window.Telegram?.WebApp ?? { expand: () => {}, initData: "", initDataUnsafe: {} };
tg.expand();

const API = "https://botv5-glix.onrender.com/api";
const ALLOWED = ["Koko_9ambo"];

let USER_ID = null;
let USER = null;
let FAVORITES = [];
let CART = [];
let ORDERS = [];
let PRODUCTS = [];

// ───────── TOAST ─────────
function showToast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

// ───────── SEARCH ─────────
function toggleSearch() {
  document.getElementById("searchBar").classList.toggle("open");
}

function filterProducts(text) {
  text = text.toLowerCase();
  document.querySelectorAll(".product-card").forEach(card => {
    card.style.display = card.dataset.name.toLowerCase().includes(text) ? "block" : "none";
  });
}

// ───────── CATEGORIES ─────────
function filterCat(cat, el) {
  document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  document.querySelectorAll(".product-card").forEach(card => {
    card.style.display = (cat === "all" || card.dataset.cat === cat) ? "block" : "none";
  });
}

// ───────── PRODUCTS ─────────
function renderProducts() {
  const list = document.getElementById("products");
  list.innerHTML = "";
  PRODUCTS.forEach(p => {
    const isFav = FAVORITES.includes(p.id);
    const inCart = CART.find(i => i.product_id === p.id);
    list.innerHTML += `
      <div class="product-card" data-name="${p.name}" data-cat="${p.category}">
        <div style="position:relative;">
          <img src="${p.image_path || ''}"
            onerror="this.outerHTML='<div class=\'product-img-placeholder\'>🛍️</div>'"
            style="width:100%; height:140px; object-fit:cover; border-radius:var(--radius);">
          <button class="fav-btn" onclick="toggleFavorite(${p.id})">${isFav ? "❤️" : "🤍"}</button>
          ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ""}
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-sub">${p.sub}</div>
          <div class="product-footer">
            <div>
              <span class="product-price">${p.price} ₽</span>
              ${p.old_price ? `<span class="product-old-price">${p.old_price} ₽</span>` : ""}
            </div>
            <button class="add-btn ${inCart ? "added" : ""}" onclick="addToCart(${p.id})">+</button>
          </div>
        </div>
      </div>`;
  });
}

function openProduct(id) {
  const p = PRODUCTS.find(x => x.id === id);
  const sizes = ["S", "M", "L", "XL"];
  const hasSizes = p.category !== "accessories";

  document.getElementById("productContent").innerHTML = `
    <img src="${p.image_path || ''}" 
      onerror="this.style.display='none'"
      style="width:100%; height:220px; object-fit:cover; border-radius:var(--radius); margin-bottom:16px;">
    <div style="font-size:20px; font-weight:700;">${p.name}</div>
    <div style="font-size:14px; color:#777; margin-top:4px;">${p.sub}</div>
    <div style="font-size:22px; font-weight:700; margin-top:12px;">${p.price} ₽
      ${p.old_price ? `<span style="font-size:15px; color:#999; text-decoration:line-through; margin-left:8px;">${p.old_price} ₽</span>` : ""}
    </div>
    <div style="margin-top:16px; font-size:14px; color:#444; line-height:1.6;">${p.description || ""}</div>
    ${hasSizes ? `
      <div style="margin-top:20px; font-weight:600; margin-bottom:10px;">Размер:</div>
      <div style="display:flex; gap:10px;">
        ${sizes.map(s => `
          <button onclick="selectSize(this, '${s}')" 
            style="width:48px; height:48px; border-radius:10px; border:2px solid #ddd; background:#fff; font-size:15px; font-weight:600; cursor:pointer;">
            ${s}
          </button>`).join("")}
      </div>` : ""}
    <button onclick="addToCartFromDrawer(${id})" 
      style="width:100%; margin-top:24px; padding:14px; background:#111; color:#fff; border:none; border-radius:var(--radius); font-size:16px; font-weight:600; cursor:pointer;">
      🛒 Добавить в корзину
    </button>
  `;

  document.getElementById("productOverlay").classList.add("open");
  document.getElementById("productDrawer").classList.add("open");
}

function closeProduct() {
  document.getElementById("productOverlay").classList.remove("open");
  document.getElementById("productDrawer").classList.remove("open");
}

let selectedSize = null;

function selectSize(btn, size) {
  document.querySelectorAll("#productContent button[onclick^='selectSize']").forEach(b => {
    b.style.background = "#fff";
    b.style.borderColor = "#ddd";
    b.style.color = "#111";
  });
  btn.style.background = "#111";
  btn.style.borderColor = "#111";
  btn.style.color = "#fff";
  selectedSize = size;
}

function addToCartFromDrawer(id) {
  const p = PRODUCTS.find(x => x.id === id);
  const hasSizes = p.category !== "accessories";

  if (hasSizes && !selectedSize) {
    showToast("Выберите размер!");
    return;
  }

  addToCart(id);
  selectedSize = null;
  closeProduct();
  showToast("Добавлено в корзину!");
}
// ───────── FAVORITES ─────────
function toggleFavorite(id) {
  FAVORITES = FAVORITES.includes(id) ? FAVORITES.filter(f => f !== id) : [...FAVORITES, id];
  saveFavorites();
  renderProducts();
  renderFavorites();
}

function renderFavorites() {
  const box = document.getElementById("favItems");
  if (FAVORITES.length === 0 || PRODUCTS.length === 0) {
    box.innerHTML = `<div class="cart-empty">Нет избранных товаров</div>`;
    return;
  }
  box.innerHTML = FAVORITES.map(id => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return "";
    return `<div class="cart-item" onclick="openProduct(${p.id})" style="cursor:pointer;">
      <img src="${p.image_path || ''}" 
        onerror="this.src=''"
        style="width:60px; height:60px; object-fit:cover; border-radius:10px; flex-shrink:0;">
      <div class="cart-item-info">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">${p.price} ₽</div>
      </div>
      <button class="remove-btn" onclick="event.stopPropagation(); toggleFavorite(${id})">✖</button>
    </div>`;
  }).join("");
}

function openFavorites() {
  document.getElementById("favOverlay").classList.add("open");
  document.getElementById("favDrawer").classList.add("open");
}

function closeFavorites() {
  document.getElementById("favOverlay").classList.remove("open");
  document.getElementById("favDrawer").classList.remove("open");
}

// ───────── CART ─────────
function addToCart(id) {
  const item = CART.find(i => i.product_id === id);
  if (item) item.qty++;
  else CART.push({ product_id: id, qty: 1 });
  saveCart();
  renderProducts();
  renderCart();
}

function changeQty(id, delta) {
  const item = CART.find(i => i.product_id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) CART = CART.filter(i => i.product_id !== id);
  saveCart();
  renderCart();
  renderProducts();
}

function renderCart() {
  const box = document.getElementById("cartItems");
  const totalBox = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const countBadge = document.getElementById("cartCount");

  if (CART.length === 0) {
    box.innerHTML = `<div class="cart-empty">Корзина пуста</div>`;
    totalBox.style.display = "none";
    checkoutBtn.style.display = "none";
    countBadge.style.display = "none";
    return;
  }

  let total = 0;
  box.innerHTML = CART.map(i => {
    const p = PRODUCTS.find(x => x.id === i.product_id);
    total += p.price * i.qty;
    return `<div class="cart-item">
    <img src="${p.image_path || ''}"
      onerror="this.src=''"
      onclick="openProduct(${p.id})"  
      style="width:60px; height:60px; object-fit:cover; border-radius:10px; cursor:pointer;">
    <div class="cart-item-info">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">${p.price} ₽</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty(${p.id}, -1)">-</button>
          <span class="qty-num">${i.qty}</span>
          <button class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
        </div>
      </div>
      <button class="remove-btn" onclick="changeQty(${p.id}, -999)">✖</button>
    </div>`;
  }).join("");

  document.getElementById("totalPrice").innerText = total + " ₽";
  totalBox.style.display = "flex";
  checkoutBtn.style.display = "block";
  countBadge.innerText = CART.length;
  countBadge.style.display = "inline-block";
}

function openCart() {
  document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartDrawer").classList.add("open");
}

function closeCart() {
  document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("cartDrawer").classList.remove("open");
}

// ───────── PROFILE ─────────
function openProfile() {
  document.getElementById("profileOverlay").classList.add("open");
  document.getElementById("profileDrawer").classList.add("open");
}

function closeProfile() {
  document.getElementById("profileOverlay").classList.remove("open");
  document.getElementById("profileDrawer").classList.remove("open");
}

function renderProfile() {
  if (!USER) return;

  if (ALLOWED.includes(USER.username)) {
    document.getElementById("adminBtn").style.display = "flex";
  }

  document.getElementById("profileContent").innerHTML = `
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="width:60px; height:60px; background:#eee; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:32px;">👤</div>
      <div>
        <div style="font-size:16px; font-weight:600;">${USER.first_name || ""} ${USER.last_name || ""}</div>
        <div style="font-size:14px; color:#777;">@${USER.username || "нет username"}</div>
      </div>
    </div>`;

  renderOrders();
}

function renderOrders() {
  const box = document.getElementById("ordersList");
  if (ORDERS.length === 0) {
    box.innerHTML = `<div class="cart-empty">Заказов пока нет</div>`;
    return;
  }
  box.innerHTML = ORDERS.map(o => `
    <div style="padding:12px 0; border-bottom:1px solid #eee;">
      <div style="font-weight:600;">Заказ №${o.id}</div>
      <div style="font-size:14px; color:#777;">${o.date}</div>
      <div style="margin-top:6px; font-size:15px;">Итого: ${o.total} ₽</div>
    </div>`).join("");
}

// ───────── ADMIN ─────────
function openAdmin() {
  window.location.href = "https://botv5-glix.onrender.com/admin";
}

// ───────── CHECKOUT ─────────
async function checkout() {
  if (CART.length === 0) return;
  const items = CART.map(i => ({ product_id: i.product_id, qty: i.qty }));
  const total = items.reduce((s, i) => {
    const p = PRODUCTS.find(x => x.id === i.product_id);
    return s + p.price * i.qty;
  }, 0);

  const res = await fetch(API + "/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER_ID, items, total })
  });

  const data = await res.json();
  ORDERS = data.orders;
  CART = [];
  saveCart();
  renderCart();
  renderOrders();
  showToast("Заказ оформлен!");
}

// ───────── SAVE TO SERVER ─────────
async function saveFavorites() {
  await fetch(API + "/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER_ID, favorites: FAVORITES })
  });
}

async function saveCart() {
  await fetch(API + "/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER_ID, cart: CART })
  });
}

// ───────── AUTH ─────────
async function auth() {
  const unsafeUser = tg.initDataUnsafe?.user;
  if (!unsafeUser) return;

  const res = await fetch(API + "/auth_unsafe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: unsafeUser })
  });

  const data = await res.json();
  USER_ID = data.user_id;
  USER = data.user;

  renderProfile();

  const dataRes = await fetch(API + "/data?user_id=" + USER_ID);
  const userData = await dataRes.json();
  FAVORITES = userData.favorites;
  CART = userData.cart;
  ORDERS = userData.orders;

  renderProducts();
  renderFavorites();
  renderCart();
  renderOrders();
}

// ───────── INIT ─────────
async function init() {
  const res = await fetch(API + "/products");
  PRODUCTS = await res.json();
  renderProducts();
  auth().catch(err => console.warn("Auth failed:", err));
}

init();