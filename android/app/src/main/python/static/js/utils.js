// utils.js

const CATEGORIES = ["餐饮", "交通", "购物", "娱乐", "住房", "医疗", "教育", "通讯", "日用", "其他"];

const CATEGORY_ICONS = {
    "餐饮": "🍔", "交通": "🚗", "购物": "🛒", "娱乐": "🎮", "住房": "🏠",
    "医疗": "💊", "教育": "📚", "通讯": "📱", "日用": "🧴", "其他": "📦"
};

const CATEGORY_COLORS = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
    "#FF9F40", "#C9CBCF", "#7BC8A4", "#E8A87C", "#B088F9"
];

function formatMoney(amount) {
    return "¥" + Number(amount).toFixed(2);
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDateFull(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function todayStr() {
    const d = new Date();
    return d.toISOString().split("T")[0];
}

function getPeriodDates(period) {
    const now = new Date();
    let start, end;
    end = now.toISOString().split("T")[0];

    switch (period) {
        case "this_month":
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
            break;
        case "last_month":
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
            end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
            break;
        case "last_3months":
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split("T")[0];
            break;
        case "this_year":
            start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
            break;
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    }
    return { start, end };
}
