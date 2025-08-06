// script.js (V5.4 - Modified for Chinese Name Priority)

const appContainer = document.getElementById('app-container');
const tooltip = document.getElementById('tooltip');
let fullMarketData = null; // 用于缓存从API获取的完整数据
let dataRefreshInterval = null; // 数据刷新定时器

document.addEventListener('DOMContentLoaded', router);
window.addEventListener('popstate', router);

// 启动数据自动刷新机制（每5分钟）
function startDataRefresh() {
    // 清除现有定时器
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
    }
    
    // 设置每5分钟刷新一次数据
    dataRefreshInterval = setInterval(async () => {
        console.log('🔄 自动刷新股票数据...');
        try {
            const res = await fetch('/api/stocks');
            if (res.ok) {
                const newData = await res.json();
                fullMarketData = newData;
                
                // 如果当前在主页，重新渲染
                const currentPath = window.location.pathname;
                if (currentPath === '/' || currentPath.startsWith('/sector/')) {
                    const sectorName = currentPath.startsWith('/sector/') ? 
                        decodeURIComponent(currentPath.split('/sector/')[1]) : null;
                    await renderHomePage(sectorName);
                    console.log('✅ 数据刷新完成');
                }
            }
        } catch (error) {
            console.warn('⚠️ 数据刷新失败:', error.message);
        }
    }, 5 * 60 * 1000); // 5分钟 = 5 * 60 * 1000毫秒
    
    console.log('🚀 数据自动刷新已启动（每5分钟）');
}

// 停止数据刷新
function stopDataRefresh() {
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
        dataRefreshInterval = null;
        console.log('⏹️ 数据自动刷新已停止');
    }
}

// 使用防抖技术优化resize事件，避免频繁重绘
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(rerenderCurrentView, 250);
});

// 主路由函数，根据URL参数决定渲染哪个页面
async function router() {
    showLoading();
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const symbol = params.get('symbol');
    const sector = params.get('sector');

    if (page === 'stock' && symbol) {
        await renderStockDetailPage(symbol);
    } else if (sector) {
        // 如果有sector参数，则渲染行业详情页
        await renderHomePage(decodeURIComponent(sector));
    } else {
        // 默认渲染全景热力图
        document.title = '股票热力图 - 全景';
        await renderHomePage();
    }
}

// 显示加载动画
function showLoading() {
    appContainer.innerHTML = `<div class="loading-indicator"><div class="spinner"></div><p>数据加载中...</p></div>`;
}

