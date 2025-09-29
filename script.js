// script.js (V5.4 - Modified for Chinese Name Priority & Intelligent Redirection)

const appContainer = document.getElementById('app-container');
const tooltip = document.getElementById('tooltip');
let fullMarketData = null; // 用于缓存从API获取的完整数据
let dataRefreshInterval = null; // 数据刷新定时器

document.addEventListener('DOMContentLoaded', router);
window.addEventListener('popstate', router);

// 启动数据自动刷新机制（每5分钟）
function startDataRefresh() {
    if (dataRefreshInterval) clearInterval(dataRefreshInterval);
    dataRefreshInterval = setInterval(async () => {
        console.log('🔄 自动刷新股票数据...');
        try {
            const res = await fetch('/api/stocks-simple');
            if (res.ok) {
                const result = await res.json();
                fullMarketData = result.data || result;
                if (result.meta) updateCacheStatus(result.meta);
                const currentPath = window.location.pathname;
                if (currentPath === '/' || currentPath.startsWith('/sector/')) {
                    const sectorName = currentPath.startsWith('/sector/') ? decodeURIComponent(currentPath.split('/sector/')[1]) : null;
                    await renderHomePage(sectorName);
                    console.log('✅ 数据刷新完成');
                }
            }
        } catch (error) {
            console.warn('⚠️ 数据刷新失败:', error.message);
        }
    }, 5 * 60 * 1000);
    console.log('🚀 数据自动刷新已启动（每5分钟）');
}

function stopDataRefresh() {
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
        dataRefreshInterval = null;
        console.log('⏹️ 数据自动刷新已停止');
    }
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(rerenderCurrentView, 250);
});

async function router() {
    showLoading();
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const symbol = params.get('symbol');
    const sector = params.get('sector');

    if (page === 'stock' && symbol) {
        await renderStockDetailPage(symbol);
    } else if (sector) {
        await renderHomePage(decodeURIComponent(sector));
    } else {
        document.title = '股票热力图 - 全景';
        await renderHomePage();
    }
}

function showLoading() {
    appContainer.innerHTML = `<div class="loading-indicator"><div class="spinner"></div><p>数据加载中...</p></div>`;
}

async function renderHomePage(sectorName = null) {
    if (!sectorName) startDataRefresh();
    try {
        let marketData;
        try {
            console.log('🔄 正在获取股票数据...');
            const res = await fetch('/api/stocks-simple');
            if (!res.ok) throw new Error('API不可用');
            const result = await res.json();
            marketData = Array.isArray(result) ? result : (result.data || result);
            if (result.meta) updateCacheStatus(result.meta);
            
            marketData = marketData.map(stock => ({
                ...stock,
                market_cap: parseFloat(stock.market_cap) || 0,
                change_percent: parseFloat(stock.change_percent) || 0
            })).filter(stock => !isNaN(stock.market_cap) && stock.market_cap > 0);

        } catch (apiError) {
            console.log('API不可用，使用模拟数据进行演示');
            marketData = [ /* 您的模拟数据保持不变 */ ];
        }
        fullMarketData = marketData;

        let dataToRender = fullMarketData;
        let headerHtml;

        if (sectorName) {
            dataToRender = fullMarketData.filter(stock => stock.sector_zh === sectorName);
            document.title = `${sectorName} - 行业热力图`;
            headerHtml = `<header class="header"><h1>${sectorName}</h1><a href="/" class="back-link" onclick="navigate(event, '/')">← 返回全景图</a></header>`;
        } else {
            headerHtml = `<header class="header"><div class="header-content"><div class="header-main"><h1>股票热力图</h1><div class="data-source">美股市场 (BETA)</div></div><div class="header-actions"><a href="/cache-admin.html" class="admin-link" title="缓存管理"><span class="admin-icon">⚙️</span><span class="admin-text">缓存管理</span></a></div></div></header>`;
        }
        
        if (!dataToRender || dataToRender.length === 0) {
            appContainer.innerHTML = `<div class="loading-indicator">没有找到数据，后台可能正在更新，请稍后刷新...</div>`;
            return;
        }

        appContainer.innerHTML = `${headerHtml}<div id="cache-status" class="cache-status" style="display: none;"></div><main id="heatmap-container-final" class="heatmap-container-final"></main><footer class="legend"><span>-3%</span><div class="legend-gradient-bar"><div class="gradient-segment loss-5"></div><div class="gradient-segment loss-3"></div><div class="gradient-segment loss-1"></div><div class="gradient-segment flat"></div><div class="gradient-segment gain-1"></div><div class="gradient-segment gain-3"></div><div class="gradient-segment gain-5"></div></div><span>+3%</span></footer>`;
        
        if (sectorName) appContainer.querySelector('.legend').style.display = 'none';

        requestAnimationFrame(() => {
            const container = document.getElementById('heatmap-container-final');
            if (container) generateTreemap(dataToRender, container, !sectorName);
        });
    } catch (error) {
        console.error("Render HomePage Error:", error);
        appContainer.innerHTML = `<div class="loading-indicator">加载失败: ${error.message}</div>`;
    }
}

