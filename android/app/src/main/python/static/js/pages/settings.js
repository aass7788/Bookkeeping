// settings.js

const KEY_MASK = "••••••••••••••••";

const SettingsPage = {
    _hasKey: false,

    async load() {
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

        // Clear mask when user focuses to type new key
        const keyInput = document.getElementById("setting-api-key");
        keyInput.addEventListener("focus", () => {
            if (keyInput.value === KEY_MASK) {
                keyInput.value = "";
            }
        });
        // If user leaves without typing, restore mask
        keyInput.addEventListener("blur", () => {
            if (keyInput.value === "" && this._hasKey) {
                keyInput.value = KEY_MASK;
            }
        });
    },

    _toggleFields() {
        const provider = document.querySelector('input[name="setting-provider"]:checked').value;
        const keyGroup = document.getElementById("group-api-key");
        const pathGroup = document.getElementById("group-api-path");
        const urlInput = document.getElementById("setting-api-url");

        if (provider === "ollama") {
            keyGroup.style.display = "none";
            pathGroup.style.display = "";
            urlInput.placeholder = "http://localhost:11434";
        } else if (provider === "custom") {
            keyGroup.style.display = "";
            pathGroup.style.display = "";
            urlInput.placeholder = "https://your-api.com";
        } else {
            keyGroup.style.display = "";
            pathGroup.style.display = "";
            urlInput.placeholder = "https://api.openai.com";
        }
    },

    async save() {
        const provider = document.querySelector('input[name="setting-provider"]:checked').value;
        const data = {
            api_url: document.getElementById("setting-api-url").value.trim(),
            api_path: document.getElementById("setting-api-path").value.trim(),
            model: document.getElementById("setting-model").value.trim(),
            api_provider: provider,
        };

        if (provider !== "ollama") {
            const keyVal = document.getElementById("setting-api-key").value.trim();
            if (keyVal && keyVal !== KEY_MASK) {
                data.api_key = keyVal;
            }
        }

        try {
            await api.saveSettings(data);
            App.showToast("设置已保存", "success");
            // Reload to reflect changes
            await this.load();
        } catch (e) {
            App.showToast("保存失败: " + e.message, "error");
        }
    },

    async testConnection() {
        await this.save();

        const btn = document.getElementById("btn-test-connection");
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>测试中...';

        const resultEl = document.getElementById("test-result");
        resultEl.classList.add("hidden");

        try {
            await api.testConnection();
            resultEl.textContent = "连接成功！AI接口可用";
            resultEl.className = "test-result success";
            resultEl.classList.remove("hidden");
            App.showToast("连接成功", "success");
        } catch (e) {
            resultEl.textContent = "连接失败: " + e.message;
            resultEl.className = "test-result error";
            resultEl.classList.remove("hidden");
            App.showToast("连接失败", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "测试连接";
        }
    },

    exportData(format) {
        window.open(`/api/export?format=${format}`, "_blank");
    },
};
