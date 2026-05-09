import json
import hmac
import hashlib
from urllib.parse import parse_qs
from datetime import datetime
from typing import List

import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# ================== НАСТРОЙКИ ==================

BOT_TOKEN = "8657535784:AAEGprtGp6x2HTyDtBteYAjRIJItlD5Raxc"
DB_PATH = "miniapp.db"

# ================== БАЗА ДАННЫХ ==================

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sub TEXT,
            price INTEGER NOT NULL,
            old_price INTEGER,
            cost INTEGER,
            category TEXT NOT NULL,
            badge TEXT,
            available INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tg_id INTEGER UNIQUE,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            photo_url TEXT
        );

        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_id INTEGER,
            qty INTEGER
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            total INTEGER,
            date TEXT
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            product_id INTEGER,
            qty INTEGER
        );
        """
    )
    conn.commit()
    conn.close()

def seed_products():
    """Заполняет таблицу товаров если она пустая"""
    conn = db()
    cur = conn.cursor()
    count = cur.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    if count > 0:
        conn.close()
        return

    products = [
        ("Футболка MODO", "Oversize",    1990, 2490, 1200, "tops",       "NEW"),
        ("Худи Soft",     "Утеплённое",  3990, 4990, 2400, "tops",       None),
        ("Джинсы Classic","Прямые",      3490, None, 2000, "bottoms",    None),
        ("Шорты Summer",  "Лёгкие",      1990, None, 1000, "bottoms",    None),
        ("Куртка Wind",   "Весенняя",    5990, None, 3500, "outerwear",  "HIT"),
        ("Сумка Mini",    "Кроссбоди",   2490, None, 1400, "accessories",None),
    ]

    cur.executemany(
        """INSERT INTO products (name, sub, price, old_price, cost, category, badge)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        products
    )
    conn.commit()
    conn.close()
    print(f"Добавлено {len(products)} товаров в БД.")

init_db()
seed_products()

# ================== TELEGRAM AUTH ==================

def check_telegram_auth(init_data: str) -> dict:
    data = parse_qs(init_data, keep_blank_values=True)
    received_hash = data.pop("hash", [None])[0]
    if not received_hash:
        raise HTTPException(status_code=400, detail="No hash in initData")

    data_check_string = "\n".join(
        f"{k}={v[0]}" for k, v in sorted(data.items())
    )

    secret_key = hmac.new(
        key=b"WebAppData",
        msg=BOT_TOKEN.encode(),
        digestmod=hashlib.sha256
    ).digest()

    calculated_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode(),
        digestmod=hashlib.sha256
    ).hexdigest()

    if calculated_hash != received_hash:
        raise HTTPException(status_code=403, detail="Invalid hash")

    user_json = data.get("user", [None])[0]
    if not user_json:
        raise HTTPException(status_code=400, detail="No user in initData")

    return json.loads(user_json)


# ================== FASTAPI ==================

app = FastAPI(title="MODO MiniApp Backend")
app.mount("/pics", StaticFiles(directory="pics"), name="pics")

@app.get("/")
def root():
    return FileResponse("index.html")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== МОДЕЛИ ==================

class AuthRequest(BaseModel):
    initData: str

class FavoritesRequest(BaseModel):
    user_id: int
    favorites: List[int]

class CartItem(BaseModel):
    product_id: int
    qty: int

class CartRequest(BaseModel):
    user_id: int
    cart: List[CartItem]

class OrderRequest(BaseModel):
    user_id: int
    items: List[CartItem]
    total: int

# ================== ЭНДПОИНТЫ ==================

