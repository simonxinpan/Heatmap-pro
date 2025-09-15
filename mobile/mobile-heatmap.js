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

    /**
     * 初始化热力图模块
     */
    init() {
        this.setupHeatmapContainer();
        this.setupTouchEvents();
        this.renderOverview();
        this.setupSectorNavigation();
    }

    /**
     * 设置热力图容器
     */
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                            <line x1="11" y1="8" x2="11" y2="14"></line>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                        </svg>
                    </button>
                    <button class="action-btn" id="refreshHeatmap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="heatmap-viewport" id="heatmapViewport">
                <div class="heatmap-canvas" id="heatmapCanvas">
                    <!-- 热力图内容 -->
                </div>
            </div>
            <div class="heatmap-legend" id="heatmapLegend">
                <!-- 图例 -->
            </div>
            <div class="sector-navigation hidden" id="sectorNavigation">
                <!-- 行业导航 -->
            </div>
        `;
        
        this.setupControlEvents();
    }

    /**
     * 设置控制按钮事件
     */
    setupControlEvents() {
        // 视图切换
        document.querySelectorAll('.view-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
        
        // 重置缩放
        document.getElementById('resetZoom')?.addEventListener('click', () => {
            this.resetZoom();
        });
        
        // 刷新热力图
        document.getElementById('refreshHeatmap')?.addEventListener('click', () => {
            this.refreshHeatmap();
        });
    }

    /**
     * 切换视图
     */
    switchView(view) {
        // 更新按钮状态
        document.querySelectorAll('.view-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.currentView = view;
        
        if (view === 'overview') {
            this.renderOverview();
        } else if (view === 'sectors') {
            this.renderSectorDashboard();
        }
    }

    /**
     * 渲染全景视图
     */
    renderOverview() {
        const canvas = document.getElementById('heatmapCanvas');
        if (!canvas) return;
        
        canvas.innerHTML = `
            <div class="overview-heatmap">
                <div class="market-summary">
                    <div class="summary-item">
                        <span class="label">总市值</span>
                        <span class="value">$45.2T</span>
                        <span class="change positive">+1.2%</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">上涨股票</span>
                        <span class="value">2,847</span>
                        <span class="change positive">+156</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">下跌股票</span>
                        <span class="value">1,923</span>
                        <span class="change negative">-89</span>
                    </div>
                </div>
                <div class="heatmap-grid" id="overviewGrid">
                    ${this.generateOverviewHeatmap()}
                </div>
            </div>
        `;
        
        this.renderLegend();
        this.setupOverviewInteractions();
    }

    /**
     * 生成全景热力图
     */
    generateOverviewHeatmap() {
        const stocks = this.generateMockStockData(100);
        return stocks.map(stock => {
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const intensity = Math.min(Math.abs(stock.change) / 10, 1);
            
            return `
                <div class="stock-cell ${changeClass}" 
                     data-symbol="${stock.symbol}"
                     data-change="${stock.change}"
                     style="opacity: ${0.3 + intensity * 0.7}">
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-change">${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%</div>
                </div>
            `;
        }).join('');
    }

    /**
     * 渲染行业仪表盘
     */
    renderSectorDashboard() {
        const canvas = document.getElementById('heatmapCanvas');
        if (!canvas) return;
        
        canvas.innerHTML = `
            <div class="sector-dashboard">
                <div class="sector-grid" id="sectorGrid">
                    ${this.generateSectorCards()}
                </div>
            </div>
        `;
        
        this.setupSectorInteractions();
        this.showSectorNavigation();
    }

    /**
     * 生成行业卡片
     */
    generateSectorCards() {
        return this.sectors.map(sector => {
            const sectorData = this.generateSectorData(sector);
            const changeClass = sectorData.change >= 0 ? 'positive' : 'negative';
            
            return `
                <div class="sector-card" data-sector="${sector.code}">
                    <div class="sector-header">
                        <div class="sector-icon">${sector.icon}</div>
                        <div class="sector-info">
                            <h3 class="sector-name">${sector.name}</h3>
                            <div class="sector-stats">
                                <span class="sector-change ${changeClass}">
                                    ${sectorData.change >= 0 ? '+' : ''}${sectorData.change.toFixed(2)}%
                                </span>
                                <span class="sector-volume">${sectorData.volume}</span>
                            </div>
                        </div>
                    </div>
                    <div class="sector-mini-heatmap">
                        ${this.generateMiniHeatmap(sector)}
                    </div>
                    <div class="sector-footer">
                        <span class="stock-count">${sectorData.stockCount} 只股票</span>
                        <button class="expand-btn" data-sector="${sector.code}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 生成迷你热力图
     */
    generateMiniHeatmap(sector) {
        const stocks = this.generateSectorStocks(sector, 12);
        return stocks.map(stock => {
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const intensity = Math.min(Math.abs(stock.change) / 8, 1);
            
            return `
                <div class="mini-cell ${changeClass}" 
                     data-symbol="${stock.symbol}"
                     style="opacity: ${0.4 + intensity * 0.6}">
                </div>
            `;
        }).join('');
    }

    /**
     * 设置触摸事件
     */
    setupTouchEvents() {
        const viewport = document.getElementById('heatmapViewport');
        if (!viewport) return;
        
        let isTouch = false;
        let startDistance = 0;
        let startZoom = 1;
        
        // 触摸开始
        viewport.addEventListener('touchstart', (e) => {
            isTouch = true;
            
            if (e.touches.length === 1) {
                // 单指触摸
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                // 双指缩放
                this.isZooming = true;
                startDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                startZoom = this.zoomLevel;
                e.preventDefault();
            }
        }, { passive: false });
        
        // 触摸移动
        viewport.addEventListener('touchmove', (e) => {
            if (!isTouch) return;
            
            if (e.touches.length === 2 && this.isZooming) {
                // 双指缩放
                const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                const scale = currentDistance / startDistance;
                this.zoomLevel = Math.max(0.5, Math.min(3, startZoom * scale));
                this.applyTransform();
                e.preventDefault();
            } else if (e.touches.length === 1 && !this.isZooming) {
                // 单指拖拽
                const deltaX = e.touches[0].clientX - this.touchStartX;
                const deltaY = e.touches[0].clientY - this.touchStartY;
                
                if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                    this.panX += deltaX * 0.5;
                    this.panY += deltaY * 0.5;
                    this.applyTransform();
                    
                    this.touchStartX = e.touches[0].clientX;
                    this.touchStartY = e.touches[0].clientY;
                }
            }
        }, { passive: false });
        
        // 触摸结束
        viewport.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                isTouch = false;
                this.isZooming = false;
            }
        });
    }

    /**
     * 获取两点间距离
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 应用变换
     */
    applyTransform() {
        const canvas = document.getElementById('heatmapCanvas');
        if (!canvas) return;
        
        canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }

    /**
     * 重置缩放
     */
    resetZoom() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
    }

    /**
     * 设置全景视图交互
     */
    setupOverviewInteractions() {
        document.querySelectorAll('.stock-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const symbol = e.currentTarget.dataset.symbol;
                this.showStockDetail(symbol);
            });
        });
    }

    /**
     * 设置行业交互
     */
    setupSectorInteractions() {
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sector = e.currentTarget.dataset.sector;
                this.expandSector(sector);
            });
        });
        
        document.querySelectorAll('.sector-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.expand-btn')) return;
                const sector = e.currentTarget.dataset.sector;
                this.showSectorDetail(sector);
            });
        });
    }

    /**
     * 展开行业详情
     */
    expandSector(sectorCode) {
        this.currentSector = sectorCode;
        const sector = this.sectors.find(s => s.code === sectorCode);
        if (!sector) return;
        
        const canvas = document.getElementById('heatmapCanvas');
        canvas.innerHTML = `
            <div class="sector-detail">
                <div class="sector-detail-header">
                    <button class="back-btn" id="backToSectors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <div class="sector-title">
                        <span class="sector-icon">${sector.icon}</span>
                        <h2>${sector.name}</h2>
                    </div>
                </div>
                <div class="sector-stocks-grid">
                    ${this.generateSectorStocksGrid(sector)}
                </div>
            </div>
        `;
        
        document.getElementById('backToSectors')?.addEventListener('click', () => {
            this.renderSectorDashboard();
        });
        
        this.setupSectorStocksInteractions();
    }

    /**
     * 生成行业股票网格
     */
    generateSectorStocksGrid(sector) {
        const stocks = this.generateSectorStocks(sector, 50);
        return stocks.map(stock => {
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const intensity = Math.min(Math.abs(stock.change) / 10, 1);
            
            return `
                <div class="sector-stock-cell ${changeClass}" 
                     data-symbol="${stock.symbol}"
                     style="opacity: ${0.3 + intensity * 0.7}">
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.name}</div>
                    <div class="stock-price">$${stock.price.toFixed(2)}</div>
                    <div class="stock-change">${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%</div>
                </div>
            `;
        }).join('');
    }

    /**
     * 设置行业股票交互
     */
    setupSectorStocksInteractions() {
        document.querySelectorAll('.sector-stock-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const symbol = e.currentTarget.dataset.symbol;
                this.showStockDetail(symbol);
            });
        });
    }

    /**
     * 显示股票详情
     */
    showStockDetail(symbol) {
        // 触发全局事件，由主应用处理
        window.dispatchEvent(new CustomEvent('showStockDetail', {
            detail: { symbol }
        }));
    }

    /**
     * 显示行业导航
     */
    showSectorNavigation() {
        const navigation = document.getElementById('sectorNavigation');
        if (!navigation) return;
        
        navigation.classList.remove('hidden');
        navigation.innerHTML = `
            <div class="sector-nav-list">
                ${this.sectors.map(sector => `
                    <button class="sector-nav-item" data-sector="${sector.code}">
                        <span class="nav-icon">${sector.icon}</span>
                        <span class="nav-name">${sector.name}</span>
                    </button>
                `).join('')}
            </div>
        `;
        
        document.querySelectorAll('.sector-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const sector = e.currentTarget.dataset.sector;
                this.scrollToSector(sector);
            });
        });
    }

    /**
     * 滚动到指定行业
     */
    scrollToSector(sectorCode) {
        const sectorCard = document.querySelector(`[data-sector="${sectorCode}"]`);
        if (sectorCard) {
            sectorCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sectorCard.classList.add('highlight');
            setTimeout(() => {
                sectorCard.classList.remove('highlight');
            }, 2000);
        }
    }

    /**
     * 渲染图例
     */
    renderLegend() {
        const legend = document.getElementById('heatmapLegend');
        if (!legend) return;
        
        legend.innerHTML = `
            <div class="legend-items">
                <div class="legend-item">
                    <div class="legend-color positive"></div>
                    <span>上涨</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color negative"></div>
                    <span>下跌</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color neutral"></div>
                    <span>平盘</span>
                </div>
            </div>
        `;
    }

    /**
     * 刷新热力图
     */
    refreshHeatmap() {
        if (this.currentView === 'overview') {
            this.renderOverview();
        } else if (this.currentView === 'sectors') {
            this.renderSectorDashboard();
        }
        
        // 显示刷新提示
        window.dispatchEvent(new CustomEvent('showToast', {
            detail: { message: '热力图已刷新' }
        }));
    }

    /**
     * 生成模拟股票数据
     */
    generateMockStockData(count) {
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'CRM', 'ORCL'];
        const stocks = [];
        
        for (let i = 0; i < count; i++) {
            stocks.push({
                symbol: symbols[i % symbols.length] + (i > 9 ? Math.floor(i / 10) : ''),
                change: (Math.random() - 0.5) * 20,
                price: 50 + Math.random() * 200
            });
        }
        
        return stocks;
    }

    /**
     * 生成行业数据
     */
    generateSectorData(sector) {
        return {
            change: (Math.random() - 0.5) * 10,
            volume: (Math.random() * 1000).toFixed(0) + 'M',
            stockCount: Math.floor(Math.random() * 100) + 20
        };
    }

    /**
     * 生成行业股票
     */
    generateSectorStocks(sector, count) {
        const stocks = [];
        const baseSymbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        
        for (let i = 0; i < count; i++) {
            const symbol = baseSymbols[i % baseSymbols.length] + (Math.floor(i / 10) + 1);
            stocks.push({
                symbol: symbol,
                name: `${sector.name}公司${i + 1}`,
                change: (Math.random() - 0.5) * 15,
                price: 20 + Math.random() * 180
            });
        }
        
        return stocks;
    }

    /**
     * 销毁实例
     */
    destroy() {
        // 清理事件监听器
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