function generateTreemap(data, container, groupIntoSectors = true) {
    container.innerHTML = '';
    const { clientWidth: totalWidth, clientHeight: totalHeight } = container;
    if (totalWidth === 0 || totalHeight === 0 || !data || data.length === 0) return;

    const fragment = document.createDocumentFragment();
    let itemsToLayout;
    if (groupIntoSectors) {
        const stocksBySector = groupDataBySector(data);
        itemsToLayout = Object.entries(stocksBySector).map(([sectorName, sectorData]) => ({
            name: sectorName, isSector: true, value: sectorData.total_market_cap,
            items: sectorData.stocks.map(s => ({ ...s, value: s.market_cap, isSector: false }))
        }));
    } else {
        itemsToLayout = data.map(s => ({ ...s, value: s.market_cap, isSector: false }));
    }

    function layout(items, x, y, width, height, parentEl) {
        if (items.length === 0 || width <= 1 || height <= 1) return;
        const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0);
        if (totalValue <= 0) return;
        if (items.length === 1) { renderNode(items[0], x, y, width, height, parentEl); return; }
        let bestSplitIndex = 0, minDiff = Infinity, cumulativeValue = 0;
        for (let i = 0; i < items.length - 1; i++) {
            cumulativeValue += items[i].value || 0;
            const diff = Math.abs(cumulativeValue - (totalValue / 2));
            if (diff < minDiff) { minDiff = diff; bestSplitIndex = i; }
        }
        const firstGroup = items.slice(0, bestSplitIndex + 1);
        const secondGroup = items.slice(bestSplitIndex + 1);
        const firstValue = firstGroup.reduce((s, item) => s + (item.value || 0), 0);
        const proportion = totalValue > 0 ? firstValue / totalValue : 0.5;
        if (width > height) {
            const firstWidth = width * proportion;
            layout(firstGroup, x, y, firstWidth, height, parentEl);
            layout(secondGroup, x + firstWidth, y, width - firstWidth, height, parentEl);
        } else {
            const firstHeight = height * proportion;
            layout(firstGroup, x, y, width, firstHeight, parentEl);
            layout(secondGroup, x, y + firstHeight, width, height - firstHeight, parentEl);
        }
    }

    function renderNode(node, x, y, width, height, parentEl) {
        if (node.isSector) {
            const sectorEl = createSectorElement(node, x, y, width, height);
            parentEl.appendChild(sectorEl);
            const titleHeight = sectorEl.querySelector('.treemap-title-link').offsetHeight;
            layout(node.items, 0, 0, width, height - titleHeight, sectorEl.querySelector('.treemap-sector-content'));
        } else {
            if (width < 4 || height < 4) return;
            const stockEl = createStockElement(node, width, height);
            stockEl.style.left = `${x}px`;
            stockEl.style.top = `${y}px`;
            parentEl.appendChild(stockEl);
        }
    }
    
    layout(itemsToLayout, 0, 0, totalWidth, totalHeight, fragment);
    container.appendChild(fragment);
}

function createSectorElement(sector, x, y, width, height) {
    const sectorEl = document.createElement('div');
    sectorEl.className = 'treemap-sector';
    sectorEl.style.cssText = `left:${x}px;top:${y}px;width:${width}px;height:${height}px;`;
    const titleLink = document.createElement('a');
    titleLink.className = 'treemap-title-link';
    titleLink.href = `/?sector=${encodeURIComponent(sector.name)}`;
    titleLink.onclick = (e) => navigate(e, titleLink.href);
    titleLink.innerHTML = `<h2 class="treemap-title">${sector.name}</h2>`;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'treemap-sector-content';
    sectorEl.appendChild(titleLink);
    sectorEl.appendChild(contentDiv);
    return sectorEl;
}

/**
 * ==================================================================
 * === ✨ 唯一的、决定性的修改点 ✨ ===
 * === 下面的 createStockElement 函数已被重写，以实现智能跳转 ===
 * ==================================================================
 */
function createStockElement(stock, width, height) {
    setupTooltipDelegation();
    const stockLink = document.createElement('a');
    
    // --- 这是最关键的智能判断 ---
    const urlParams = new URLSearchParams(window.location.search);
    const isMobileContext = urlParams.get('layout') === 'vertical';

    let baseUrl;
    if (isMobileContext) {
        // 如果是移动端环境，就使用移动版详情页的URL
        baseUrl = 'https://stock-details-final.vercel.app/mobile.html';
    } else {
        // 否则，使用默认的桌面版详情页URL
        baseUrl = 'https://stock-details-final.vercel.app/';
    }
    const finalUrl = `${baseUrl}?symbol=${stock.ticker}`;

    stockLink.href = finalUrl;
    stockLink.target = '_blank'; // 仍然在新窗口打开，但URL是正确的
    stockLink.style.cssText = `width:${width}px;height:${height}px;position:absolute;`;
    stockLink.dataset.stockInfo = JSON.stringify(stock);

    const change = parseFloat(stock.change_percent || 0);
    const area = width * height;
    let detailClass = 'detail-xs';
    if (area > 10000) detailClass = 'detail-xl';
    else if (area > 4000) detailClass = 'detail-lg';
    else if (area > 1500) detailClass = 'detail-md';
    else if (area > 600) detailClass = 'detail-sm';
    
    stockLink.className = `treemap-stock stock ${getColorClass(change)} ${detailClass}`;
    stockLink.innerHTML = `<span class="stock-name-zh">${stock.name_zh}</span><span class="stock-ticker">${stock.ticker}</span><span class="stock-change">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>`;
    
    // 我们不再使用 window.top.location.href，而是直接修改A标签的href
    // 这样可以保留用户在新标签页打开的习惯，同时确保URL正确
    
    return stockLink;
}