@app.get("/api/products")
def api_products(category: str = None):
    """
    Все товары из БД.
    Фильтр по категории: /api/products?category=tops
    """
    conn = db()
    if category:
        rows = conn.execute(
            "SELECT * FROM products WHERE available = 1 AND category = ?",
            (category,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM products WHERE available = 1"
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/categories")
def api_categories():
    """Уникальные категории товаров"""
    conn = db()
    rows = conn.execute(
        "SELECT DISTINCT category FROM products WHERE available = 1"
    ).fetchall()
    conn.close()
    return [r["category"] for r in rows]


@app.post("/api/auth")
def api_auth(req: AuthRequest):
    tg_user = check_telegram_auth(req.initData)
    conn = db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO users (tg_id, username, first_name, last_name, photo_url)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(tg_id) DO UPDATE SET
            username=excluded.username,
            first_name=excluded.first_name,
            last_name=excluded.last_name,
            photo_url=excluded.photo_url
        """,
        (
            tg_user["id"],
            tg_user.get("username"),
            tg_user.get("first_name"),
            tg_user.get("last_name"),
            tg_user.get("photo_url"),
        ),
    )
    conn.commit()
    cur.execute("SELECT id FROM users WHERE tg_id = ?", (tg_user["id"],))
    row = cur.fetchone()
    conn.close()
    return {"ok": True, "user_id": row["id"], "user": tg_user}


@app.get("/api/data")
def api_data(user_id: int):
    conn = db()
    cur = conn.cursor()

    cur.execute("SELECT product_id FROM favorites WHERE user_id = ?", (user_id,))
    favorites = [r["product_id"] for r in cur.fetchall()]

    cur.execute("SELECT product_id, qty FROM cart WHERE user_id = ?", (user_id,))
    cart = [{"product_id": r["product_id"], "qty": r["qty"]} for r in cur.fetchall()]

    cur.execute(
        "SELECT id, total, date FROM orders WHERE user_id = ? ORDER BY id DESC",
        (user_id,),
    )
    orders_rows = cur.fetchall()
    orders = []
    for o in orders_rows:
        cur.execute(
            "SELECT product_id, qty FROM order_items WHERE order_id = ?", (o["id"],)
        )
        items = [{"product_id": r["product_id"], "qty": r["qty"]} for r in cur.fetchall()]
        orders.append({"id": o["id"], "total": o["total"], "date": o["date"], "items": items})

    conn.close()
    return {"favorites": favorites, "cart": cart, "orders": orders}


@app.post("/api/favorites")
def api_favorites(req: FavoritesRequest):
    conn = db()
    cur = conn.cursor()
    cur.execute("DELETE FROM favorites WHERE user_id = ?", (req.user_id,))
    cur.executemany(
        "INSERT INTO favorites (user_id, product_id) VALUES (?, ?)",
        [(req.user_id, pid) for pid in req.favorites],
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.post("/api/cart")
def api_cart(req: CartRequest):
    conn = db()
    cur = conn.cursor()
    cur.execute("DELETE FROM cart WHERE user_id = ?", (req.user_id,))
    cur.executemany(
        "INSERT INTO cart (user_id, product_id, qty) VALUES (?, ?, ?)",
        [(req.user_id, i.product_id, i.qty) for i in req.cart],
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.post("/api/order")
def api_order(req: OrderRequest):
    conn = db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO orders (user_id, total, date) VALUES (?, ?, ?)",
        (req.user_id, req.total, datetime.now().strftime("%d.%m.%Y %H:%M")),
    )
    order_id = cur.lastrowid
    cur.executemany(
        "INSERT INTO order_items (order_id, product_id, qty) VALUES (?, ?, ?)",
        [(order_id, i.product_id, i.qty) for i in req.items],
    )
    cur.execute("DELETE FROM cart WHERE user_id = ?", (req.user_id,))
    conn.commit()

    cur.execute(
        "SELECT id, total, date FROM orders WHERE user_id = ? ORDER BY id DESC",
        (req.user_id,),
    )
    orders_rows = cur.fetchall()
    orders = []
    for o in orders_rows:
        cur.execute(
            "SELECT product_id, qty FROM order_items WHERE order_id = ?", (o["id"],)
        )
        items = [{"product_id": r["product_id"], "qty": r["qty"]} for r in cur.fetchall()]
        orders.append({"id": o["id"], "total": o["total"], "date": o["date"], "items": items})

    conn.close()
    return {"ok": True, "orders": orders}


# ================== АНАЛИТИКА (СППР) ==================

@app.get("/api/analytics")
def api_analytics():
    conn = db()
    cur = conn.cursor()

    # Общая финансовая сводка
    finance = cur.execute("""
        SELECT
            COUNT(DISTINCT o.id)                            AS order_count,
            SUM(oi.qty * p.price)                           AS revenue,
            SUM(oi.qty * p.cost)                            AS cost,
            SUM(oi.qty * (p.price - p.cost))                AS profit
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
    """).fetchone()

    # Топ товаров по продажам
    top_products = cur.execute("""
        SELECT p.name, p.category, SUM(oi.qty) AS total_sold
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 5
    """).fetchall()

    # Статистика по категориям
    category_stats = cur.execute("""
        SELECT
            p.category,
            SUM(oi.qty)                         AS total_sold,
            SUM(oi.qty * p.price)               AS revenue,
            SUM(oi.qty * (p.price - p.cost))    AS profit
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        GROUP BY p.category
        ORDER BY profit DESC
    """).fetchall()

    conn.close()

    # Простая логика рекомендаций
    top = [dict(r) for r in top_products]
    cats = [dict(r) for r in category_stats]
    recommendations = []

    if top:
        recommendations.append(f"📦 Закупить больше: {', '.join(t['name'] for t in top[:3])}")
    if cats:
        best = cats[0]
        recommendations.append(
            f"💰 Самая прибыльная категория: {best['category']} — рекомендуется продвигать"
        )
    if len(cats) > 1:
        worst = cats[-1]
        recommendations.append(
            f"⚠️ Низкая маржинальность: {worst['category']} — пересмотреть ценообразование"
        )

    return {
        "finance": dict(finance),
        "top_products": top,
        "category_stats": cats,
        "recommendations": recommendations,
    }