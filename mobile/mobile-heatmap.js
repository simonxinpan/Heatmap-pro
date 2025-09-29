/**
 * ==================================================================
 * === ✨ 强制跳转修正补丁 (最终解决方案) ✨ ===
 * ==================================================================
 * 这段代码会拦截所有试图跳转到桌面版个股详情页的请求，
 * 并将其强制重定向到正确的移动版页面。
 * 这是解决此问题的最可靠方法。
 */
(function() {
    // 1. 定义我们期望的、正确的移动版个股详情页基础URL
    const CORRECT_MOBILE_URL = 'https://stock-details-final.vercel.app/mobile.html';
    
    // 2. 定义错误的桌面版URL的特征
    const WRONG_DESKTOP_URL_PART = 'stock-details-final.vercel.app';

    // 3. 保存原始的 window.open 函数，以备后用
    const originalWindowOpen = window.open;

    // 4. 重写 (Override) window.open 函数，建立我们的“安检口”
    window.open = function(url, target, features, replace) {
        
        // 检查传入的URL是否是我们要修正的目标
        if (typeof url === 'string' && url.includes(WRONG_DESKTOP_URL_PART) && !url.includes('/mobile.html')) {
            
            console.log(`[PATCH] 拦截到错误的跳转请求: ${url}`);
            
            try {
                // 从错误的URL中提取出最重要的信息：股票代码 (symbol)
                const urlObject = new URL(url);
                const symbol = urlObject.searchParams.get('symbol');

                if (symbol) {
                    // 构造新的、正确的移动版URL
                    const newUrl = `${CORRECT_MOBILE_URL}?symbol=${symbol}`;
                    
                    console.log(`[PATCH] 修正并跳转到: ${newUrl}`);

                    // 执行正确的跳转。在父窗口中打开，体验更好
                    if (window.parent && window.parent.location) {
                        window.parent.location.href = newUrl;
                    } else {
                        window.location.href = newUrl;
                    }
                    
                    // 阻止原始的、错误的 window.open 调用继续执行
                    return null; 
                }
            } catch (e) {
                console.error('[PATCH] 解析URL时出错:', e);
            }
        }

        // 如果不是我们要修正的URL，则一切照旧，调用原始的 window.open 函数
        return originalWindowOpen.apply(this, arguments);
    };

    console.log('[PATCH] 移动版个股详情页跳转修正补丁已激活。');
})();


/**
 * ==================================================================
 * === 您原有的所有代码保持不变 ===
 * ==================================================================
 */

/**
 * 移动端热力图模块
 * 专为移动设备优化的热力图展示和交互功能
 * 包含行业仪表盘、全景热力图等核心功能
 */
class MobileHeatmap {
    constructor() {
        this.sectors = [
            { name: '信息技术', code: '信息技术', icon: '💻', color: '#4CAF50' },
            { name: '工业', code: '工业', icon: '🏭', color: '#2196F3' },
            { name: '金融', code: '金融', icon: '🏦', color: '#FF9800' },
            { name: '医疗保健', code: '医疗保健', icon: '🏥', color: '#E91E63' },
            { name: '非必需消费品', code: '非必需消费品', icon: '🛍️', color: '#9C27B0' },
            { name: '日常消费品', code: '日常消费品', icon: '🛒', color: '#00BCD4' },
            { name: '公用事业', code: '公用事业', icon: '⚡', color: '#8BC34A' },
            { name: '房地产', code: '房地产', icon: '🏠', color: '#FFC107' },
            { name: '原材料', code: '原材料', icon: '⛏️', color: '#795548' },
            { name: '能源', code: '能源', icon: '⛽', color: '#F44336' },
            { name: '半导体', code: '半导体', icon: '🔌', color: '#3F51B5' },
            { name: '媒体娱乐', code: '媒体娱乐', icon: '🎬', color: '#607D8B' },
            { name: '通讯服务', code: '通讯服务', icon: '📡', color: '#009688' }
        ];
        
        this.currentView = 'overview'; // overview, sector, detail
        this.currentSector = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isZooming = false;
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.lastTouchDistance = 0;
        
        this.init();
    }

    init() {
        this.setupHeatmapContainer();
        this.setupTouchEvents();
        this.renderOverview();
        this.setupSectorNavigation();
    }

