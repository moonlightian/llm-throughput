/**
 * 表格模块
 * 负责表格渲染、排序、筛选和分页
 */

const Table = (function() {
    let currentPage = 1;
    const pageSize = 50;
    let filteredData = [];
    let sortField = '';
    let sortDirection = 'desc'; // 'asc' or 'desc'

    const columnConfig = {
        job_id: { title: 'Job ID', format: (v) => `<span title="${v}">${v}</span>` },
        timestamp: {
            title: '时间',
            format: (v) => {
                const d = new Date(v);
                return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            }
        },
        gpu_model: { title: '加速卡', format: (v) => `<strong>${v}</strong>` },
        engine: { title: 'Engine', format: (v) => v },
        concurrency: {
            title: '并发',
            format: (v) => `<span class="concurrency-badge">${v}</span>`
        },
        is_stream: {
            title: 'Stream',
            format: (v) => `<span class="stream-badge ${v ? 'stream-yes' : 'stream-no'}">${v ? '是' : '否'}</span>`
        },
        total_tps: {
            title: '总TPS',
            format: (v) => {
                const cls = v > 500 ? 'tps-high' : '';
                return `<span class="${cls}">${v.toFixed(2)}</span>`;
            },
            numeric: true
        },
        output_tps: { title: '输出TPS', format: (v) => v.toFixed(2), numeric: true },
        ftl_avg: { title: 'FTL(avg)', format: (v) => (v * 1000).toFixed(0) + 'ms', numeric: true },
        ftl_p90: { title: 'FTL(P90)', format: (v) => (v * 1000).toFixed(0) + 'ms', numeric: true },
        tpot_avg: { title: 'TPOT', format: (v) => (v * 1000).toFixed(1) + 'ms', numeric: true },
        query_latency_avg: { title: '整句延迟', format: (v) => v.toFixed(2) + 's', numeric: true },
        query_latency_p90: { title: 'P90延迟', format: (v) => v.toFixed(2) + 's', numeric: true },
        num_queries: { title: '请求数', format: (v) => v, numeric: true },
        qps: { title: 'QPS', format: (v) => v.toFixed(2), numeric: true },
        success_rate: {
            title: '成功率',
            format: (v) => {
                const cls = v >= 0.95 ? 'rate-good' : v >= 0.9 ? 'rate-medium' : 'rate-bad';
                return `<span class="${cls}">${(v * 100).toFixed(1)}%</span>`;
            },
            numeric: true
        },
        input_len_avg: { title: '输入长度', format: (v) => v.toFixed(1), numeric: true },
        output_len_avg: { title: '输出长度', format: (v) => v.toFixed(1), numeric: true },
        remark: { title: '备注', format: (v) => `<span class="remark-cell" title="${v}">${v}</span>` }
    };

    function init() {
        populateFilters();
        setupEventListeners();
        applyFilters();
    }

    function populateFilters() {
        const data = DataLoader.getData();
        const gpuFilter = document.getElementById('filter-gpu');
        const engineFilter = document.getElementById('filter-engine');
        const concurrencyFilter = document.getElementById('filter-concurrency');

        const gpus = DataLoader.getUniqueValues('gpu_model');
        const engines = DataLoader.getUniqueValues('engine');
        const concurrencies = DataLoader.getUniqueValues('concurrency');

        populateSelect(gpuFilter, gpus);
        populateSelect(engineFilter, engines);
        populateSelect(concurrencyFilter, concurrencies);
    }

    function populateSelect(select, values) {
        // 清空除第一个选项外的所有选项
        while (select.options.length > 1) {
            select.remove(1);
        }
        values.forEach(v => {
            const option = document.createElement('option');
            option.value = v;
            option.textContent = v;
            select.appendChild(option);
        });
    }

    function setupEventListeners() {
        // 筛选器变化
        const filters = ['filter-gpu', 'filter-engine', 'filter-concurrency', 'filter-stream'];
        filters.forEach(id => {
            document.getElementById(id).addEventListener('change', applyFilters);
        });
        document.getElementById('filter-search').addEventListener('input', debounce(applyFilters, 300));
        document.getElementById('reset-filters').addEventListener('click', resetFilters);

        // 表头排序
        document.querySelectorAll('thead th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-sort');
                handleSort(field, th);
            });
        });

        // 分页
        document.getElementById('prev-page').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                render();
            }
        });
        document.getElementById('next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(filteredData.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                render();
            }
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function applyFilters() {
        const data = DataLoader.getData();

        const gpuFilter = document.getElementById('filter-gpu').value;
        const engineFilter = document.getElementById('filter-engine').value;
        const concurrencyFilter = document.getElementById('filter-concurrency').value;
        const streamFilter = document.getElementById('filter-stream').value;
        const searchFilter = document.getElementById('filter-search').value.toLowerCase();

        filteredData = data.filter(item => {
            if (gpuFilter && item.gpu_model !== gpuFilter) return false;
            if (engineFilter && item.engine !== engineFilter) return false;
            if (concurrencyFilter && item.concurrency !== parseInt(concurrencyFilter)) return false;
            if (streamFilter !== '' && String(item.is_stream) !== streamFilter) return false;
            if (searchFilter) {
                const searchText = `${item.job_id} ${item.remark} ${item.gpu_model} ${item.engine}`.toLowerCase();
                if (!searchText.includes(searchFilter)) return false;
            }
            return true;
        });

        // 应用排序
        if (sortField) {
            sortData(sortField, sortDirection, false);
        }

        currentPage = 1;
        render();
    }

    function handleSort(field, th) {
        // 移除其他表头的排序状态
        document.querySelectorAll('thead th').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'desc'; // 默认降序
        }

        th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        sortData(field, sortDirection, true);
        render();
    }

    function sortData(field, direction, renderFlag) {
        filteredData.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            const config = columnConfig[field];
            if (config && config.numeric) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function resetFilters() {
        document.getElementById('filter-gpu').value = '';
        document.getElementById('filter-engine').value = '';
        document.getElementById('filter-concurrency').value = '';
        document.getElementById('filter-stream').value = '';
        document.getElementById('filter-search').value = '';
        sortField = '';
        sortDirection = 'desc';
        document.querySelectorAll('thead th').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });
        applyFilters();
    }

    function render() {
        const tbody = document.querySelector('#results-table tbody');
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageData = filteredData.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="19" class="no-data">暂无数据</td></tr>';
        } else {
            const headers = document.querySelectorAll('thead th[data-sort]');
            tbody.innerHTML = pageData.map(row => {
                const fields = Array.from(headers).map(th => {
                    const field = th.getAttribute('data-sort');
                    const config = columnConfig[field];
                    const value = row[field];
                    return config ? config.format(value) : value;
                });
                return `<tr>${fields.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
            }).join('');
        }

        updatePagination();
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / pageSize);
        document.getElementById('page-info').textContent = `第 ${currentPage} / ${totalPages || 1} 页`;
        document.getElementById('data-count').textContent = `${filteredData.length} 条记录`;
        document.getElementById('prev-page').disabled = currentPage <= 1;
        document.getElementById('next-page').disabled = currentPage >= totalPages;
    }

    function getFilteredData() {
        return filteredData;
    }

    return {
        init,
        getFilteredData
    };
})();