// 渲染主页（全景或行业详情）
async function renderHomePage(sectorName = null) {
    // 启动数据自动刷新（仅在主页时）
    if (!sectorName) {
        startDataRefresh();
    }
    try {
        // 尝试获取市场数据，如果失败则使用模拟数据
        let marketData;
        try {
            const res = await fetch('/api/stocks');
            if (!res.ok) {
                throw new Error('API不可用');
            }
            marketData = await res.json();
        } catch (apiError) {
            console.log('API不可用，使用模拟数据进行演示');
            // 使用标普500主要股票的模拟数据
            marketData = [
                // 科技股
                { ticker: 'AAPL', name_zh: '苹果公司', sector_zh: '科技', market_cap: 2450000, change_percent: 1.69, logo: 'https://logo.clearbit.com/apple.com' },
                { ticker: 'MSFT', name_zh: '微软', sector_zh: '科技', market_cap: 2200000, change_percent: 0.85, logo: 'https://logo.clearbit.com/microsoft.com' },
                { ticker: 'GOOGL', name_zh: '谷歌', sector_zh: '科技', market_cap: 1500000, change_percent: -0.42, logo: 'https://logo.clearbit.com/google.com' },
                { ticker: 'NVDA', name_zh: '英伟达', sector_zh: '科技', market_cap: 900000, change_percent: 3.45, logo: 'https://logo.clearbit.com/nvidia.com' },
                { ticker: 'META', name_zh: 'Meta平台', sector_zh: '科技', market_cap: 750000, change_percent: 1.87, logo: 'https://logo.clearbit.com/meta.com' },
                { ticker: 'NFLX', name_zh: '奈飞', sector_zh: '科技', market_cap: 180000, change_percent: 2.34, logo: 'https://logo.clearbit.com/netflix.com' },
                { ticker: 'ADBE', name_zh: '奥多比', sector_zh: '科技', market_cap: 220000, change_percent: 1.12, logo: 'https://logo.clearbit.com/adobe.com' },
                { ticker: 'CRM', name_zh: '赛富时', sector_zh: '科技', market_cap: 190000, change_percent: 0.78, logo: 'https://logo.clearbit.com/salesforce.com' },
                
                // 消费股
                { ticker: 'AMZN', name_zh: '亚马逊', sector_zh: '消费', market_cap: 1200000, change_percent: 2.15, logo: 'https://logo.clearbit.com/amazon.com' },
                { ticker: 'TSLA', name_zh: '特斯拉', sector_zh: '消费', market_cap: 800000, change_percent: -1.23, logo: 'https://logo.clearbit.com/tesla.com' },
                { ticker: 'HD', name_zh: '家得宝', sector_zh: '消费', market_cap: 320000, change_percent: 1.45, logo: 'https://logo.clearbit.com/homedepot.com' },
                { ticker: 'MCD', name_zh: '麦当劳', sector_zh: '消费', market_cap: 210000, change_percent: 0.67, logo: 'https://logo.clearbit.com/mcdonalds.com' },
                { ticker: 'NKE', name_zh: '耐克', sector_zh: '消费', market_cap: 160000, change_percent: -0.89, logo: 'https://logo.clearbit.com/nike.com' },
                { ticker: 'SBUX', name_zh: '星巴克', sector_zh: '消费', market_cap: 110000, change_percent: 1.23, logo: 'https://logo.clearbit.com/starbucks.com' },
                
                // 金融股
                { ticker: 'BRK.B', name_zh: '伯克希尔', sector_zh: '金融', market_cap: 700000, change_percent: 0.45, logo: 'https://logo.clearbit.com/berkshirehathaway.com' },
                { ticker: 'JPM', name_zh: '摩根大通', sector_zh: '金融', market_cap: 450000, change_percent: 1.34, logo: 'https://logo.clearbit.com/jpmorganchase.com' },
                { ticker: 'BAC', name_zh: '美国银行', sector_zh: '金融', market_cap: 280000, change_percent: 0.89, logo: 'https://logo.clearbit.com/bankofamerica.com' },
                { ticker: 'WFC', name_zh: '富国银行', sector_zh: '金融', market_cap: 180000, change_percent: 1.12, logo: 'https://logo.clearbit.com/wellsfargo.com' },
                { ticker: 'GS', name_zh: '高盛', sector_zh: '金融', market_cap: 120000, change_percent: 0.56, logo: 'https://logo.clearbit.com/goldmansachs.com' },
                
                // 医疗股
                { ticker: 'UNH', name_zh: '联合健康', sector_zh: '医疗', market_cap: 450000, change_percent: 1.23, logo: 'https://logo.clearbit.com/unitedhealthgroup.com' },
                { ticker: 'JNJ', name_zh: '强生', sector_zh: '医疗', market_cap: 420000, change_percent: 0.67, logo: 'https://logo.clearbit.com/jnj.com' },
                { ticker: 'PFE', name_zh: '辉瑞', sector_zh: '医疗', market_cap: 180000, change_percent: -0.45, logo: 'https://logo.clearbit.com/pfizer.com' },
                { ticker: 'ABBV', name_zh: '艾伯维', sector_zh: '医疗', market_cap: 280000, change_percent: 1.78, logo: 'https://logo.clearbit.com/abbvie.com' },
                { ticker: 'TMO', name_zh: '赛默飞', sector_zh: '医疗', market_cap: 200000, change_percent: 0.89, logo: 'https://logo.clearbit.com/thermofisher.com' },
                
                // 工业股
                { ticker: 'BA', name_zh: '波音', sector_zh: '工业', market_cap: 130000, change_percent: -2.34, logo: 'https://logo.clearbit.com/boeing.com' },
                { ticker: 'CAT', name_zh: '卡特彼勒', sector_zh: '工业', market_cap: 140000, change_percent: 1.45, logo: 'https://logo.clearbit.com/caterpillar.com' },
                { ticker: 'GE', name_zh: '通用电气', sector_zh: '工业', market_cap: 120000, change_percent: 2.12, logo: 'https://logo.clearbit.com/ge.com' },
                { ticker: 'MMM', name_zh: '3M公司', sector_zh: '工业', market_cap: 90000, change_percent: 0.34, logo: 'https://logo.clearbit.com/3m.com' },
                
                // 能源股
                { ticker: 'XOM', name_zh: '埃克森美孚', sector_zh: '能源', market_cap: 420000, change_percent: 2.67, logo: 'https://logo.clearbit.com/exxonmobil.com' },
                { ticker: 'CVX', name_zh: '雪佛龙', sector_zh: '能源', market_cap: 280000, change_percent: 1.89, logo: 'https://logo.clearbit.com/chevron.com' },
                { ticker: 'COP', name_zh: '康菲石油', sector_zh: '能源', market_cap: 140000, change_percent: 3.12, logo: 'https://logo.clearbit.com/conocophillips.com' },
                
                // 通信股
                { ticker: 'VZ', name_zh: '威瑞森', sector_zh: '通信', market_cap: 170000, change_percent: 0.45, logo: 'https://logo.clearbit.com/verizon.com' },
                { ticker: 'T', name_zh: 'AT&T', sector_zh: '通信', market_cap: 130000, change_percent: -0.23, logo: 'https://logo.clearbit.com/att.com' },
                { ticker: 'CMCSA', name_zh: '康卡斯特', sector_zh: '通信', market_cap: 160000, change_percent: 1.12, logo: 'https://logo.clearbit.com/comcast.com' },
                
                // 公用事业
                { ticker: 'NEE', name_zh: '新纪元能源', sector_zh: '公用事业', market_cap: 150000, change_percent: 0.78, logo: 'https://logo.clearbit.com/nexteraenergy.com' },
                { ticker: 'DUK', name_zh: '杜克能源', sector_zh: '公用事业', market_cap: 80000, change_percent: 0.34, logo: 'https://logo.clearbit.com/duke-energy.com' },
                
                // 房地产
                { ticker: 'AMT', name_zh: '美国电塔', sector_zh: '房地产', market_cap: 90000, change_percent: 1.23, logo: 'https://logo.clearbit.com/americantower.com' },
                { ticker: 'PLD', name_zh: '普洛斯', sector_zh: '房地产', market_cap: 110000, change_percent: 0.89, logo: 'https://logo.clearbit.com/prologis.com' }
            ];
        }
        fullMarketData = marketData; // 更新全局数据缓存

        let dataToRender = fullMarketData;
        let headerHtml;

        if (sectorName) {
            // 过滤出特定行业的数据
            dataToRender = fullMarketData.filter(stock => stock.sector_zh === sectorName);
            document.title = `${sectorName} - 行业热力图`;
            headerHtml = `<header class="header"><h1>${sectorName}</h1><a href="/" class="back-link" onclick="navigate(event, '/')">← 返回全景图</a></header>`;
        } else {
            // 全景图的标题
            headerHtml = `<header class="header"><h1>股票热力图</h1><div class="data-source">美股市场 (BETA)</div></header>`;
        }
        
        if (!dataToRender || dataToRender.length === 0) {
            appContainer.innerHTML = `<div class="loading-indicator">没有找到数据，后台可能正在更新，请稍后刷新...</div>`;
            return;
        }

        // 渲染页面骨架
        appContainer.innerHTML = `
            ${headerHtml}
            <main id="heatmap-container-final" class="heatmap-container-final"></main>
            <footer class="legend">
                <span>-3%</span>
                <div class="legend-item"><div class="legend-color-box loss-5"></div></div>
                <div class="legend-item"><div class="legend-color-box loss-3"></div></div>
                <div class="legend-item"><div class="legend-color-box loss-1"></div></div>
                <div class="legend-item"><div class="legend-color-box flat"></div></div>
                <div class="legend-item"><div class="legend-color-box gain-1"></div></div>
                <div class="legend-item"><div class="legend-color-box gain-3"></div></div>
                <div class="legend-item"><div class="legend-color-box gain-5"></div></div>
                <span>+3%</span>
            </footer>
        `;
        
        // 行业视图下不显示图例
        if (sectorName) {
            appContainer.querySelector('.legend').style.display = 'none';
        }

        // 使用 requestAnimationFrame 确保在DOM渲染后执行treemap计算
        requestAnimationFrame(() => {
            const container = document.getElementById('heatmap-container-final');
            if (container) {
                generateTreemap(dataToRender, container, !sectorName);
            }
        });
    } catch (error) {
        console.error("Render HomePage Error:", error);
        appContainer.innerHTML = `<div class="loading-indicator">加载失败: ${error.message}</div>`;
    }
}

