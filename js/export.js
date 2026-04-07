/**
 * 数据导出模块
 * 支持导出为 CSV 和 JSON 格式
 */

const Export = (function() {
    function init() {
        document.getElementById('export-csv').addEventListener('click', exportCSV);
        document.getElementById('export-json').addEventListener('click', exportJSON);
    }

    function exportCSV() {
        const data = Table.getFilteredData();
        if (data.length === 0) {
            alert('没有数据可导出');
            return;
        }

        // CSV 表头
        const headers = [
            'Job ID', '时间', 'GPU型号', 'Engine', 'Engine版本',
            '并发数', 'Stream', '总TPS', '输出TPS', '输入TPS',
            'TPOT(ms)', 'FTL平均(ms)', 'FTL P90(ms)', '整句延迟平均(s)', '整句延迟P90(s)',
            '请求数', 'QPS', '成功率', '输入长度平均', '输出长度平均', '备注'
        ];

        // CSV 数据行
        const rows = data.map(item => [
            item.job_id,
            item.timestamp,
            item.gpu_model,
            item.engine,
            item.engine_ver || '',
            item.concurrency,
            item.is_stream ? '是' : '否',
            item.total_tps.toFixed(2),
            item.output_tps.toFixed(2),
            item.input_tps ? item.input_tps.toFixed(2) : '',
            (item.tpot_avg * 1000).toFixed(1),
            (item.ftl_avg * 1000).toFixed(0),
            (item.ftl_p90 * 1000).toFixed(0),
            item.query_latency_avg.toFixed(2),
            item.query_latency_p90.toFixed(2),
            item.num_queries,
            item.qps.toFixed(2),
            (item.success_rate * 100).toFixed(1) + '%',
            item.input_len_avg.toFixed(1),
            item.output_len_avg.toFixed(1),
            `"${item.remark}"`
        ]);

        // 组合 CSV 内容
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // 添加 BOM 以支持 Excel 正确识别中文
        const bom = '\uFEFF';
        downloadFile(bom + csvContent, `pressure-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
    }

    function exportJSON() {
        const data = Table.getFilteredData();
        if (data.length === 0) {
            alert('没有数据可导出');
            return;
        }

        const jsonContent = JSON.stringify({
            last_updated: new Date().toISOString(),
            data: data,
            total: data.length
        }, null, 2);

        downloadFile(jsonContent, `pressure-export-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return {
        init
    };
})();
