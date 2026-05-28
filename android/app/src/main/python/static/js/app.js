// app.js

const App = {
    currentPage: "addBill",

    init() {
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
        if (online) {
            if (bar) bar.classList.remove("show");
        } else {
            if (bar) bar.classList.add("show");
            this.showToast("当前处于离线状态", "warning");
        }
    },

    _setupOfflineBar() {
        if (!document.getElementById("offline-bar")) {
            const bar = document.createElement("div");
            bar.id = "offline-bar";
            bar.textContent = "离线模式";
            document.getElementById("app").appendChild(bar);
        }
        if (!navigator.onLine) {
            document.getElementById("offline-bar").classList.add("show");
        }
    },
};

document.addEventListener("DOMContentLoaded", () => App.init());