// 生成Treemap布局的核心函数
function generateTreemap(data, container, groupIntoSectors = true) {
    container.innerHTML = '';
    const { clientWidth: totalWidth, clientHeight: totalHeight } = container;
    if (totalWidth === 0 || totalHeight === 0 || !data || data.length === 0) return;

    let itemsToLayout;
    if (groupIntoSectors) {
        const stocksBySector = groupDataBySector(data);
        // 【优化】: itemsToLayout不再需要排序，因为后端返回的数据已经是按市值排序的
        itemsToLayout = Object.entries(stocksBySector).map(([sectorName, sectorData]) => ({
            name: sectorName, 
            isSector: true, 
            value: sectorData.total_market_cap,
            // 【优化】: sectorData.stocks也不再需要排序
            items: sectorData.stocks.map(s => ({ ...s, value: s.market_cap, isSector: false }))
        }));
    } else {
        // 【优化】: data本身也不再需要排序
        itemsToLayout = data.map(s => ({ ...s, value: s.market_cap, isSector: false }));
    }

    // 递归布局函数
    function layout(items, x, y, width, height, parentEl) {
        if (items.length === 0 || width <= 1 || height <= 1) return;
        
        const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0);
        if (totalValue <= 0) return;

        if (items.length === 1) {
            renderNode(items[0], x, y, width, height, parentEl);
            return;
        }

        let bestSplitIndex = 0;
        let minDiff = Infinity;
        const targetValue = totalValue / 2;
        let cumulativeValue = 0;

        for (let i = 0; i < items.length - 1; i++) {
            cumulativeValue += items[i].value || 0;
            const diff = Math.abs(cumulativeValue - targetValue);
            if (diff < minDiff) {
                minDiff = diff;
                bestSplitIndex = i;
            }
        }

        const firstGroup = items.slice(0, bestSplitIndex + 1);
        const secondGroup = items.slice(bestSplitIndex + 1);
        const firstValue = firstGroup.reduce((s, item) => s + (item.value || 0), 0);
        
        const proportion = totalValue > 0 ? firstValue / totalValue : 0.5;
        const isHorizontal = width > height;

        if (isHorizontal) {
            const firstWidth = width * proportion;
            layout(firstGroup, x, y, firstWidth, height, parentEl);
            layout(secondGroup, x + firstWidth, y, width - firstWidth, height, parentEl);
        } else {
            const firstHeight = height * proportion;
            layout(firstGroup, x, y, width, firstHeight, parentEl);
            layout(secondGroup, x, y + firstHeight, width, height - firstHeight, parentEl);
        }
    }

    // 渲染单个节点（行业或股票）
    function renderNode(node, x, y, width, height, parentEl) {
        if (node.isSector) {
            const sectorEl = createSectorElement(node, x, y, width, height);
            parentEl.appendChild(sectorEl);
            const titleEl = sectorEl.querySelector('.treemap-title-link');
            const titleHeight = titleEl ? titleEl.offsetHeight : 31;
            const contentContainer = sectorEl.querySelector('.treemap-sector-content');
            layout(node.items, 0, 0, width, height - titleHeight, contentContainer);
        } else {
            const stockEl = createStockElement(node, width, height);
            stockEl.style.left = `${x}px`;
            stockEl.style.top = `${y}px`;
            parentEl.appendChild(stockEl);
        }
    }
    
    // 开始布局
    layout(itemsToLayout, 0, 0, totalWidth, totalHeight, container);
}