    setupHeatmapContainer() {
        const container = document.getElementById('heatmapContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="heatmap-controls">
                <div class="view-tabs">
                    <button class="tab-btn active" data-view="overview">全景</button>
                    <button class="tab-btn" data-view="sectors">行业</button>
                </div>
                <div class="heatmap-actions">
                    <button class="action-btn" id="resetZoom">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                    </button>
                    <button class="action-btn" id="refreshHeatmap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
                    </button>
                </div>
            </div>
            <div class="heatmap-viewport" id="heatmapViewport"><div class="heatmap-canvas" id="heatmapCanvas"></div></div>
            <div class="heatmap-legend" id="heatmapLegend"></div>
            <div class="sector-navigation hidden" id="sectorNavigation"></div>
        `;
        
        this.setupControlEvents();
    }

    setupControlEvents() {
        document.querySelectorAll('.view-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        document.getElementById('resetZoom')?.addEventListener('click', () => this.resetZoom());
        document.getElementById('refreshHeatmap')?.addEventListener('click', () => this.refreshHeatmap());
    }

    switchView(view) {
        document.querySelectorAll('.view-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        this.currentView = view;
        if (view === 'overview') this.renderOverview();
        else if (view === 'sectors') this.renderSectorDashboard();
    }

    renderOverview() {
        const canvas = document.getElementById('heatmapCanvas');
        if (!canvas) return;
        canvas.innerHTML = `<div class="overview-heatmap"><div class="market-summary"><div class="summary-item"><span class="label">总市值</span><span class="value">$45.2T</span><span class="change positive">+1.2%</span></div><div class="summary-item"><span class="label">上涨股票</span><span class="value">2,847</span><span class="change positive">+156</span></div><div class="summary-item"><span class="label">下跌股票</span><span class="value">1,923</span><span class="change negative">-89</span></div></div><div class="heatmap-grid" id="overviewGrid">${this.generateOverviewHeatmap()}</div></div>`;
        this.renderLegend();
        this.setupOverviewInteractions();
    }

    generateOverviewHeatmap() {
        return this.generateMockStockData(100).map(stock => `<div class="stock-cell ${stock.change >= 0 ? 'positive' : 'negative'}" data-symbol="${stock.symbol}" data-change="${stock.change}" style="opacity: ${0.3 + Math.min(Math.abs(stock.change) / 10, 1) * 0.7}"><div class="stock-symbol">${stock.symbol}</div><div class="stock-change">${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%</div></div>`).join('');
    }

    renderSectorDashboard() {
        const canvas = document.getElementById('heatmapCanvas');
        if (!canvas) return;
        canvas.innerHTML = `<div class="sector-dashboard"><div class="sector-grid" id="sectorGrid">${this.generateSectorCards()}</div></div>`;
        this.setupSectorInteractions();
        this.showSectorNavigation();
    }

    generateSectorCards() {
        return this.sectors.map(sector => {
            const sectorData = this.generateSectorData(sector);
            return `<div class="sector-card" data-sector="${sector.code}"><div class="sector-header"><div class="sector-icon">${sector.icon}</div><div class="sector-info"><h3 class="sector-name">${sector.name}</h3><div class="sector-stats"><span class="sector-change ${sectorData.change >= 0 ? 'positive' : 'negative'}">${sectorData.change >= 0 ? '+' : ''}${sectorData.change.toFixed(2)}%</span><span class="sector-volume">${sectorData.volume}</span></div></div></div><div class="sector-mini-heatmap">${this.generateMiniHeatmap(sector)}</div><div class="sector-footer"><span class="stock-count">${sectorData.stockCount} 只股票</span><button class="expand-btn" data-sector="${sector.code}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div></div>`;
        }).join('');
    }

    generateMiniHeatmap(sector) {
        return this.generateSectorStocks(sector, 12).map(stock => `<div class="mini-cell ${stock.change >= 0 ? 'positive' : 'negative'}" data-symbol="${stock.symbol}" style="opacity: ${0.4 + Math.min(Math.abs(stock.change) / 8, 1) * 0.6}"></div>`).join('');
    }

