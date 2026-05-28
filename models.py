import sqlite3
import os
import csv
import json
import io
from datetime import date

from crypto_utils import encrypt, decrypt

DB_DIR = os.path.join(os.path.dirname(__file__), 'data')
DB_PATH = os.path.join(DB_DIR, 'bookkeeping.db')

VALID_CATEGORIES = ["餐饮", "交通", "购物", "娱乐", "住房", "医疗", "教育", "通讯", "日用", "其他"]
MAX_BILLS = 50000

DEFAULT_SETTINGS = {
    "api_url": "https://api.openai.com",
    "api_key": "",
    "model": "gpt-3.5-turbo",
    "api_provider": "openai",
    "api_path": "/v1/chat/completions",
}


def _connect():
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA cache_size=-8000")
    return conn


def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = _connect()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bills (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT    NOT NULL DEFAULT '',
                amount      REAL    NOT NULL,
                category    TEXT    NOT NULL DEFAULT '其他',
                description TEXT    NOT NULL DEFAULT '',
                bill_date   TEXT    NOT NULL,
                is_income   INTEGER NOT NULL DEFAULT 0,
                raw_input   TEXT,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bills_category ON bills(category)")
        cols = [r[1] for r in conn.execute("PRAGMA table_info(bills)").fetchall()]
        if "user_id" not in cols:
            conn.execute("ALTER TABLE bills ADD COLUMN user_id TEXT NOT NULL DEFAULT ''")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id)")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                username     TEXT    NOT NULL UNIQUE,
                password_hash TEXT   NOT NULL,
                token        TEXT    NOT NULL,
                created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        for key, default_value in DEFAULT_SETTINGS.items():
            existing = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
            if not existing:
                conn.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (key, default_value))

        conn.commit()
    finally:
        conn.close()


# --- Bills ---