// 创建行业板块的DOM元素
function createSectorElement(sector, x, y, width, height) {
    const sectorEl = document.createElement('div');
    sectorEl.className = 'treemap-sector';
    sectorEl.style.left = `${x}px`; sectorEl.style.top = `${y}px`;
    sectorEl.style.width = `${width}px`; sectorEl.style.height = `${height}px`;
    
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

// 创建单个股票的DOM元素
function createStockElement(stock, width, height) {
    const stockLink = document.createElement('a');
    stockLink.className = 'treemap-stock';
    // 直接跳转到外部详情页，传递股票代码参数
    stockLink.href = `https://stock-details-final-lckt58yeg-simon-pans-projects.vercel.app/?symbol=${stock.ticker}`;
    stockLink.target = '_blank'; // 在新标签页打开
    // 移除内部路由导航，直接使用外部链接
    stockLink.style.width = `${width}px`; stockLink.style.height = `${height}px`;

    const stockDiv = document.createElement('div');
    const change = parseFloat(stock.change_percent || 0);
    stockDiv.className = `stock ${getColorClass(change)}`;
    
    const area = width * height;
    if (area > 10000) stockDiv.classList.add('detail-xl');
    else if (area > 4000) stockDiv.classList.add('detail-lg');
    else if (area > 1500) stockDiv.classList.add('detail-md');
    else if (area > 600) stockDiv.classList.add('detail-sm');
    else stockDiv.classList.add('detail-xs');
    
    // ==================【关键改动】==================
    // 将中文名（stock-name-zh）放在最前面
    stockDiv.innerHTML = `<span class="stock-name-zh">${stock.name_zh}</span><span class="stock-ticker">${stock.ticker}</span><span class="stock-change">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>`;
    // ==============================================
    
    stockLink.appendChild(stockDiv);
    
    stockLink.addEventListener('mouseover', (e) => {
        if (!tooltip) return;
        const marketCap = stock.market_cap ? (stock.market_cap / 1000).toFixed(2) : 'N/A';
        const changeClass = change >= 0 ? 'gain' : 'loss';
        tooltip.innerHTML = `<div class="tooltip-header">${stock.ticker} - ${stock.name_zh}</div><div class="tooltip-row"><span class="tooltip-label">涨跌幅</span><span class="tooltip-value ${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span></div><div class="tooltip-row"><span class="tooltip-label">总市值</span><span class="tooltip-value">${marketCap}B</span></div><div class="tooltip-row"><span class="tooltip-label">所属行业</span><span class="tooltip-value">${stock.sector_zh || 'N/A'}</span></div>`;
        tooltip.style.display = 'block';
    });

    stockLink.addEventListener('mousemove', (e) => {
        if (!tooltip) return;
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
    });

    stockLink.addEventListener('mouseout', () => {
        if (!tooltip) return;
        tooltip.style.display = 'none';
    });

    return stockLink;
}

// 按行业分组数据
function groupDataBySector(data) {
    if (!data) return {};
    return data.reduce((acc, stock) => {
        const sector = stock.sector_zh || '其他';
        if (!acc[sector]) { acc[sector] = { stocks: [], total_market_cap: 0 }; }
        acc[sector].stocks.push(stock);
        acc[sector].total_market_cap += (stock.market_cap || 0);
        return acc;
    }, {});
}

// 根据涨跌幅获取颜色类
function getColorClass(change) {
    if (isNaN(change) || Math.abs(change) < 0.01) return 'flat';
    if (change >= 3) return 'gain-5'; if (change >= 2) return 'gain-4'; if (change >= 1) return 'gain-3';
    if (change >= 0.25) return 'gain-2'; if (change > 0) return 'gain-1';
    if (change <= -3) return 'loss-5'; if (change <= -2) return 'loss-4'; if (change <= -1) return 'loss-3';
    if (change <= -0.25) return 'loss-2'; return 'loss-1';
}

// SPA导航函数
function navigate(event, path) {
    event.preventDefault();
    window.history.pushState({}, '', path);
    router();
}

// 渲染股票详情页
async function renderStockDetailPage(symbol) {
    try {
        appContainer.innerHTML = `<div class="loading-indicator"><div class="spinner"></div><p>正在加载 ${symbol} 的详细数据...</p></div>`;
        
        // 所有股票都跳转到外部增强版详情页，传递股票代码参数
        const externalDetailUrl = `https://stock-details-final-bwjamhrli-simon-pans-projects.vercel.app/?symbol=${symbol}`;
        window.location.href = externalDetailUrl;
        return;
        
        const res = await fetch(`/api/stocks?ticker=${symbol}`);
        if (!res.ok) throw new Error('获取股票详情失败');
        const { profile, quote } = await res.json();
        
        const nameZh = profile.name_zh || ''; 
        const sectorZh = profile.sector_zh || profile.finnhubIndustry || 'N/A';
        const description = profile.description || '暂无公司简介。';
        const change = quote.dp || 0; 
        const changeAmount = quote.d || 0; 
        const changeClass = change >= 0 ? 'gain' : 'loss';
        const marketCapBillion = profile.marketCapitalization ? (profile.marketCapitalization / 1000).toFixed(2) : 'N/A';
        const shareBillion = profile.shareOutstanding ? (profile.shareOutstanding / 1000).toFixed(2) : 'N/A';
        const high = quote.h || 0; 
        const low = quote.l || 0; 
        const currentPrice = quote.c || 0; 
        const openPrice = quote.o || 0;

        document.title = `${nameZh} (${profile.ticker}) - 股票详情`;
        
        appContainer.innerHTML = `
            <header class="header">
                <h1>${nameZh} ${profile.name} (${profile.ticker})</h1>
                <a href="javascript:history.back()" class="back-link" onclick="navigate(event, document.referrer || '/')">← 返回上一页</a>
                <div class="upgrade-notice">
                    <p>💡 想要查看更详细的股票分析？ <a href="./details/stock-detail.html?symbol=${symbol}" class="upgrade-link">点击查看增强版详情页</a></p>
                </div>
            </header>
            <div class="stock-detail-page">
                <main class="main-content">
                    <div class="card">
                        <div class="stock-header">
                            <div class="stock-identity">
                                <img src="${profile.logo}" alt="${profile.name} Logo" class="stock-logo" onerror="this.style.display='none'">
                                <div class="stock-name">
                                    <h1>${profile.name}</h1>
                                    <p>${profile.exchange}: ${profile.ticker}</p>
                                </div>
                            </div>
                            <div class="stock-price-info">
                                <div class="current-price">${currentPrice.toFixed(2)} <span class="price-change ${changeClass}">${change >= 0 ? '+' : ''}${changeAmount.toFixed(2)} (${change.toFixed(2)}%)</span></div>
                                <div class="market-status">数据来源: Finnhub</div>
                            </div>
                        </div>
                    </div>
                    <section class="chart-section">
                        <div class="chart-placeholder">
                            <p>📈 K线图功能正在开发中...</p>
                            <p><a href="./details/stock-detail.html?symbol=${symbol}" class="chart-upgrade-link">查看增强版图表分析</a></p>
                        </div>
                    </section>
                </main>
                <aside class="right-sidebar">
                    <div class="card">
                        <h2 class="card-title">关于 ${nameZh}</h2>
                        <p class="company-info-text">${description}</p>
                        <div class="summary-item"><span class="label">市值</span><span class="value">${marketCapBillion}B USD</span></div>
                        <div class="summary-item"><span class="label">总股本</span><span class="value">${shareBillion}B</span></div>
                        <div class="summary-item"><span class="label">行业</span><span class="value">${sectorZh}</span></div>
                        <div class="summary-item"><span class="label">官网</span><span class="value"><a href="${profile.weburl}" target="_blank" rel="noopener noreferrer">${profile.weburl ? profile.weburl.replace(/^(https?:\/\/)?(www\.)?/, '') : 'N/A'}</a></span></div>
                    </div>
                    <div class="card">
                        <h2 class="card-title">关键数据</h2>
                        <div class="summary-item"><span class="label">开盘价</span><span class="value">${openPrice.toFixed(2)}</span></div>
                        <div class="summary-item"><span class="label">最高价</span><span class="value">${high.toFixed(2)}</span></div>
                        <div class="summary-item"><span class="label">最低价</span><span class="value">${low.toFixed(2)}</span></div>
                    </div>
                    <div class="card upgrade-card">
                        <h2 class="card-title">🚀 增强功能</h2>
                        <p>升级到增强版详情页，获得：</p>
                        <ul>
                            <li>📊 交互式价格图表</li>
                            <li>📈 技术指标分析</li>
                            <li>💰 详细财务数据</li>
                            <li>📰 相关新闻链接</li>
                        </ul>
                        <a href="./details/stock-detail.html?symbol=${symbol}" class="upgrade-button">立即体验</a>
                    </div>
                </aside>
            </div>
        `;
    } catch (error) {
        console.error('Error rendering stock detail page:', error);
        appContainer.innerHTML = `<div class="loading-indicator">${error.message}</div>`;
    }
}

// 当窗口大小改变时，重新渲染当前的视图
function rerenderCurrentView() {
    if (!fullMarketData) return; // 如果没有数据，则不执行任何操作
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