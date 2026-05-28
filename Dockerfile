# ── Stage 1: Build (for future extensibility) ──
FROM python:3.12-slim AS builder

WORKDIR /build
COPY requirements.txt .

# 安装依赖到隔离目录，不缓存
RUN pip install --no-cache-dir --target=/build/deps -r requirements.txt

# ── Stage 2: Runtime ──
FROM python:3.12-slim

# 创建非 root 用户
RUN groupadd -r -g 1000 appuser && \
    useradd -r -u 1000 -g appuser -d /app appuser

WORKDIR /app

# 从 builder 复制依赖（保持层缓存效率）
COPY --from=builder /build/deps /usr/local/lib/python3.12/site-packages

# 只复制运行时需要的文件
COPY run.py models.py ai_parser.py crypto_utils.py ./
COPY static/ ./static/
COPY templates/ ./templates/
COPY entrypoint.sh ./

# 创建数据目录并设置权限
RUN mkdir -p data && \
    chown -R appuser:appuser /app && \
    chmod +x entrypoint.sh

# 切换到非 root 用户
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "from urllib.request import urlopen; urlopen('http://localhost:5000/api/debug')" || exit 1

EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
