// stats.js

const StatsPage = {
    currentPeriod: "this_month",
    pieChart: null,
    barChart: null,

    init() {
        document.querySelectorAll(".period-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.currentPeriod = btn.dataset.period;
                this.refresh();
            });
        });
    },

    async refresh() {
        const { start, end } = getPeriodDates(this.currentPeriod);
        try {
            const data = await api.getStats({ start_date: start, end_date: end });
            this._render(data);
        } catch (e) {
            App.showToast("加载统计失败: " + e.message, "error");
        }
    },

    _render(data) {
        document.getElementById("sum-expense").textContent = formatMoney(data.total_expense);
        document.getElementById("sum-income").textContent = formatMoney(data.total_income);
        this._renderPie(data.by_category);
        this._renderBar(data.daily_totals);
    },

    _renderPie(categoryData) {
        const canvas = document.getElementById("pie-chart");
        if (!canvas) return;

        if (this.pieChart) this.pieChart.destroy();

        if (categoryData.length === 0) {
            this.pieChart = null;
            return;
        }

        this.pieChart = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: categoryData.map(c => c.name),
                datasets: [{
                    data: categoryData.map(c => c.value),
                    backgroundColor: CATEGORY_COLORS.slice(0, categoryData.length),
                }],
            },
            options: {
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { boxWidth: 12, padding: 12, font: { size: 11 } },
                    },
                },
            },
        });
    },

    _renderBar(dailyData) {
        const canvas = document.getElementById("bar-chart");
        if (!canvas) return;

        if (this.barChart) this.barChart.destroy();

        if (dailyData.length === 0) {
            this.barChart = null;
            return;
        }

        this.barChart = new Chart(canvas, {
            type: "bar",
            data: {
                labels: dailyData.map(d => d.date.slice(5)),
                datasets: [{
                    label: "支出",
                    data: dailyData.map(d => d.expense || 0),
                    backgroundColor: "#FF6384",
                    borderRadius: 4,
                }],
            },
            options: {
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { font: { size: 10 } } },
                    x: { ticks: { font: { size: 9 }, maxRotation: 45 } },
                },
            },
        });
    },
};
