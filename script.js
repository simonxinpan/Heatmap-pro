// script.js (最终高性能 Treemap 版)
document.addEventListener('DOMContentLoaded', main);

let heatmapChart = null; // 全局变量，存储图表实例

async function main() {
    await loadAndRenderHeatmap();
    setInterval(() => loadAndRenderHeatmap(false), 300000); // 5分钟刷新
}

async function loadAndRenderHeatmap(isInitialLoad = true) {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const chartContainer = document.getElementById('chart-container');
    
    if (isInitialLoad) loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';

    try {
        const response = await fetch('/api/stocks');
        if (!response.ok) throw new Error(`API responded with status ${response.status}`);
        const stocks = await response.json();
        
        document.getElementById('last-updated').textContent = `最后更新: ${new Date().toLocaleTimeString()}`;
        
        renderTreemap(stocks);
        
        loadingIndicator.style.display = 'none';
        chartContainer.style.display = 'block';

    } catch (error) {
        loadingIndicator.style.display = 'none';
        errorMessage.textContent = `错误: ${error.message}`;
        errorMessage.style.display = 'block';
    }
}

function renderTreemap(stocks) {
    const ctx = document.getElementById('heatmapChart');
    if (!ctx) return;

    if (heatmapChart) {
        heatmapChart.destroy(); // 销毁旧图表实例
    }
    
    if (!stocks || stocks.length === 0) {
        // ... (处理空数据)
        return;
    }

    const data = stocks.map(stock => ({
        v: stock.market_cap || 1, // 用市值决定面积，提供一个默认值
        c: stock.change_percent || 0,
        s: stock.sector_zh,
        data: stock
    }));

    heatmapChart = new Chart(ctx, {
        type: 'treemap',
        data: {
            datasets: [{
                tree: data,
                key: 'v',
                groups: ['s'],
                backgroundColor: (c) => {
                    const value = c.raw?.c || 0;
                    if (value > 0) return `rgba(16, 185, 129, ${0.4 + (Math.min(value, 3) / 3) * 0.6})`;
                    if (value < 0) return `rgba(239, 68, 68, ${0.4 + (Math.abs(Math.max(value, -3)) / 3) * 0.6})`;
                    return '#4B5563';
                },
                borderColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1,
                labels: {
                    display: true,
                    color: 'white',
                    font: { size: 12, weight: 'bold' },
                    formatter: (c) => c.raw?.data?.ticker
                }
            }]
        },
        options: {
            maintainAspectRatio: false, // 允许图表填充容器
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (c) => c[0]?.raw?.data?.name_zh,
                        label: (c) => {
                            const val = c.raw?.c || 0;
                            return `涨跌幅: ${(val > 0 ? '+' : '')}${val.toFixed(2)}%`;
                        }
                    }
                }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const stockData = elements[0].element.$context.raw.data;
                    window.open(`https://stock-details-final.vercel.app/?symbol=${stockData.ticker}`, '_blank');
                }
            }
        }
    });
}