# AI 自动记账 —— 部署运维技能

## 项目架构

```
jizhang/               ← Flask 服务端（核心业务逻辑）
  run.py               ← 后端路由、认证、公告、Token保护
  models.py            ← SQLite CRUD、users表、bills表、settings表
  ai_parser.py         ← AI 解析（OpenAI/Ollama/自定义）
  crypto_utils.py      ← API Key Fernet 加密
  templates/index.html ← SPA 单页
  static/css/style.css
  static/js/
    app.js             ← Auth 模块、公告弹窗、离线检测
    api.js             ← fetch 封装（X-Auth-Token + X-User-Id）
    pages/addBill.js   ← 快捷记账 + AI 对话
    pages/billList.js  ← 账单列表 CRUD
    pages/stats.js     ← Chart.js 统计图表
    pages/settings.js  ← 设置、管理员、用户管理
  android/             ← Android Studio 工程（WebView 壳）
```

## 什么情况要重编 APK

**不需要**：改 Python 文件、HTML、CSS、JS

**需要**：改 MainActivity.java、服务器 IP、Token 暗号、APP 图标、AndroidManifest.xml

## 更新步骤

### 1. 上传文件到 ECS

全量上传：

```powershell
scp d:\py\jizhang\run.py,d:\py\jizhang\models.py Administrator@你的服务器IP:/Users/Administrator/Desktop/jizhang/
scp d:\py\jizhang\templates\index.html Administrator@你的服务器IP:/Users/Administrator/Desktop/jizhang/templates/
scp d:\py\jizhang\static\sw.js Administrator@你的服务器IP:/Users/Administrator/Desktop/jizhang/static/
scp d:\py\jizhang\static\js\app.js,d:\py\jizhang\static\js\api.js Administrator@你的服务器IP:/Users/Administrator/Desktop/jizhang/static/js/
scp d:\py\jizhang\static\js\pages\settings.js,d:\py\jizhang\static\js\pages\addBill.js,d:\py\jizhang\static\js\pages\billList.js,d:\py\jizhang\static\js\pages\stats.js Administrator@你的服务器IP:/Users/Administrator/Desktop/jizhang/static/js/pages/
```

### 2. 重启 ECS 服务

```powershell
ssh Administrator@你的服务器IP "Stop-Process -Name python -Force; cd C:\Users\Administrator\Desktop\jizhang; Start-Process python -ArgumentList 'run.py' -WindowStyle Hidden"
```

### 3. 如果改过前端文件没生效

修改 `static/sw.js`，将 `CACHE_NAME` 版本号 +1。手机设置→应用→AI自动记账→清除数据。

## 认证体系

| 层级 | 说明 |
|------|------|
| Token 保护 | URL 必须带 `?token=你的TOKEN`，before_request 拦截 |
| 用户注册登录 | 首次打开弹登录面板，可注册/登录，也可跳过试用 |
| 数据隔离 | 登录后用用户名关联；未登录用 X-User-Id 随机 UUID |
| _get_uid() | 先读 X-Auth-Token 查用户表，再回退 X-User-Id |
| 管理员 | 设置页管理员登录（密码见 `JIZHANG_ADMIN_PW` 环境变量），管理 AI 配置、公告、用户 |

## 管理员功能

- AI 接口配置（API 地址、Key、模型、接口类型）
- 公告管理（用户打开 App 弹窗显示）
- 用户管理：添加用户、修改密码、删除用户（同时清除账单）
- 数据导出（CSV / JSON）

## 调试

访问 `http://你的服务器IP:5000/api/debug`，检查：
- `uid`：当前用户标识（应与账单的 user_id 一致）
- `recent_bills`：最近账单及其 user_id
- `session_ok`：Token 认证是否通过

统计不显示账单 → debug 看 uid 与账单 user_id 是否一致。

## 常见 Bug

### 改完代码手机没变化
1. 确认文件已传上 ECS（远程桌面打开 templates/index.html 看版本号）
2. ECS 重启 Flask
3. sw.js CACHE_NAME 版本号 +1
4. 手机清除 App 数据

### Service Worker 缓存旧页面
- STATIC_ASSETS 不要包含 "/"（主页永远从网络加载）
- CACHE_NAME 版本号 +1 强制刷新

### 删除按钮没反应
用事件委托（父容器监听 click），不要 innerHTML 后 addEventListener。

## ECS 环境

- 公网 IP：你的服务器IP
- 系统：Windows，mstsc 远程桌面
- 用户名：Administrator
- 项目路径：`C:\Users\Administrator\Desktop\jizhang\`
- 数据库：`data/bookkeeping.db`
- 安全组开放：5000（Flask）、3389（RDP）
- 本地启动：`cd d:\py\jizhang && python run.py`
- 本地访问：`http://localhost:5000`

## 回答用户问题时的关键信息

- 永远不需要重装 APK（除非换 IP/域名/Token/图标）
- 改代码→传 ECS→重启，三步完成更新
- 用户打开 App 自动最新版，无感知
- Token 保护：别人直接访问 IP 看到空白
- admin 密码在 run.py 的 ADMIN_PASSWORD 变量
- 数据库不要覆盖，账单会丢
