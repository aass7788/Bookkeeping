// api.js

const API_BASE = "/api";

const api = {
    async _fetch(url, options = {}) {
        try {
            const res = await fetch(url, {
                headers: { "Content-Type": "application/json", "X-Auth-Token": Auth.token(), "X-User-Id": USER_ID, ...options.headers },
                ...options,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            return data;
        } catch (e) {
            if (!navigator.onLine) {
                App.showToast("当前处于离线状态", "warning");
            }
            throw e;
        }
    },

    getBills(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this._fetch(`${API_BASE}/bills?${qs}`);
    },

    createBill(data) {
        return this._fetch(`${API_BASE}/bills`, { method: "POST", body: JSON.stringify(data) });
    },

    updateBill(id, data) {
        return this._fetch(`${API_BASE}/bills/${id}`, { method: "PUT", body: JSON.stringify(data) });
    },

    deleteBill(id) {
        return this._fetch(`${API_BASE}/bills/${id}`, { method: "DELETE" });
    },

    parseText(text) {
        return this._fetch(`${API_BASE}/parse`, { method: "POST", body: JSON.stringify({ text }) });
    },

    chat(text) {
        return this._fetch(`${API_BASE}/chat`, { method: "POST", body: JSON.stringify({ text }) });
    },

    getStats(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this._fetch(`${API_BASE}/stats?${qs}`);
    },

    getSettings() {
        return this._fetch(`${API_BASE}/settings`);
    },

    saveSettings(data) {
        return this._fetch(`${API_BASE}/settings`, { method: "PUT", body: JSON.stringify(data) });
    },

    async testConnection() {
        try {
            const res = await fetch(`${API_BASE}/settings/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.message || "连接失败");
            }
            return data;
        } catch (e) {
            if (!navigator.onLine) App.showToast("当前处于离线状态", "warning");
            throw e;
        }
    },
};
