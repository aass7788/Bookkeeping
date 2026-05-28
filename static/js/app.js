// app.js

function getUserId() {
    let uid = localStorage.getItem("_uid");
    if (!uid) {
        uid = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        localStorage.setItem("_uid", uid);
    }
    return uid;
}

const USER_ID = getUserId();

const Auth = {
    _token: null,
    _username: null,

    init() {
        this._token = localStorage.getItem("_token");
        this._username = localStorage.getItem("_user");
    },

    token() { return this._token || ""; },
    username() { return this._username || ""; },
    isLoggedIn() { return !!this._token; },

    login(token, username) {
        this._token = token;
        this._username = username;
        localStorage.setItem("_token", token);
        localStorage.setItem("_user", username);
    },

    logout() {
        this._token = null;
        this._username = null;
        localStorage.removeItem("_token");
        localStorage.removeItem("_user");
    },
};

Auth.init();

const App = {
    currentPage: "addBill",

    init() {
        if (!Auth.isLoggedIn()) {
            this._showAuth();
        }
        this._startMain();
    },

    _showAuth() {
        document.getElementById("auth-overlay").style.display = "flex";
        document.getElementById("auth-error").style.display = "none";

        const doAuth = async (mode) => {
            const u = document.getElementById("auth-username").value.trim();
            const p = document.getElementById("auth-password").value;
            const errEl = document.getElementById("auth-error");
            if (!u || !p) { errEl.textContent = "请填写用户名和密码"; errEl.style.display = "block"; return; }
            if (!/^[a-zA-Z0-9_一-鿿]+$/.test(u)) { errEl.textContent = "用户名只能包含中文、英文、数字、下划线"; errEl.style.display = "block"; return; }
            if (p.length < 4) { errEl.textContent = "密码至少4位"; errEl.style.display = "block"; return; }

            const btnLogin = document.getElementById("btn-auth-login");
            const btnReg = document.getElementById("btn-auth-register");
            btnLogin.disabled = true; btnReg.disabled = true;

            try {
                const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
                const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
                const data = await res.json();
                if (data.success) {
                    Auth.login(data.token, data.username);
                    document.getElementById("auth-overlay").style.display = "none";
                    App.showToast(mode === "register" ? "注册成功" : "登录成功", "success");
                } else {
                    errEl.textContent = data.error || "操作失败";
                    errEl.style.display = "block";
                }
            } catch (e) {
                errEl.textContent = "网络错误，请稍后再试";
                errEl.style.display = "block";
            } finally {
                btnLogin.disabled = false; btnReg.disabled = false;
            }
        };

        document.getElementById("btn-auth-login").onclick = () => doAuth("login");
        document.getElementById("btn-auth-register").onclick = () => doAuth("register");
        document.getElementById("auth-password").onkeydown = (e) => { if (e.key === "Enter") doAuth("login"); };
        document.getElementById("btn-auth-skip").onclick = () => {
            document.getElementById("auth-overlay").style.display = "none";
        };
    },

    _startMain() {
        document.querySelectorAll(".nav-tab").forEach(tab => {
            tab.addEventListener("click", () => this.switchPage(tab.dataset.page));
        });
        window.addEventListener("online", () => this.setOnlineStatus(true));
        window.addEventListener("offline", () => this.setOnlineStatus(false));

        AddBillPage.init();
        BillListPage.init();
        StatsPage.init();
        SettingsPage.init();
        this.switchPage("addBill");
        this._setupOfflineBar();
        this._checkAnnouncement();
    },

    switchPage(pageName) {
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
        const pageEl = document.getElementById("page-" + pageName);
        if (pageEl) pageEl.classList.add("active");
        const tabEl = document.querySelector(`.nav-tab[data-page="${pageName}"]`);
        if (tabEl) tabEl.classList.add("active");
        this.currentPage = pageName;
        if (pageName === "billList") BillListPage.refresh();
        if (pageName === "stats") StatsPage.refresh();
        if (pageName === "settings") SettingsPage.load();
    },

    showToast(message, type = "info") {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.className = "toast toast-" + type;
        toast.classList.remove("hidden");
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.add("hidden"), 2500);
    },

    setOnlineStatus(online) {
        const bar = document.getElementById("offline-bar");
        if (online) { if (bar) bar.classList.remove("show"); }
        else { if (bar) bar.classList.add("show"); this.showToast("当前处于离线状态", "warning"); }
    },

    _setupOfflineBar() {
        if (!document.getElementById("offline-bar")) {
            const bar = document.createElement("div");
            bar.id = "offline-bar"; bar.textContent = "离线模式";
            document.getElementById("app").appendChild(bar);
        }
        if (!navigator.onLine) document.getElementById("offline-bar").classList.add("show");
    },

    async _checkAnnouncement() {
        try {
            const res = await fetch("/api/announcement");
            const data = await res.json();
            if (data.text && data.text.trim()) {
                document.getElementById("announcement-text").textContent = data.text;
                document.getElementById("announcement-modal").classList.remove("hidden");
                document.getElementById("btn-close-announce").onclick = () => {
                    document.getElementById("announcement-modal").classList.add("hidden");
                };
            }
        } catch (e) {}
    },
};

document.addEventListener("DOMContentLoaded", () => App.init());
