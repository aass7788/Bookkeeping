// billList.js

const BillListPage = {
    currentPage: 1,
    perPage: 20,
    filterYearMonth: null,
    editId: null,

    init() {
        document.getElementById("filter-prev-month").addEventListener("click", () => this._shiftMonth(-1));
        document.getElementById("filter-next-month").addEventListener("click", () => this._shiftMonth(1));
        document.getElementById("filter-reset").addEventListener("click", () => this._resetFilter());
        document.getElementById("btn-load-more").addEventListener("click", () => this._loadMore());
        document.getElementById("btn-edit-cancel").addEventListener("click", () => this._closeEdit());
        document.getElementById("btn-edit-save").addEventListener("click", () => this._doEdit());

        this._populateCategorySelects();
    },

    async refresh() {
        this.currentPage = 1;
        const params = { page: 1, per_page: this.perPage };
        if (this.filterYearMonth) {
            params.start_date = this.filterYearMonth + "-01";
            const [y, m] = this.filterYearMonth.split("-");
            const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
            params.end_date = this.filterYearMonth + "-" + String(lastDay).padStart(2, "0");
        }

        try {
            const data = await api.getBills(params);
            this._renderList(data);
        } catch (e) {
            App.showToast("加载失败: " + e.message, "error");
        }
    },

    _renderList(data) {
        const listEl = document.getElementById("bill-list");
        const emptyEl = document.getElementById("bill-list-empty");
        const loadMoreEl = document.getElementById("load-more-wrap");

        if (this.currentPage === 1) {
            listEl.innerHTML = "";
        }

        if (data.bills.length === 0 && this.currentPage === 1) {
            emptyEl.classList.remove("hidden");
            loadMoreEl.classList.add("hidden");
        } else {
            emptyEl.classList.add("hidden");
        }

        data.bills.forEach(bill => {
            const el = this._createItem(bill);
            listEl.appendChild(el);
        });

        if (data.total > this.currentPage * this.perPage) {
            loadMoreEl.classList.remove("hidden");
        } else {
            loadMoreEl.classList.add("hidden");
        }
    },

    _createItem(bill) {
        const div = document.createElement("div");
        div.className = "bill-item";
        div.innerHTML = `
            <div class="bill-category-icon">${CATEGORY_ICONS[bill.category] || "📦"}</div>
            <div class="bill-info">
                <div class="desc">${this._escape(bill.description) || bill.category}</div>
                <div class="meta">${formatDateFull(bill.bill_date)}</div>
            </div>
            <div class="bill-amount ${bill.is_income ? "income" : "expense"}">
                ${bill.is_income ? "+" : "-"}${formatMoney(bill.amount)}
            </div>
            <div class="bill-actions">
                <button data-edit="${bill.id}" title="编辑">✎</button>
                <button data-delete="${bill.id}" title="删除">✕</button>
            </div>
        `;

        div.querySelector('[data-edit]').addEventListener("click", () => this._openEdit(bill));
        div.querySelector('[data-delete]').addEventListener("click", () => this._confirmDelete(bill.id));

        return div;
    },

    async _loadMore() {
        this.currentPage++;
        const params = { page: this.currentPage, per_page: this.perPage };
        if (this.filterYearMonth) {
            params.start_date = this.filterYearMonth + "-01";
            const [y, m] = this.filterYearMonth.split("-");
            const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
            params.end_date = this.filterYearMonth + "-" + String(lastDay).padStart(2, "0");
        }
        try {
            const data = await api.getBills(params);
            this._renderList(data);
        } catch (e) {
            App.showToast("加载失败: " + e.message, "error");
        }
    },

    _shiftMonth(delta) {
        const now = new Date();
        let y = now.getFullYear();
        let m = now.getMonth() + 1;

        if (this.filterYearMonth) {
            [y, m] = this.filterYearMonth.split("-").map(Number);
        }

        m += delta;
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }

        this.filterYearMonth = `${y}-${String(m).padStart(2, "0")}`;
        this._updateFilterLabel();
        this.refresh();
    },

    _resetFilter() {
        this.filterYearMonth = null;
        document.getElementById("filter-month-label").textContent = "全部记录";
        this.refresh();
    },

    _updateFilterLabel() {
        if (this.filterYearMonth) {
            const [y, m] = this.filterYearMonth.split("-");
            document.getElementById("filter-month-label").textContent = `${y}年${parseInt(m)}月`;
        }
    },

    _openEdit(bill) {
        this.editId = bill.id;
        document.getElementById("edit-amount").value = bill.amount;
        document.getElementById("edit-category").value = bill.category;
        document.getElementById("edit-desc").value = bill.description || "";
        document.getElementById("edit-date").value = bill.bill_date;
        document.getElementById("edit-income").checked = bill.is_income === 1;
        document.getElementById("edit-modal").classList.remove("hidden");
    },

    _closeEdit() {
        this.editId = null;
        document.getElementById("edit-modal").classList.add("hidden");
    },

    async _doEdit() {
        const amount = parseFloat(document.getElementById("edit-amount").value);
        if (!amount || amount <= 0) {
            App.showToast("请输入有效的金额", "warning");
            return;
        }
        const data = {
            amount: amount,
            category: document.getElementById("edit-category").value,
            description: document.getElementById("edit-desc").value.trim(),
            bill_date: document.getElementById("edit-date").value,
            is_income: document.getElementById("edit-income").checked ? 1 : 0,
        };
        try {
            await api.updateBill(this.editId, data);
            App.showToast("修改成功", "success");
            this._closeEdit();
            this.refresh();
        } catch (e) {
            App.showToast("修改失败: " + e.message, "error");
        }
    },

    _confirmDelete(id) {
        if (document.getElementById("delete-toast")) return;

        const el = document.createElement("div");
        el.id = "delete-toast";
        el.className = "delete-confirm";
        el.innerHTML = `
            <p>确定要删除这条记录吗？</p>
            <div class="btn-row">
                <button id="delete-cancel-btn" class="btn btn-outline">取消</button>
                <button id="delete-confirm-btn" class="btn btn-danger">删除</button>
            </div>
        `;
        document.getElementById("app").appendChild(el);

        el.querySelector("#delete-cancel-btn").addEventListener("click", () => el.remove());
        el.querySelector("#delete-confirm-btn").addEventListener("click", async () => {
            el.remove();
            try {
                await api.deleteBill(id);
                App.showToast("已删除", "success");
                this.refresh();
            } catch (e) {
                App.showToast("删除失败: " + e.message, "error");
            }
        });
    },

    _populateCategorySelects() {
        ["edit-category"].forEach(id => {
            const sel = document.getElementById(id);
            CATEGORIES.forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat;
                opt.textContent = CATEGORY_ICONS[cat] + " " + cat;
                sel.appendChild(opt);
            });
        });
    },

    _escape(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    },
};
