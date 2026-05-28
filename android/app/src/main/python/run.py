from flask import Flask, jsonify, render_template, request, Response
from datetime import date, datetime

import requests
import models
import ai_parser

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024  # 1MB max request body
app.json.ensure_ascii = False


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
        page=page,
        per_page=per_page,
        category=category,
        start_date=start_date,
        end_date=end_date,
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
    result = models.get_stats(start_date=start_date, end_date=end_date)
    return jsonify(result)


# --- Settings ---

@app.route("/api/settings", methods=["GET"])
def api_get_settings():
    settings = models.get_all_settings()
    return jsonify(settings)


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


# --- Export ---

@app.route("/api/export", methods=["GET"])
def api_export():
    fmt = request.args.get("format", "json")
    if fmt == "csv":
        csv_data = models.export_bills_csv_str()
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename=bookkeeping_{date.today().isoformat()}.csv"},
        )
    else:
        json_data = models.export_bills_json_str()
        return Response(
            json_data,
            mimetype="application/json",
            headers={"Content-Disposition": f"attachment; filename=bookkeeping_{date.today().isoformat()}.json"},
        )


# --- Startup ---

def _setup_android_paths():
    """On Android, ensure data directory is writable."""
    import os as _os
    # Try to use app-private directory on Android
    android_base = _os.environ.get("ANDROID_DATA") or _os.getcwd()
    data_dir = _os.path.join(android_base, "bookkeeping_data")
    _os.makedirs(data_dir, exist_ok=True)

    # Override the DB and key paths in models and crypto_utils
    import models
    import crypto_utils
    models.DB_DIR = data_dir
    models.DB_PATH = _os.path.join(data_dir, "bookkeeping.db")
    crypto_utils._KEY_FILE = _os.path.join(data_dir, ".encryption_key")


def start_server():
    """Chaquopy entry point: start Flask in background thread, return immediately."""
    import threading
    import sys
    import traceback

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
    """Development server start."""
    models.init_db()
    print("=" * 40)
    print("  AI 自动记账 已启动")
    print("  浏览器打开: http://localhost:5000")
    print("=" * 40)
    app.run(host="0.0.0.0", port=5000, debug=True)


if __name__ == "__main__":
    run_dev()
