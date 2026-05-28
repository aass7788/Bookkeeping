// settings.js

const KEY_MASK = "••••••••••••••••";

const SettingsPage = {
    _hasKey: false,
    _editingUserId: null,

    async load() {
        await this._checkAdmin();
        try {
            const data = await api.getSettings();
            document.getElementById("setting-api-url").value = data.api_url || "";
            document.getElementById("setting-api-path").value = data.api_path || "";
            document.getElementById("setting-model").value = data.model || "";

            this._hasKey = data.has_key;
            document.getElementById("setting-api-key").value = data.has_key ? KEY_MASK : "";
            document.getElementById("key-status").style.display = data.has_key ? "inline" : "none";

            const provider = data.api_provider || "openai";
            const radio = document.querySelector(`input[name="setting-provider"][value="${provider}"]`);
            if (radio) radio.checked = true;
            this._toggleFields();

            const aRes = await fetch("/api/announcement");
            const aData = await aRes.json();
            document.getElementById("setting-announcement").value = aData.text || "";
        } catch (e) {
            console.error("Failed to load settings:", e);
        }
    },

    init() {
        document.getElementById("btn-save-settings").addEventListener("click", () => this.save());
        document.getElementById("btn-test-connection").addEventListener("click", () => this.testConnection());
        document.querySelectorAll('input[name="setting-provider"]').forEach(r => {
            r.addEventListener("change", () => this._toggleFields());
        });
        document.getElementById("btn-export-csv").addEventListener("click", () => this.exportData("csv"));
        document.getElementById("btn-export-json").addEventListener("click", () => this.exportData("json"));
        document.getElementById("btn-save-announcement").addEventListener("click", () => this.saveAnnouncement());

        // Admin
        document.getElementById("btn-admin-login").addEventListener("click", () => this.adminLogin());
        document.getElementById("btn-admin-logout").addEventListener("click", () => this.adminLogout());
        document.getElementById("admin-password").addEventListener("keydown", e => { if (e.key === "Enter") this.adminLogin(); });

        // User management
        document.getElementById("btn-admin-create-user").addEventListener("click", () => this.adminCreateUser());
        document.getElementById("btn-refresh-users").addEventListener("click", () => this.loadUsers());
        document.getElementById("user-list").addEventListener("click", e => this._onUserListClick(e));
        document.getElementById("btn-edit-user-cancel").addEventListener("click", () => this._closeEditUser());
        document.getElementById("btn-edit-user-save").addEventListener("click", () => this._saveEditUser());

        // User logout
        document.getElementById("btn-user-logout").addEventListener("click", () => { Auth.logout(); location.reload(); });

        const keyInput = document.getElementById("setting-api-key");
        keyInput.addEventListener("focus", () => { if (keyInput.value === KEY_MASK) keyInput.value = ""; });
        keyInput.addEventListener("blur", () => { if (keyInput.value === "" && this._hasKey) keyInput.value = KEY_MASK; });
    },

    _toggleFields() {
        const p = document.querySelector('input[name="setting-provider"]:checked').value;
        document.getElementById("group-api-key").style.display = p === "ollama" ? "none" : "";
        document.getElementById("setting-api-url").placeholder = p === "ollama" ? "http://localhost:11434" : p === "custom" ? "https://your-api.com" : "https://api.openai.com";
    },

    async save() {
        const p = document.querySelector('input[name="setting-provider"]:checked').value;
        const data = { api_url: document.getElementById("setting-api-url").value.trim(), api_path: document.getElementById("setting-api-path").value.trim(), model: document.getElementById("setting-model").value.trim(), api_provider: p };
        if (p !== "ollama") { const kv = document.getElementById("setting-api-key").value.trim(); if (kv && kv !== KEY_MASK) data.api_key = kv; }
        try {
            await api.saveSettings(data);
            App.showToast("设置已保存", "success");
            await this.load();
        } catch (e) { App.showToast("保存失败: " + e.message, "error"); }
    },

    async testConnection() {
        await this.save();
        const btn = document.getElementById("btn-test-connection"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>测试中...';
        const r = document.getElementById("test-result"); r.classList.add("hidden");
        try {
            await api.testConnection();
            r.textContent = "连接成功！AI接口可用"; r.className = "test-result success"; r.classList.remove("hidden");
            App.showToast("连接成功", "success");
        } catch (e) {
            r.textContent = "连接失败: " + e.message; r.className = "test-result error"; r.classList.remove("hidden");
            App.showToast("连接失败", "error");
        } finally { btn.disabled = false; btn.textContent = "测试连接"; }
    },

    exportData(f) { window.open(`/api/export?format=${f}`, "_blank"); },

    async saveAnnouncement() {
        try { await api.saveSettings({ announcement: document.getElementById("setting-announcement").value }); App.showToast("公告已保存", "success"); }
        catch (e) { App.showToast("保存失败: " + e.message, "error"); }
    },

    // --- Admin login ---
    async _checkAdmin() {
        try { const d = await (await fetch("/api/admin/check")).json(); this._showAdmin(d.is_admin); }
        catch (e) { this._showAdmin(false); }
    },

    _showAdmin(v) {
        document.getElementById("admin-section").classList.toggle("hidden", !v);
        document.getElementById("admin-login-card").classList.toggle("hidden", v);
        if (v) this.loadUsers();
    },

    async adminLogin() {
        const pwd = document.getElementById("admin-password").value;
        const r = document.getElementById("admin-login-result");
        try {
            const d = await (await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwd }) })).json();
            if (d.success) { this._showAdmin(true); document.getElementById("admin-password").value = ""; r.textContent = ""; await this.load(); }
            else { r.textContent = "密码错误"; r.style.color = "#f44336"; }
        } catch (e) { r.textContent = "登录失败"; r.style.color = "#f44336"; }
    },

    async adminLogout() {
        await fetch("/api/admin/logout", { method: "POST" });
        this._showAdmin(false);
    },

    // --- User management ---
    async loadUsers() {
        const list = document.getElementById("user-list");
        try {
            const d = await (await fetch("/api/admin/users")).json();
            if (!d.users || d.users.length === 0) { list.innerHTML = '<p style="color:var(--text-hint)">暂无用户</p>'; return; }
            list.innerHTML = d.users.map(u => `<div class="user-item">
                <div><div class="user-name">${this._esc(u.username)}</div>
                <div class="user-meta">账单:${u.bill_count} | ${(u.created_at||"").slice(0,10)}</div></div>
                <div style="display:flex;gap:4px">
                    <button class="btn-edit-user" data-id="${u.id}" data-name="${u.username.replace(/"/g,'&quot;')}" style="background:#2196F3;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">改密</button>
                    <button class="btn-delete-user" data-id="${u.id}" data-name="${u.username.replace(/"/g,'&quot;')}" style="background:#f44336;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">删除</button>
                </div></div>`).join("");
        } catch (e) { list.innerHTML = '<p style="color:var(--text-hint)">加载失败</p>'; }
    },

    _onUserListClick(e) {
        const delBtn = e.target.closest(".btn-delete-user");
        const editBtn = e.target.closest(".btn-edit-user");
        if (delBtn) { this._deleteUser(delBtn.dataset.id, delBtn.dataset.name); return; }
        if (editBtn) { this._openEditUser(editBtn.dataset.id, editBtn.dataset.name); }
    },

    async _deleteUser(id, name) {
        if (!confirm(`确定删除用户「${name}」及其所有账单？不可撤销！`)) return;
        try {
            const d = await (await fetch(`/api/admin/users/${id}`, { method: "DELETE" })).json();
            if (d.success) { App.showToast("已删除", "success"); this.loadUsers(); }
            else App.showToast(d.error || "删除失败", "error");
        } catch (e) { App.showToast("网络错误", "error"); }
    },

    async adminCreateUser() {
        const u = document.getElementById("admin-new-username").value.trim();
        const p = document.getElementById("admin-new-password").value;
        if (!u || !p) { App.showToast("请填写用户名和密码", "warning"); return; }
        try {
            const d = await (await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) })).json();
            if (d.success) { App.showToast("用户已创建", "success"); document.getElementById("admin-new-username").value = ""; document.getElementById("admin-new-password").value = ""; this.loadUsers(); }
            else App.showToast(d.error || "创建失败", "error");
        } catch (e) { App.showToast("网络错误", "error"); }
    },

    _openEditUser(id, name) {
        this._editingUserId = id;
        document.getElementById("edit-user-modal").classList.remove("hidden");
        document.getElementById("edit-user-password").value = "";
        document.getElementById("edit-user-password").placeholder = `为「${name}」设置新密码`;
        document.getElementById("edit-user-password").focus();
    },

    _closeEditUser() { this._editingUserId = null; document.getElementById("edit-user-modal").classList.add("hidden"); },

    async _saveEditUser() {
        const p = document.getElementById("edit-user-password").value;
        if (!p || p.length < 4) { App.showToast("新密码至少4位", "warning"); return; }
        try {
            const d = await (await fetch(`/api/admin/users/${this._editingUserId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: p }) })).json();
            if (d.success) { App.showToast("密码已修改", "success"); this._closeEditUser(); }
            else App.showToast(d.error || "修改失败", "error");
        } catch (e) { App.showToast("网络错误", "error"); }
    },

    _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; },
};