    setupTouchEvents() {
        const viewport = document.getElementById('heatmapViewport');
        if (!viewport) return;
        let isTouch = false, startDistance = 0, startZoom = 1;
        viewport.addEventListener('touchstart', (e) => {
            isTouch = true;
            if (e.touches.length === 1) { this.touchStartX = e.touches[0].clientX; this.touchStartY = e.touches[0].clientY; }
            else if (e.touches.length === 2) { this.isZooming = true; startDistance = this.getTouchDistance(e.touches[0], e.touches[1]); startZoom = this.zoomLevel; e.preventDefault(); }
        }, { passive: false });
        viewport.addEventListener('touchmove', (e) => {
            if (!isTouch) return;
            if (e.touches.length === 2 && this.isZooming) { const scale = this.getTouchDistance(e.touches[0], e.touches[1]) / startDistance; this.zoomLevel = Math.max(0.5, Math.min(3, startZoom * scale)); this.applyTransform(); e.preventDefault(); }
            else if (e.touches.length === 1 && !this.isZooming) { const deltaX = e.touches[0].clientX - this.touchStartX, deltaY = e.touches[0].clientY - this.touchStartY; if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) { this.panX += deltaX * 0.5; this.panY += deltaY * 0.5; this.applyTransform(); this.touchStartX = e.touches[0].clientX; this.touchStartY = e.touches[0].clientY; } }
        }, { passive: false });
        viewport.addEventListener('touchend', (e) => { if (e.touches.length === 0) { isTouch = false; this.isZooming = false; } });
    }

    getTouchDistance(t1, t2) { const dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY; return Math.sqrt(dx * dx + dy * dy); }
    applyTransform() { const canvas = document.getElementById('heatmapCanvas'); if (canvas) canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`; }
    resetZoom() { this.zoomLevel = 1; this.panX = 0; this.panY = 0; this.applyTransform(); }

    setupOverviewInteractions() {
        document.querySelectorAll('.stock-cell').forEach(cell => {
            cell.addEventListener('click', (e) => this.showStockDetail(e.currentTarget.dataset.symbol));
        });
    }

    setupSectorInteractions() {
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); this.expandSector(e.currentTarget.dataset.sector); });
        });
        document.querySelectorAll('.sector-card').forEach(card => {
            card.addEventListener('click', (e) => { if (!e.target.closest('.expand-btn')) this.showSectorDetail(e.currentTarget.dataset.sector); });
        });
    }

    expandSector(sectorCode) {
        this.currentSector = sectorCode;
        const sector = this.sectors.find(s => s.code === sectorCode);
        if (!sector) return;
        const canvas = document.getElementById('heatmapCanvas');
        canvas.innerHTML = `<div class="sector-detail"><div class="sector-detail-header"><button class="back-btn" id="backToSectors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button><div class="sector-title"><span class="sector-icon">${sector.icon}</span><h2>${sector.name}</h2></div></div><div class="sector-stocks-grid">${this.generateSectorStocksGrid(sector)}</div></div>`;
        document.getElementById('backToSectors')?.addEventListener('click', () => this.renderSectorDashboard());
        this.setupSectorStocksInteractions();
    }

    generateSectorStocksGrid(sector) {
        return this.generateSectorStocks(sector, 50).map(stock => `<div class="sector-stock-cell ${stock.change >= 0 ? 'positive' : 'negative'}" data-symbol="${stock.symbol}" style="opacity: ${0.3 + Math.min(Math.abs(stock.change) / 10, 1) * 0.7}"><div class="stock-symbol">${stock.symbol}</div><div class="stock-name">${stock.name}</div><div class="stock-price">$${stock.price.toFixed(2)}</div><div class="stock-change">${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%</div></div>`).join('');
    }

    setupSectorStocksInteractions() {
        document.querySelectorAll('.sector-stock-cell').forEach(cell => {
            cell.addEventListener('click', (e) => this.showStockDetail(e.currentTarget.dataset.symbol));
        });
    }

    showStockDetail(symbol) {
        window.dispatchEvent(new CustomEvent('showStockDetail', { detail: { symbol } }));
    }

    showSectorNavigation() {
        const navigation = document.getElementById('sectorNavigation');
        if (!navigation) return;
        navigation.classList.remove('hidden');
        navigation.innerHTML = `<div class="sector-nav-list">${this.sectors.map(sector => `<button class="sector-nav-item" data-sector="${sector.code}"><span class="nav-icon">${sector.icon}</span><span class="nav-name">${sector.name}</span></button>`).join('')}</div>`;
        document.querySelectorAll('.sector-nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.scrollToSector(e.currentTarget.dataset.sector));
        });
    }

    scrollToSector(sectorCode) {
        const sectorCard = document.querySelector(`[data-sector="${sectorCode}"]`);
        if (sectorCard) {
            sectorCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sectorCard.classList.add('highlight');
            setTimeout(() => sectorCard.classList.remove('highlight'), 2000);
        }
    }

    renderLegend() {
        const legend = document.getElementById('heatmapLegend');
        if (legend) legend.innerHTML = `<div class="legend-items"><div class="legend-item"><div class="legend-color positive"></div><span>上涨</span></div><div class="legend-item"><div class="legend-color negative"></div><span>下跌</span></div><div class="legend-item"><div class="legend-color neutral"></div><span>平盘</span></div></div>`;
    }

    refreshHeatmap() {
        if (this.currentView === 'overview') this.renderOverview();
        else if (this.currentView === 'sectors') this.renderSectorDashboard();
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: '热力图已刷新' } }));
    }

    generateMockStockData(count) {
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'CRM', 'ORCL'];
        const stocks = [];
        for (let i = 0; i < count; i++) {
            stocks.push({ symbol: symbols[i % symbols.length] + (i > 9 ? Math.floor(i / 10) : ''), change: (Math.random() - 0.5) * 20, price: 50 + Math.random() * 200 });
        }
        return stocks;
    }

    generateSectorData(sector) {
        return { change: (Math.random() - 0.5) * 10, volume: (Math.random() * 1000).toFixed(0) + 'M', stockCount: Math.floor(Math.random() * 100) + 20 };
    }

    generateSectorStocks(sector, count) {
        const stocks = [], baseSymbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        for (let i = 0; i < count; i++) {
            stocks.push({ symbol: baseSymbols[i % baseSymbols.length] + (Math.floor(i / 10) + 1), name: `${sector.name}公司${i + 1}`, change: (Math.random() - 0.5) * 15, price: 20 + Math.random() * 180 });
        }
        return stocks;
    }

    destroy() {
        const viewport = document.getElementById('heatmapViewport');
        if (viewport) {
            viewport.removeEventListener('touchstart', this.handleTouchStart);
            viewport.removeEventListener('touchmove', this.handleTouchMove);
            viewport.removeEventListener('touchend', this.handleTouchEnd);
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileHeatmap;
}