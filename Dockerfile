FROM python:3.12-alpine

# 系统依赖（一次性安装 + 清理缓存）
RUN apk add --no-cache tini && \
    addgroup -g 1000 appuser && \
    adduser -u 1000 -G appuser -D -h /app appuser

WORKDIR /app

# 先装依赖（利用 Docker 层缓存，代码改了不会重装）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY run.py models.py ai_parser.py crypto_utils.py ./
COPY static/ ./static/
COPY templates/ ./templates/
COPY entrypoint.sh ./

# 初始化目录 + 设权限
RUN mkdir -p data && \
    chown -R appuser:appuser /app && \
    chmod +x entrypoint.sh

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "from urllib.request import urlopen; urlopen('http://localhost:5000/api/debug')" || exit 1

EXPOSE 5000
ENTRYPOINT ["/sbin/tini", "--", "./entrypoint.sh"]