def get_bills(page=1, per_page=20, category=None, start_date=None, end_date=None, user_id=None):
    per_page = min(per_page, 100)
    conn = _connect()
    try:
        conditions = ["user_id = ?"]
        params = [user_id or ""]
        if category:
            conditions.append("category = ?")
            params.append(category)
        if start_date:
            conditions.append("bill_date >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("bill_date <= ?")
            params.append(end_date)
        where = "WHERE " + " AND ".join(conditions)
        count_sql = f"SELECT COUNT(*) FROM bills {where}"
        total = conn.execute(count_sql, params).fetchone()[0]
        offset = (page - 1) * per_page
        data_sql = f"SELECT * FROM bills {where} ORDER BY bill_date DESC, created_at DESC LIMIT ? OFFSET ?"
        rows = conn.execute(data_sql, params + [per_page, offset]).fetchall()
        return {"bills": [dict(r) for r in rows], "total": total, "page": page, "per_page": per_page}
    finally:
        conn.close()


def get_bill_by_id(bill_id):
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM bills WHERE id = ?", (bill_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_bill(amount, category, description, bill_date, is_income=0, raw_input=None, user_id=""):
    conn = _connect()
    try:
        cur = conn.execute(
            "INSERT INTO bills (user_id, amount, category, description, bill_date, is_income, raw_input) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, amount, category, description, bill_date, is_income, raw_input),
        )
        bill_id = cur.lastrowid
        conn.commit()
        count = conn.execute("SELECT COUNT(*) FROM bills").fetchone()[0]
        if count > MAX_BILLS:
            conn.execute(f"DELETE FROM bills WHERE id NOT IN (SELECT id FROM bills ORDER BY created_at DESC LIMIT {MAX_BILLS})")
            conn.commit()
        row = conn.execute("SELECT * FROM bills WHERE id = ?", (bill_id,)).fetchone()
        return dict(row)
    finally:
        conn.close()


def update_bill(bill_id, **kwargs):
    conn = _connect()
    try:
        allowed = {"amount", "category", "description", "bill_date", "is_income", "raw_input"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return None
        updates["updated_at"] = date.today().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [bill_id]
        conn.execute(f"UPDATE bills SET {set_clause} WHERE id = ?", values)
        conn.commit()
        row = conn.execute("SELECT * FROM bills WHERE id = ?", (bill_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def delete_bill(bill_id):
    conn = _connect()
    try:
        cur = conn.execute("DELETE FROM bills WHERE id = ?", (bill_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# --- Settings ---

def get_setting(key):
    conn = _connect()
    try:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else None
    finally:
        conn.close()


def get_all_settings():
    conn = _connect()
    try:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        result = dict(rows)
        if result.get("api_key"):
            result["has_key"] = True
            result["api_key"] = "••••••••••••••••"
        else:
            result["has_key"] = False
        return result
    finally:
        conn.close()


def save_settings(settings_dict):
    conn = _connect()
    try:
        ALLOWED = set(DEFAULT_SETTINGS.keys()) | {"announcement"}
        for key, value in settings_dict.items():
            if key in ALLOWED:
                store_val = str(value)
                if key == "api_key" and store_val:
                    store_val = encrypt(store_val)
                conn.execute(
                    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
                    (key, store_val, store_val),
                )
        conn.commit()
    finally:
        conn.close()


def get_raw_api_key():
    conn = _connect()
    try:
        row = conn.execute("SELECT value FROM settings WHERE key = 'api_key'").fetchone()
        if row and row["value"]:
            return decrypt(row["value"])
        return ""
    finally:
        conn.close()


# --- Stats ---

def get_stats(start_date=None, end_date=None, user_id=None):
    conn = _connect()
    try:
        conditions = ["user_id = ?"]
        params = [user_id or ""]
        if start_date:
            conditions.append("bill_date >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("bill_date <= ?")
            params.append(end_date)
        where_clause = "WHERE " + " AND ".join(conditions)
        where_and = where_clause + " AND"

        cat_sql = f"SELECT category, SUM(amount) as value FROM bills {where_and} is_income = 0 GROUP BY category ORDER BY value DESC"
        cat_rows = conn.execute(cat_sql, params).fetchall()
        daily_sql = f"SELECT bill_date as date, SUM(CASE WHEN is_income=0 THEN amount ELSE 0 END) as expense, SUM(CASE WHEN is_income=1 THEN amount ELSE 0 END) as income FROM bills {where_clause} GROUP BY bill_date ORDER BY bill_date ASC"
        daily_rows = conn.execute(daily_sql, params).fetchall()
        total_expense = sum(r["value"] for r in cat_rows)
        total_income = conn.execute(
            f"SELECT COALESCE(SUM(amount), 0) FROM bills {where_and} is_income = 1", params
        ).fetchone()[0]
        return {
            "total_expense": round(total_expense, 2),
            "total_income": round(total_income, 2),
            "by_category": [{"name": r["category"], "value": round(r["value"], 2)} for r in cat_rows],
            "daily_totals": [dict(r) for r in daily_rows],
        }
    finally:
        conn.close()


# --- Export ---

def export_bills_csv_str():
    conn = _connect()
    try:
        rows = conn.execute("SELECT * FROM bills ORDER BY bill_date DESC").fetchall()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "amount", "category", "description", "bill_date", "is_income", "raw_input", "created_at", "updated_at"])
        for r in rows:
            writer.writerow([r["id"], r["amount"], r["category"], r["description"], r["bill_date"], r["is_income"], r["raw_input"] or "", r["created_at"], r["updated_at"]])
        return output.getvalue()
    finally:
        conn.close()


def export_bills_json_str():
    conn = _connect()
    try:
        rows = conn.execute("SELECT * FROM bills ORDER BY bill_date DESC").fetchall()
        return json.dumps([dict(r) for r in rows], ensure_ascii=False, indent=2)
    finally:
        conn.close()


# --- Users ---

def create_user(username, password_hash, token):
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO users (username, password_hash, token) VALUES (?, ?, ?)",
            (username, password_hash, token),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def get_user_by_username(username):
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_token(token):
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM users WHERE token = ?", (token,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_all_users():
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT u.id, u.username, u.created_at, COUNT(b.id) as bill_count "
            "FROM users u LEFT JOIN bills b ON u.username = b.user_id "
            "GROUP BY u.id ORDER BY u.created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_user_password(user_id, password_hash):
    conn = _connect()
    try:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
        conn.commit()
        return True
    finally:
        conn.close()


def delete_user(user_id):
    conn = _connect()
    try:
        user = conn.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return False
        conn.execute("DELETE FROM bills WHERE user_id = ?", (user["username"],))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return True
    finally:
        conn.close()
