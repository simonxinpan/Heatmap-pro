// script.js (最终稳定版 - 依赖高性能API)

document.addEventListener('DOMContentLoaded', main);

const appContainer = document.getElementById('app-container');
const tooltip = document.getElementById('tooltip');
let fullMarketDataCache = null; // 用于缓存API数据，避免在SPA导航时重复请求

// --- 主函数 ---
async function main() {
    showLoading();
    try {
        await loadAndRenderHeatmap();
        startDataRefresh(); // 启动自动刷新
    } catch (error) {
        console.error("Initialization failed:", error);
        appContainer.innerHTML = `<div class="error-message">初始化失败: ${error.message}</div>`;
    }
}

// --- 核心数据加载与渲染函数 ---
async function loadAndRenderHeatmap() {
    showLoading();
    try {
        const stocks = await fetchHeatmapData();
        fullMarketDataCache = stocks; // 缓存数据
        renderHeatmap(stocks);
    } catch (error) {
        console.error("Failed to load and render heatmap:", error);
        // 如果API失败，优雅地显示错误信息
        appContainer.innerHTML = `<div class="error-message">数据加载失败，请稍后重试。(${error.message})</div>`;
    }
}

// --- 数据获取函数 ---
async function fetchHeatmapData() {
    console.log("🔄 正在从 /api/stocks 获取数据...");
    const response = await fetch('/api/stocks');
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API responded with status ${response.status}`);
    }
    const data = await response.json();
    console.log(`✅ 成功获取 ${data.length} 条股票数据`);
    return data;
}

// --- 渲染热力图函数 ---
function renderHeatmap(stocks) {
    // 渲染页面骨架
    appContainer.innerHTML = `
        <header class="header"><h1>S&P 500 市场热力图</h1></header>
        <main id="heatmap-container" class="heatmap-container"></main>
        <footer class="legend">
            <span>-3%</span>
            <div class="legend-item"><div class="legend-color-box loss-3"></div></div>
            <div class="legend-item"><div class="legend-color-box loss-1"></div></div>
            <div class="legend-item"><div class="legend-color-box flat"></div></div>
            <div class="legend-item"><div class="legend-color-box gain-1"></div></div>
            <div class="legend-item"><div class="legend-color-box gain-3"></div></div>
            <span>+3%</span>
        </footer>
    `;
    
    const container = document.getElementById('heatmap-container');
    if (!container || !stocks || stocks.length === 0) {
        container.innerHTML = `<div class="error-message">没有可供显示的数据。</div>`;
        return;
    }
    
    // 按板块分组数据
    const stocksBySector = stocks.reduce((acc, stock) => {
        const sector = stock.sector_zh || '未分类';
        if (!acc[sector]) acc[sector] = [];
        acc[sector].push(stock);
        return acc;
    }, {});

    // 遍历板块并创建 DOM 元素
    Object.keys(stocksBySector).sort().forEach(sectorName => {
        const sectorContainer = document.createElement('div');
        sectorContainer.className = 'sector-container';

        const sectorTitle = document.createElement('h2');
        sectorTitle.className = 'sector-title';
        sectorTitle.textContent = sectorName;
        sectorContainer.appendChild(sectorTitle);

        const stocksContainer = document.createElement('div');
        stocksContainer.className = 'stocks-container';

        // 遍历板块内的股票
        stocksBySector[sectorName].forEach(stock => {
            stocksContainer.appendChild(createStockElement(stock));
        });
        
        sectorContainer.appendChild(stocksContainer);
        container.appendChild(sectorContainer);
    });
}

// --- 创建单个股票的 DOM 元素 ---
function createStockElement(stock) {
    const stockLink = document.createElement('a');
    stockLink.className = 'stock-link';
    // ** 核心：直接链接到外部的、功能强大的个股详情页 **
    stockLink.href = `https://stock-details-final.vercel.app/?symbol=${stock.ticker}`;
    stockLink.target = '_blank';
    stockLink.rel = 'noopener noreferrer';
    
    const stockElement = document.createElement('div');
    stockElement.className = 'stock';
    stockElement.style.backgroundColor = getTileColor(stock.change_percent);
    
    const tickerElement = document.createElement('div');
    tickerElement.className = 'ticker';
    tickerElement.textContent = stock.ticker;
    
    const changeElement = document.createElement('div');
    changeElement.className = 'change';
    changeElement.textContent = formatPercent(stock.change_percent);
    
    stockElement.appendChild(tickerElement);
    stockElement.appendChild(changeElement);
    stockLink.appendChild(stockElement);

    // 添加 tooltip 事件
    stockLink.addEventListener('mouseover', (event) => {
        tooltip.innerHTML = `<strong>${stock.name_zh || stock.ticker}</strong><br>${formatPercent(stock.change_percent)}`;
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
    });
    stockLink.addEventListener('mouseout', () => { tooltip.style.display = 'none'; });
    stockLink.addEventListener('mousemove', (event) => {
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
    });

    return stockLink;
}

// --- 自动刷新机制 ---
function startDataRefresh() {
    console.log('🚀 数据自动刷新已启动（每5分钟）');
    setInterval(async () => {
        try {
            console.log('🔄 自动刷新股票数据...');
            fullMarketDataCache = await fetchHeatmapData();
            // 在这里可以添加逻辑，如果用户正在查看页面，则无缝更新
            // 为了简单，我们暂时只更新缓存，用户下次刷新时会看到新数据
            console.log('✅ 数据缓存已更新');
        } catch (e) {
            console.warn('⚠️ 自动刷新失败:', e.message);
        }
    }, 300000); // 5分钟
}

// --- 辅助函数 ---
function showLoading() {
    appContainer.innerHTML = `<div class="loading-indicator">数据加载中...</div>`;
}
function getTileColor(percent) {
    const p = parseFloat(percent);
    if (isNaN(p) || p === 0) return '#4B5563';
    const clampedP = Math.max(-3, Math.min(3, p));
    if (clampedP > 0) return `rgba(16, 185, 129, ${0.4 + (clampedP / 3) * 0.6})`;
    return `rgba(239, 68, 68, ${0.4 + (Math.abs(clampedP) / 3) * 0.6})`;
}
function formatPercent(percent) {
    const p = parseFloat(percent);
    if (isNaN(p)) return '-';
    return `${p > 0 ? '+' : ''}${p.toFixed(2)}%`;
}