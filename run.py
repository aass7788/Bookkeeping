from flask import Flask, jsonify, render_template, request, Response, session
from datetime import date, datetime
import os
import sys
import secrets

import requests
import models
import ai_parser

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024
app.json.ensure_ascii = False

# Persistent secret key for sessions
_KEY_PATH = os.path.join(os.path.dirname(__file__), "data", ".secret_key")
os.makedirs(os.path.dirname(_KEY_PATH), exist_ok=True)
if os.path.exists(_KEY_PATH):
    with open(_KEY_PATH, "rb") as f:
        app.secret_key = f.read()
else:
    key = secrets.token_hex(32).encode()
    with open(_KEY_PATH, "wb") as f:
        f.write(key)
    app.secret_key = key

SECRET_TOKEN = "B8xK9mP2vR6wN3jH5qL7aS4dF1gT6yU9"
ADMIN_PASSWORD = "jz123."


def _get_uid():
    token = request.headers.get("X-Auth-Token", "")
    if token:
        user = models.get_user_by_token(token)
        if user:
            return user["username"]
    return request.headers.get("X-User-Id", "")


@app.before_request
def check_token():
    if request.path.startswith("/static"):
        return None
    if request.path.startswith("/api/auth/"):
        return None
    if request.path == "/api/debug":
        return None
    if session.get("ok"):
        return None
    if request.args.get("token") == SECRET_TOKEN:
        session["ok"] = True
        return None
    if _get_uid():
        return None
    return jsonify({"error": "需要有效的访问令牌"}), 403


@app.route("/api/debug")
def api_debug():
    uid = _get_uid()
    bills = models.get_bills(per_page=3, user_id=uid)["bills"]
    return jsonify({
        "uid": uid or "(empty)",
        "has_uid_header": bool(request.headers.get("X-User-Id")),
        "session_ok": session.get("ok", False),
        "is_admin": session.get("is_admin", False),
        "recent_bills": [{"id": b["id"], "user_id": b["user_id"], "amount": b["amount"], "category": b["category"], "raw_input": b.get("raw_input","")} for b in bills],
    })


@app.route("/")
def index():
    return render_template("index.html")


# --- Bills API ---

@app.route("/api/bills", methods=["GET"])
def api_get_bills():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    category = request.args.get("category")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    result = models.get_bills(
        page=page, per_page=per_page, category=category,
        start_date=start_date, end_date=end_date, user_id=_get_uid(),
    )
    return jsonify(result)


@app.route("/api/bills/<int:bill_id>", methods=["GET"])
def api_get_bill(bill_id):
    bill = models.get_bill_by_id(bill_id)
    if not bill:
        return jsonify({"error": "账单不存在"}), 404
    return jsonify({"bill": bill})


@app.route("/api/bills", methods=["POST"])
def api_create_bill():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求数据为空"}), 400
    amount = data.get("amount")
    if amount is None:
        return jsonify({"error": "请提供金额"}), 400
    try:
        bill = models.create_bill(
            amount=float(amount),
            category=data.get("category", "其他"),
            description=data.get("description", ""),
            bill_date=data.get("bill_date", date.today().isoformat()),
            is_income=data.get("is_income", 0),
            raw_input=data.get("raw_input", ""),
            user_id=_get_uid(),
        )
        return jsonify({"bill": bill}), 201
    except Exception as e:
        return jsonify({"error": f"保存失败: {str(e)}"}), 500


@app.route("/api/bills/<int:bill_id>", methods=["PUT"])
def api_update_bill(bill_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求数据为空"}), 400
    bill = models.update_bill(bill_id, **data)
    if not bill:
        return jsonify({"error": "账单不存在"}), 404
    return jsonify({"bill": bill})


@app.route("/api/bills/<int:bill_id>", methods=["DELETE"])
def api_delete_bill(bill_id):
    deleted = models.delete_bill(bill_id)
    if not deleted:
        return jsonify({"error": "账单不存在"}), 404
    return jsonify({"success": True})


# --- AI Parse ---

@app.route("/api/parse", methods=["POST"])
def api_parse_text():
    data = request.get_json()
    if not data or not data.get("text"):
        return jsonify({"error": "请输入记账文本"}), 400
    try:
        result = ai_parser.parse_bill_text(data["text"].strip())
        return jsonify({"parsed": result})
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "无法连接到AI服务器，请检查API地址"}), 503
    except requests.exceptions.Timeout:
        return jsonify({"error": "AI服务器响应超时，请稍后重试"}), 504
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"解析失败: {str(e)}"}), 500


# --- AI Chat ---

@app.route("/api/chat", methods=["POST"])
def api_chat():
    data = request.get_json()
    if not data or not data.get("text"):
        return jsonify({"error": "请输入内容"}), 400
    try:
        result = ai_parser.parse_chat(data["text"].strip())
        return jsonify(result)
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "无法连接到AI服务器，请检查API地址"}), 503
    except requests.exceptions.Timeout:
        return jsonify({"error": "AI服务器响应超时，请稍后重试"}), 504
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"AI回复失败: {str(e)}"}), 500


# --- Stats ---

@app.route("/api/stats", methods=["GET"])
def api_get_stats():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    result = models.get_stats(start_date=start_date, end_date=end_date, user_id=_get_uid())
    return jsonify(result)


# --- Settings ---

@app.route("/api/settings", methods=["GET"])
def api_get_settings():
    return jsonify(models.get_all_settings())


@app.route("/api/settings", methods=["PUT"])
def api_save_settings():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求数据为空"}), 400
    models.save_settings(data)
    return jsonify({"success": True})


