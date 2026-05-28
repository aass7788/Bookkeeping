#!/bin/sh
set -e

# 初始化数据库表结构
python -c "from models import init_db; init_db()"

# 启动生产服务器
exec gunicorn --bind 0.0.0.0:5000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    run:app
