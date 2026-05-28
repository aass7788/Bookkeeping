// addBill.js

const AddBillPage = {
    parsedResult: null,
    currentMode: "quick",

    init() {
        // Mode switching
        document.querySelectorAll(".mode-tab").forEach(tab => {
            tab.addEventListener("click", () => this.switchMode(tab.dataset.mode));
        });

        // Quick mode
        document.getElementById("btn-parse").addEventListener("click", () => this.doParse());
        document.getElementById("btn-manual").addEventListener("click", () => this.showManual());
        document.getElementById("btn-save").addEventListener("click", () => this.doSave());
        document.getElementById("btn-cancel").addEventListener("click", () => this.hidePreview());
        this._populateCategorySelect("preview-category");

        // Chat mode
        document.getElementById("btn-chat-send").addEventListener("click", () => this.doSendChat());
        document.getElementById("chat-input").addEventListener("keydown", e => {
            if (e.key === "Enter") this.doSendChat();
        });
        document.getElementById("btn-chat-clear").addEventListener("click", () => this.clearChat());
    },

    switchMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll(".mode-tab").forEach(t => t.classList.remove("active"));
        document.querySelector(`.mode-tab[data-mode="${mode}"]`).classList.add("active");

        document.getElementById("mode-quick").classList.toggle("hidden", mode !== "quick");
        document.getElementById("mode-chat").classList.toggle("hidden", mode !== "chat");
    },

    // --- Quick Mode ---

    async doParse() {
        const text = document.getElementById("bill-input").value.trim();
        if (!text) { App.showToast("请先输入消费记录", "warning"); return; }

        const btn = document.getElementById("btn-parse");
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>AI 解析中...';

        try {
            const data = await api.parseText(text);
            this.parsedResult = data.parsed;
            this.showPreview(data.parsed);
            App.showToast("解析完成，请确认", "success");
        } catch (e) {
            App.showToast(e.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "AI 智能解析";
        }
    },

    showManual() {
        this.parsedResult = null;
        document.getElementById("preview-amount").value = "";
        document.getElementById("preview-category").value = "餐饮";
        document.getElementById("preview-desc").value = "";
        document.getElementById("preview-date").value = todayStr();
        document.getElementById("preview-income").checked = false;
        document.getElementById("preview-card").classList.remove("hidden");
    },

    showPreview(parsed) {
        document.getElementById("preview-amount").value = parsed.amount;
        document.getElementById("preview-category").value = parsed.category;
        document.getElementById("preview-desc").value = parsed.description || "";
        document.getElementById("preview-date").value = parsed.date || todayStr();
        document.getElementById("preview-income").checked = parsed.is_income === 1;
        document.getElementById("preview-card").classList.remove("hidden");
    },

    hidePreview() {
        document.getElementById("preview-card").classList.add("hidden");
        this.parsedResult = null;
    },

    async doSave() {
        const amount = parseFloat(document.getElementById("preview-amount").value);
        if (!amount || amount <= 0) { App.showToast("请输入有效的金额", "warning"); return; }

        const data = {
            amount: amount,
            category: document.getElementById("preview-category").value,
            description: document.getElementById("preview-desc").value.trim(),
            bill_date: document.getElementById("preview-date").value,
            is_income: document.getElementById("preview-income").checked ? 1 : 0,
            raw_input: document.getElementById("bill-input").value.trim(),
        };

        try {
            await api.createBill(data);
            App.showToast("保存成功", "success");
            document.getElementById("bill-input").value = "";
            this.hidePreview();
        } catch (e) {
            App.showToast("保存失败: " + e.message, "error");
        }
    },

    // --- Chat Mode ---

    async doSendChat() {
        const input = document.getElementById("chat-input");
        const text = input.value.trim();
        if (!text) return;

        // Show user message
        this._addChatBubble("user", text);
        input.value = "";
        input.focus();

        // Show typing indicator
        const typingEl = this._addTypingIndicator();

        try {
            const data = await api.chat(text);
            typingEl.remove();

            if (data.bill) {
                this._addChatBubbleWithBill("ai", data.reply, data.bill);
            } else {
                this._addChatBubble("ai", data.reply);
            }
        } catch (e) {
            typingEl.remove();
            this._addChatBubble("ai", "抱歉，AI 好像卡住了... 请检查网络或API配置 😅");
            App.showToast("AI 请求失败: " + e.message, "error");
        }
    },

    clearChat() {
        const container = document.getElementById("chat-messages");
        container.innerHTML = `
            <div class="chat-msg chat-msg-ai">
                <div class="chat-bubble">嗨！我是你的记账小助手～跟我说说你今天花了什么吧 😄</div>
            </div>
        `;
    },

    _addChatBubble(type, text) {
        const container = document.getElementById("chat-messages");
        const div = document.createElement("div");
        div.className = `chat-msg chat-msg-${type}`;
        div.innerHTML = `<div class="chat-bubble">${this._escape(text)}</div>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    },

    _addTypingIndicator() {
        const container = document.getElementById("chat-messages");
        const div = document.createElement("div");
        div.className = "chat-msg chat-msg-ai";
        div.innerHTML = '<div class="chat-bubble chat-typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    },

    _addChatBubbleWithBill(type, reply, bill) {
        const container = document.getElementById("chat-messages");
        const div = document.createElement("div");
        div.className = `chat-msg chat-msg-${type}`;

        const icon = CATEGORY_ICONS[bill.category] || "📦";
        const amountClass = bill.is_income ? "income" : "expense";
        const sign = bill.is_income ? "+" : "-";

        div.innerHTML = `
            <div class="chat-bubble">
                <div>${this._escape(reply)}</div>
                <div class="chat-bill-card">
                    <div class="bill-row">
                        <span class="label">${icon} ${bill.category}</span>
                        <span class="bill-amount-chat ${amountClass}">${sign}¥${bill.amount.toFixed(2)}</span>
                    </div>
                    <div class="bill-row">
                        <span class="label">${bill.description || ""}</span>
                        <span class="label">${bill.date || ""}</span>
                    </div>
                    <button class="btn-confirm-bill" data-bill='${JSON.stringify(bill).replace(/'/g, "\\'")}'>✓ 确认记账</button>
                </div>
            </div>
        `;

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;

        // Bind confirm button
        div.querySelector(".btn-confirm-bill").addEventListener("click", async (e) => {
            const btn = e.target;
            const billData = JSON.parse(btn.dataset.bill);

            try {
                await api.createBill({
                    amount: billData.amount,
                    category: billData.category,
                    description: billData.description || "",
                    bill_date: billData.date,
                    is_income: billData.is_income || 0,
                    raw_input: billData.raw_input || "",
                });
                btn.textContent = "✓ 已记账";
                btn.disabled = true;
                btn.style.background = "#aaa";
                App.showToast("记账成功！", "success");
            } catch (err) {
                App.showToast("保存失败: " + err.message, "error");
            }
        });

        return div;
    },

    _populateCategorySelect(id) {
        const sel = document.getElementById(id);
        CATEGORIES.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = CATEGORY_ICONS[cat] + " " + cat;
            sel.appendChild(opt);
        });
    },

    _escape(str) {
        const d = document.createElement("div");
        d.textContent = str;
        return d.innerHTML;
    },
};