@app.route("/api/settings/test", methods=["POST"])
def api_test_connection():
    try:
        ai_parser.test_connection()
        return jsonify({"success": True, "message": "连接成功！AI接口可用"})
    except requests.exceptions.ConnectionError:
        return jsonify({"success": False, "message": "无法连接到API服务器，请检查地址是否正确"}), 400
    except requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "连接超时，请检查网络或API地址"}), 400
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else "?"
        msg = f"API返回错误 (HTTP {status})"
        if status == 401 or status == 403:
            msg = "认证失败，请检查API Key是否正确"
        elif status == 404:
            msg = "接口地址不存在 (404)，请检查API地址和路径"
        return jsonify({"success": False, "message": msg}), 400
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": f"连接失败: {str(e)}"}), 400


# --- Auth ---

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    import re
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    if len(username) < 2 or len(username) > 20:
        return jsonify({"error": "用户名需2-20个字符"}), 400
    if len(password) < 4 or len(password) > 32:
        return jsonify({"error": "密码需4-32位"}), 400
    if not re.match(r'^[a-zA-Z0-9_一-鿿]+$', username):
        return jsonify({"error": "用户名只能包含中文、英文、数字、下划线"}), 400

    from werkzeug.security import generate_password_hash
    import secrets as _secrets

    pw_hash = generate_password_hash(password)
    token = _secrets.token_urlsafe(32)

    if models.create_user(username, pw_hash, token):
        session["ok"] = True
        return jsonify({"success": True, "token": token, "username": username}), 201
    return jsonify({"error": "用户名已存在"}), 409


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    from werkzeug.security import check_password_hash
    user = models.get_user_by_username(username)
    if user and check_password_hash(user["password_hash"], password):
        session["ok"] = True
        return jsonify({"success": True, "token": user["token"], "username": username})
    return jsonify({"error": "用户名或密码错误"}), 401


# --- Admin ---

@app.route("/api/admin/users", methods=["GET"])
def api_admin_users():
    if not session.get("is_admin"):
        return jsonify({"error": "需要管理员权限"}), 403
    return jsonify({"users": models.get_all_users()})


@app.route("/api/admin/users", methods=["POST"])
def api_admin_create_user():
    if not session.get("is_admin"):
        return jsonify({"error": "需要管理员权限"}), 403
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    if len(password) < 4:
        return jsonify({"error": "密码至少4位"}), 400
    from werkzeug.security import generate_password_hash
    import secrets as _secrets
    pw_hash = generate_password_hash(password)
    token = _secrets.token_urlsafe(32)
    if models.create_user(username, pw_hash, token):
        return jsonify({"success": True}), 201
    return jsonify({"error": "用户名已存在"}), 409


@app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
def api_admin_update_user(user_id):
    if not session.get("is_admin"):
        return jsonify({"error": "需要管理员权限"}), 403
    data = request.get_json()
    password = (data.get("password") or "").strip()
    if not password or len(password) < 4:
        return jsonify({"error": "新密码至少4位"}), 400
    from werkzeug.security import generate_password_hash
    pw_hash = generate_password_hash(password)
    if models.update_user_password(user_id, pw_hash):
        return jsonify({"success": True})
    return jsonify({"error": "用户不存在"}), 404


@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
def api_admin_delete_user(user_id):
    if not session.get("is_admin"):
        return jsonify({"error": "需要管理员权限"}), 403
    if models.delete_user(user_id):
        return jsonify({"success": True})
    return jsonify({"error": "用户不存在"}), 404

@app.route("/api/admin/login", methods=["POST"])
def api_admin_login():
    data = request.get_json()
    if data and data.get("password") == ADMIN_PASSWORD:
        session["is_admin"] = True
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "密码错误"}), 401


@app.route("/api/admin/check", methods=["GET"])
def api_admin_check():
    return jsonify({"is_admin": session.get("is_admin", False)})


@app.route("/api/admin/logout", methods=["POST"])
def api_admin_logout():
    session.pop("is_admin", None)
    return jsonify({"success": True})


# --- Announcement ---

@app.route("/api/announcement", methods=["GET"])
def api_get_announcement():
    text = models.get_setting("announcement")
    return jsonify({"text": text or ""})


# --- Export ---

@app.route("/api/export", methods=["GET"])
def api_export():
    fmt = request.args.get("format", "json")
    if fmt == "csv":
        csv_data = models.export_bills_csv_str()
        return Response(
            csv_data, mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename=bookkeeping_{date.today().isoformat()}.csv"},
        )
    else:
        json_data = models.export_bills_json_str()
        return Response(
            json_data, mimetype="application/json",
            headers={"Content-Disposition": f"attachment; filename=bookkeeping_{date.today().isoformat()}.json"},
        )


# --- Startup ---

def _setup_android_paths():
    import os as _os
    android_base = _os.environ.get("ANDROID_DATA") or _os.getcwd()
    data_dir = _os.path.join(android_base, "bookkeeping_data")
    _os.makedirs(data_dir, exist_ok=True)
    import models
    import crypto_utils
    models.DB_DIR = data_dir
    models.DB_PATH = _os.path.join(data_dir, "bookkeeping.db")
    crypto_utils._KEY_FILE = _os.path.join(data_dir, ".encryption_key")


def start_server():
    import threading, traceback
    try:
        _setup_android_paths()
    except Exception:
        pass
    try:
        models.init_db()
    except Exception:
        pass

    def _run():
        try:
            app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
        except Exception:
            traceback.print_exc(file=sys.stderr)

    t = threading.Thread(target=_run, daemon=True)
    t.start()


def run_dev():
    models.init_db()
    print("=" * 40)
    print("  AI 自动记账 已启动")
    print("  浏览器打开: http://localhost:5000")
    print("=" * 40)
    app.run(host="0.0.0.0", port=5000, debug=True)


if __name__ == "__main__":
    run_dev()
