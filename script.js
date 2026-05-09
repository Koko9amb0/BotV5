const tg = window.Telegram?.WebApp ?? { expand: () => {}, initData: "" };
tg.expand();
function dbg(msg) {
  const el = document.getElementById("debug");
  if (el) el.innerHTML += msg + "<br>";
}
dbg("platform: " + tg.platform);
dbg("version: " + tg.version);
dbg("initData length: " + tg.initData?.length);

const API = "https://botv5-glix.onrender.com/api";

let USER_ID = null;
let USER = null;
let FAVORITES = [];
let CART = [];
let ORDERS = [];

// TOAST
function showToast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

// SEARCH
function toggleSearch() {
  document.getElementById("searchBar").classList.toggle("open");
}

function filterProducts(text) {
  text = text.toLowerCase();
  document.querySelectorAll(".product-card").forEach(card => {
    const name = card.dataset.name.toLowerCase();
    card.style.display = name.includes(text) ? "block" : "none";
  });
}

// CATEGORY FILTER
function filterCat(cat, el) {
  document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
  el.classList.add("active");

  document.querySelectorAll(".product-card").forEach(card => {
    if (cat === "all" || card.dataset.cat === cat) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

function scrollToProducts() {
  document.getElementById("productsSection").scrollIntoView({ behavior: "smooth" });
}

// RENDER PRODUCTS
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

          <button class="fav-btn" onclick="toggleFavorite(${p.id})">
            ${isFav ? "❤️" : "🤍"}
          </button>

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

            <button class="add-btn ${inCart ? "added" : ""}" onclick="addToCart(${p.id})">
              +
            </button>
          </div>
        </div>
      </div>
    `;
  });
}

// FAVORITES
function toggleFavorite(id) {
  if (FAVORITES.includes(id)) {
    FAVORITES = FAVORITES.filter(f => f !== id);
  } else {
    FAVORITES.push(id);
  }
  saveFavorites();
  renderProducts();
  renderFavorites();
}

function renderFavorites() {
  const box = document.getElementById("favItems");
  box.innerHTML = "";

  if (FAVORITES.length === 0) {
    box.innerHTML = `<div class="cart-empty">Нет избранных товаров</div>`;
    return;
  }

  FAVORITES.forEach(id => {
    const p = PRODUCTS.find(x => x.id === id);
    box.innerHTML += `
      <div class="cart-item">
        <div class="cart-item-img">🛍️</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${p.price} ₽</div>
        </div>
        <button class="remove-btn" onclick="toggleFavorite(${id})">✖</button>
      </div>
    `;
  });
}

function openFavorites() {
  document.getElementById("favOverlay").classList.add("open");
  document.getElementById("favDrawer").classList.add("open");
}

function closeFavorites() {
  document.getElementById("favOverlay").classList.remove("open");
  document.getElementById("favDrawer").classList.remove("open");
}

// CART
function addToCart(id) {
  const item = CART.find(i => i.product_id === id);
  if (item) {
    item.qty++;
  } else {
    CART.push({ product_id: id, qty: 1 });
  }
  saveCart();
  renderProducts();
  renderCart();
}

function changeQty(id, delta) {
  const item = CART.find(i => i.product_id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    CART = CART.filter(i => i.product_id !== id);
  }

  saveCart();
  renderCart();
  renderProducts();
}

function renderCart() {
  const box = document.getElementById("cartItems");
  const totalBox = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const countBadge = document.getElementById("cartCount");

  box.innerHTML = "";

  if (CART.length === 0) {
    box.innerHTML = `<div class="cart-empty">Корзина пуста</div>`;
    totalBox.style.display = "none";
    checkoutBtn.style.display = "none";
    countBadge.style.display = "none";
    return;
  }

  let total = 0;

  CART.forEach(i => {
    const p = PRODUCTS.find(x => x.id === i.product_id);
    total += p.price * i.qty;

    box.innerHTML += `
      <div class="cart-item">
        <div class="cart-item-img">🛍️</div>
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
      </div>
    `;
  });

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
// PROFILE
function openProfile() {
  document.getElementById("profileOverlay").classList.add("open");
  document.getElementById("profileDrawer").classList.add("open");
}

function closeProfile() {
  document.getElementById("profileOverlay").classList.remove("open");
  document.getElementById("profileDrawer").classList.remove("open");
}

function renderProfile() {
  const ALLOWED = ["Koko_9ambo"];
  
  console.log("USER:", USER); // ← добавь это
  console.log("username:", USER?.username); // ← и это

  if (USER && ALLOWED.includes(USER.username)) {
    document.getElementById("adminBtn").style.display = "flex";
  }
  const box = document.getElementById("profileContent");
  box.innerHTML = `
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="width:60px; height:60px; background:#eee; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:32px;">
        👤
      </div>
      <div>
        <div style="font-size:16px; font-weight:600;">${USER.first_name || ""} ${USER.last_name || ""}</div>
        <div style="font-size:14px; color:#777;">@${USER.username || "нет username"}</div>
      </div>
    </div>
  `;

  renderOrders();
}

function renderOrders() {
  const box = document.getElementById("ordersList");
  box.innerHTML = "";

  if (ORDERS.length === 0) {
    box.innerHTML = `<div class="cart-empty">Заказов пока нет</div>`;
    return;
  }

  ORDERS.forEach(o => {
    box.innerHTML += `
      <div style="padding:12px 0; border-bottom:1px solid #eee;">
        <div style="font-weight:600;">Заказ №${o.id}</div>
        <div style="font-size:14px; color:#777;">${o.date}</div>
        <div style="margin-top:6px; font-size:15px;">Итого: ${o.total} ₽</div>
      </div>
    `;
  });
}

// CHECKOUT
async function checkout() {
  if (CART.length === 0) return;

  const items = CART.map(i => ({
    product_id: i.product_id,
    qty: i.qty
  }));

  const total = items.reduce((s, i) => {
    const p = PRODUCTS.find(x => x.id === i.product_id);
    return s + p.price * i.qty;
  }, 0);

  const res = await fetch(API + "/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: USER_ID,
      items,
      total
    })
  });

  const data = await res.json();
  ORDERS = data.orders;

  CART = [];
  saveCart();
  renderCart();
  renderOrders();

  showToast("Заказ оформлен!");
}

// SAVE TO SERVER
async function saveFavorites() {
  await fetch(API + "/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: USER_ID,
      favorites: FAVORITES
    })
  });
}

async function saveCart() {
  await fetch(API + "/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: USER_ID,
      cart: CART
    })
  });
}

// LOAD USER DATA
async function loadUserData() {
  const res = await fetch(API + "/data?user_id=" + USER_ID);
  const data = await res.json();

  FAVORITES = data.favorites;
  CART = data.cart;
  ORDERS = data.orders;

  renderProducts();
  renderFavorites();
  renderCart();
  renderOrders();
}

// AUTH
async function init() {
  await new Promise(r => setTimeout(r, 500)); // ждём 500мс

  const res = await fetch(API + "/products");
  PRODUCTS = await res.json();
  renderProducts();

  auth().catch(err => console.warn("Auth failed:", err));
}
function dbg(msg) {
  document.getElementById("debug").innerHTML += msg + "<br>";
}

async function auth() {
  // Пробуем initDataUnsafe напрямую
  const unsafeUser = tg.initDataUnsafe?.user;
  dbg("unsafeUser: " + JSON.stringify(unsafeUser));

  if (!unsafeUser) {
    dbg("Нет данных пользователя");
    return;
  }

  // Без верификации — берём данные напрямую
  const res = await fetch(API + "/auth_unsafe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: unsafeUser })
  });

  const data = await res.json();
  dbg("response: " + JSON.stringify(data).slice(0, 100));

  USER_ID = data.user_id;
  USER = data.user;

  renderProfile();
  await loadUserData();
}

let PRODUCTS = [];

async function init() {
  // Загружаем товары из БД
  const res = await fetch(API + "/products");
  PRODUCTS = await res.json();
  renderProducts();

  // Авторизация — если упадёт, товары уже видны
  auth().catch(err => console.warn("Auth failed:", err));
}

init();