// (以下所有函数保持不变)
let tooltipEventDelegated = false;
function setupTooltipDelegation() {
    if (tooltipEventDelegated) return;
    const container = document.getElementById('heatmap-container-final');
    if (!container) return;
    container.addEventListener('mouseover', (e) => {
        const stockLink = e.target.closest('.treemap-stock');
        if (!stockLink || !tooltip) return;
        const stockData = JSON.parse(stockLink.dataset.stockInfo);
        const change = parseFloat(stockData.change_percent || 0);
        const marketCap = stockData.market_cap ? (stockData.market_cap / 1000).toFixed(2) : 'N/A';
        const changeClass = change >= 0 ? 'gain' : 'loss';
        tooltip.innerHTML = `<div class="tooltip-header">${stockData.ticker} - ${stockData.name_zh}</div><div class="tooltip-row"><span class="tooltip-label">涨跌幅</span><span class="tooltip-value ${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span></div><div class="tooltip-row"><span class="tooltip-label">总市值</span><span class="tooltip-value">${marketCap}B</span></div><div class="tooltip-row"><span class="tooltip-label">所属行业</span><span class="tooltip-value">${stockData.sector_zh || 'N/A'}</span></div>`;
        tooltip.style.display = 'block';
    });
    container.addEventListener('mousemove', (e) => {
        if (!e.target.closest('.treemap-stock') || !tooltip) return;
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
    });
    container.addEventListener('mouseout', (e) => {
        if (!e.target.closest('.treemap-stock') || !tooltip) return;
        tooltip.style.display = 'none';
    });
    tooltipEventDelegated = true;
}

function groupDataBySector(data) {
    if (!data) return {};
    return data.reduce((acc, stock) => {
        let sector = (stock.sector_zh && typeof stock.sector_zh === 'string') ? stock.sector_zh.trim() : '';
        if (sector === '') sector = '其他';
        if (!acc[sector]) acc[sector] = { stocks: [], total_market_cap: 0 };
        acc[sector].stocks.push(stock);
        acc[sector].total_market_cap += (stock.market_cap || 0);
        return acc;
    }, {});
}

function getColorClass(change) {
    if (isNaN(change) || Math.abs(change) < 0.01) return 'flat';
    if (change >= 3) return 'gain-5'; if (change >= 2) return 'gain-4'; if (change >= 1) return 'gain-3';
    if (change >= 0.25) return 'gain-2'; if (change > 0) return 'gain-1';
    if (change <= -3) return 'loss-5'; if (change <= -2) return 'loss-4'; if (change <= -1) return 'loss-3';
    if (change <= -0.25) return 'loss-2'; return 'loss-1';
}

function navigate(event, path) {
    event.preventDefault();
    window.history.pushState({}, '', path);
    router();
}

async function renderStockDetailPage(symbol) {
    const externalDetailUrl = `https://stock-details-final.vercel.app/?symbol=${symbol}`;
    window.location.href = externalDetailUrl;
}

function updateCacheStatus(meta) {
    const statusEl = document.getElementById('cache-status');
    if (!statusEl) return;
    const { total, cached, updated, marketStatus, cacheMinutes, processingTime } = meta;
    const cacheHitRate = total > 0 ? ((cached / total) * 100).toFixed(1) : '0';
    statusEl.innerHTML = `<div class="cache-info"><span class="cache-stat">📊 ${total}只股票</span><span class="cache-stat">⚡ ${cacheHitRate}%缓存命中</span><span class="cache-stat">🔄 ${updated}只更新</span><span class="cache-stat">📈 ${marketStatus}</span><span class="cache-stat">⏱️ ${processingTime}ms</span></div>`;
    statusEl.style.display = 'block';
    setTimeout(() => { if (statusEl) statusEl.style.display = 'none'; }, 3000);
}

function rerenderCurrentView() {
    if (!fullMarketData) return;
    const container = document.getElementById('heatmap-container-final');
    if (container) {
        const params = new URLSearchParams(window.location.search);
        const sector = params.get('sector');
        if (sector) {
            const dataToRender = fullMarketData.filter(stock => stock.sector_zh === decodeURIComponent(sector));
            generateTreemap(dataToRender, container, false);
        } else {
            generateTreemap(fullMarketData, container, true);
        }
    }
}