"""基础接口冒烟测试"""
import os
import sys

# 确保项目根目录在 path 中
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 测试模式下不生成 .secret_key 文件
os.makedirs("data", exist_ok=True)

from run import app


def test_debug_endpoint():
    """GET /api/debug 应返回 200"""
    with app.test_client() as c:
        resp = c.get("/api/debug")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "uid" in data


def test_index_responds():
    """首页返回非 500"""
    with app.test_client() as c:
        resp = c.get("/")
        assert resp.status_code != 500
