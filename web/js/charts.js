/**
 * 图表模块
 * 使用 Chart.js 渲染可视化图表
 */

const Charts = (function() {
    let charts = {};

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                cornerRadius: 6
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };

    const colors = {
        blue: '#3498db',
        green: '#2ecc71',
        orange: '#f39c12',
        red: '#e74c3c',
        purple: '#9b59b6',
        teal: '#1abc9c',
        pink: '#e91e63'
    };

    function init() {
        renderTPSChart();
        renderLatencyChart();
        renderSuccessRateChart();
        renderQPSChart();
    }

    function renderTPSChart() {
        const ctx = document.getElementById('tpsChart');
        if (!ctx) return;

        const data = DataLoader.getData();
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="no-data">暂无数据</p>';
            return;
        }

        // 按并发数分组，每组取平均值
        const byConcurrency = {};
        data.forEach(item => {
            const cc = item.concurrency;
            if (!byConcurrency[cc]) {
                byConcurrency[cc] = { totalTps: 0, outputTps: 0, count: 0 };
            }
            byConcurrency[cc].totalTps += item.total_tps;
            byConcurrency[cc].outputTps += item.output_tps;
            byConcurrency[cc].count++;
        });

        const labels = Object.keys(byConcurrency).sort((a, b) => parseInt(a) - parseInt(b));
        const totalTps = labels.map(cc => byConcurrency[cc].totalTps / byConcurrency[cc].count);
        const outputTps = labels.map(cc => byConcurrency[cc].outputTps / byConcurrency[cc].count);

        charts.tps = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(l => l + ' 并发'),
                datasets: [
                    {
                        label: '总 TPS',
                        data: totalTps,
                        borderColor: colors.blue,
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: '输出 TPS',
                        data: outputTps,
                        borderColor: colors.green,
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                ...defaultOptions,
                plugins: {
                    ...defaultOptions.plugins,
                    title: {
                        display: true,
                        text: '吞吐量 vs 并发数'
                    }
                }
            }
        });
    }

    function renderLatencyChart() {
        const ctx = document.getElementById('latencyChart');
        if (!ctx) return;

        const data = DataLoader.getData();
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="no-data">暂无数据</p>';
            return;
        }

        // 取最近 10 条数据
        const recentData = data.slice(-10);
        const labels = recentData.map(item => item.job_id.slice(-6));
        const ftlAvg = recentData.map(item => item.ftl_avg * 1000);
        const ftlP90 = recentData.map(item => item.ftl_p90 * 1000);
        const queryP90 = recentData.map(item => item.query_latency_p90 * 1000);

        charts.latency = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'FTL 平均 (ms)',
                        data: ftlAvg,
                        backgroundColor: colors.blue
                    },
                    {
                        label: 'FTL P90 (ms)',
                        data: ftlP90,
                        backgroundColor: colors.orange
                    },
                    {
                        label: 'P90 延迟 (ms)',
                        data: queryP90,
                        backgroundColor: colors.red
                    }
                ]
            },
            options: {
                ...defaultOptions,
                plugins: {
                    ...defaultOptions.plugins,
                    title: {
                        display: true,
                        text: '延迟分布 (最近10次)'
                    }
                }
            }
        });
    }

    function renderSuccessRateChart() {
        const ctx = document.getElementById('successRateChart');
        if (!ctx) return;

        const data = DataLoader.getData();
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="no-data">暂无数据</p>';
            return;
        }

        // 统计成功率分布
        const buckets = { '≥ 99%': 0, '95-99%': 0, '90-95%': 0, '< 90%': 0 };
        data.forEach(item => {
            const rate = item.success_rate * 100;
            if (rate >= 99) buckets['≥ 99%']++;
            else if (rate >= 95) buckets['95-99%']++;
            else if (rate >= 90) buckets['90-95%']++;
            else buckets['< 90%']++;
        });

        charts.successRate = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(buckets),
                datasets: [{
                    data: Object.values(buckets),
                    backgroundColor: [colors.green, colors.blue, colors.orange, colors.red]
                }]
            },
            options: {
                ...defaultOptions,
                plugins: {
                    ...defaultOptions.plugins,
                    title: {
                        display: true,
                        text: '成功率分布'
                    }
                }
            }
        });
    }

    function renderQPSChart() {
        const ctx = document.getElementById('qpsChart');
        if (!ctx) return;

        const data = DataLoader.getData();
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="no-data">暂无数据</p>';
            return;
        }

        // 按并发数分组
        const byConcurrency = {};
        data.forEach(item => {
            const cc = item.concurrency;
            const stream = item.is_stream;
            const key = `${cc}_${stream}`;
            if (!byConcurrency[key]) {
                byConcurrency[key] = { qps: 0, count: 0 };
            }
            byConcurrency[key].qps += item.qps;
            byConcurrency[key].count++;
        });

        // 分 stream 和 non-stream 绘制
        const streamKeys = Object.keys(byConcurrency).filter(k => k.endsWith('_true')).sort((a, b) => {
            return parseInt(a.split('_')[0]) - parseInt(b.split('_')[0]);
        });
        const nonStreamKeys = Object.keys(byConcurrency).filter(k => k.endsWith('_false')).sort((a, b) => {
            return parseInt(a.split('_')[0]) - parseInt(b.split('_')[0]);
        });

        const allKeys = [...new Set([...streamKeys.map(k => k.split('_')[0]), ...nonStreamKeys.map(k => k.split('_')[0])])].sort((a, b) => parseInt(a) - parseInt(b));

        const streamQps = allKeys.map(cc => {
            const key = `${cc}_true`;
            return byConcurrency[key] ? byConcurrency[key].qps / byConcurrency[key].count : null;
        });
        const nonStreamQps = allKeys.map(cc => {
            const key = `${cc}_false`;
            return byConcurrency[key] ? byConcurrency[key].qps / byConcurrency[key].count : null;
        });

        charts.qps = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allKeys.map(l => l + ' 并发'),
                datasets: [
                    {
                        label: 'QPS (Stream)',
                        data: streamQps,
                        borderColor: colors.blue,
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'QPS (Non-Stream)',
                        data: nonStreamQps,
                        borderColor: colors.purple,
                        backgroundColor: 'rgba(155, 89, 182, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                ...defaultOptions,
                plugins: {
                    ...defaultOptions.plugins,
                    title: {
                        display: true,
                        text: 'QPS vs 并发数'
                    }
                }
            }
        });
    }

    function update() {
        // 销毁旧图表并重新渲染
        Object.values(charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        charts = {};
        init();
    }

    return {
        init,
        update
    };
})();
