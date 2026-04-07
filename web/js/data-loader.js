/**
 * 数据加载模块
 * 负责从 data/results.json 加载数据，并提供数据访问接口
 */

const DataLoader = (function() {
    let rawData = [];
    let lastUpdated = '';

    async function load() {
        try {
            const response = await fetch('data/results.json?t=' + Date.now());
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            const data = await response.json();
            rawData = data.data || [];
            lastUpdated = data.last_updated || '';
            updateLastUpdated();
            return rawData;
        } catch (error) {
            console.error('Failed to load data:', error);
            const tbody = document.querySelector('#results-table tbody');
            tbody.innerHTML = '<tr><td colspan="19" class="no-data">加载失败，请检查数据文件</td></tr>';
            return [];
        }
    }

    function updateLastUpdated() {
        const el = document.getElementById('last-updated');
        if (lastUpdated) {
            const date = new Date(lastUpdated);
            el.textContent = date.toLocaleString('zh-CN');
        } else {
            el.textContent = '暂无数据';
        }
    }

    function getData() {
        return rawData;
    }

    function getLastUpdated() {
        return lastUpdated;
    }

    function getUniqueValues(field) {
        const values = new Set();
        rawData.forEach(item => {
            if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
                values.add(item[field]);
            }
        });
        return Array.from(values).sort((a, b) => {
            if (typeof a === 'number' && typeof b === 'number') {
                return a - b;
            }
            return String(a).localeCompare(String(b));
        });
    }

    return {
        load,
        getData,
        getLastUpdated,
        getUniqueValues
    };
})();
