"""基础接口冒烟测试"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.makedirs("data", exist_ok=True)

from run import app
from models import init_db


def setup_module():
    """确保数据库表存在"""
    init_db()


def test_debug_endpoint():
    with app.test_client() as c:
        resp = c.get("/api/debug")
        assert resp.status_code == 200
        assert "uid" in resp.get_json()


def test_index_responds():
    with app.test_client() as c:
        resp = c.get("/")
        assert resp.status_code != 500
