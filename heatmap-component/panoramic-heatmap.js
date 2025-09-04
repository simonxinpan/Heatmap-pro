/**
 * 全景热力图页面交互逻辑
 * 负责全景视图的动态功能、数据加载和用户交互
 */

class PanoramicHeatmap {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.isLoading = false;
        this.refreshInterval = null;
        this.heatmaps = {}; // 存储各个热力图实例
        this.currentSector = null;
        
        // 解析URL参数
        this.urlParams = new URLSearchParams(window.location.search);
        this.isEmbedMode = this.urlParams.get('embed') === 'true';
        this.targetSector = this.urlParams.get('sector');
        
        this.init();
    }

    /**
     * 初始化页面
     */
    init() {
        // 如果是嵌入模式，调整页面样式
        if (this.isEmbedMode) {
            this.setupEmbedMode();
        }
        
        this.setupEventListeners();
        this.handleUrlHash();
        this.loadInitialData();
        this.startAutoRefresh();
        this.renderSectorHeatmaps();
        
        // 如果指定了特定行业，直接加载该行业
        if (this.targetSector && this.isEmbedMode) {
            this.loadTargetSectorHeatmap();
        }
    }

    /**
     * 设置嵌入模式
     */
    setupEmbedMode() {
        // 隐藏导航栏和页脚
        const navbar = document.querySelector('.global-navbar');
        const footer = document.querySelector('.footer');
        const heroSection = document.querySelector('.hero-section');
        
        if (navbar) navbar.style.display = 'none';
        if (footer) footer.style.display = 'none';
        if (heroSection) heroSection.style.display = 'none';
        
        // 调整主内容区域样式
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.padding = '10px';
            mainContent.style.margin = '0';
        }
        
        // 添加嵌入模式样式
        document.body.classList.add('embed-mode');
        
        // 添加CSS样式
        const embedStyles = `
            <style>
                .embed-mode {
                    overflow: hidden;
                }
                .embed-mode .heatmap-section {
                    margin: 0;
                    padding: 8px;
                }
                .embed-mode .section-header {
                    display: none;
                }
                .embed-mode .heatmap-canvas {
                    height: 360px;
                    min-height: 360px;
                    border-radius: 8px;
                }
                .embed-mode .heatmap-legend {
                    margin-top: 8px;
                    padding: 8px;
                    font-size: 11px;
                }
                .embed-mode .legend-item {
                    font-size: 10px;
                    padding: 2px 6px;
                }
                .embed-mode .main-content {
                    background: transparent;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', embedStyles);
    }
    
    /**
     * 加载目标行业热力图
     */
    async loadTargetSectorHeatmap() {
        try {
            // 隐藏其他不相关的部分
            const sectionsToHide = ['.dashboard-section', '.featured-sector-section', '.quick-nav-grid'];
            sectionsToHide.forEach(selector => {
                const element = document.querySelector(selector);
                if (element) element.style.display = 'none';
            });
            
            // 只显示市场概览热力图部分
            const marketOverview = document.getElementById('market-overview');
            if (marketOverview) {
                marketOverview.style.display = 'block';
                
                // 更新标题显示目标行业
                const sectorTitle = document.querySelector('.section-title');
                if (sectorTitle && this.targetSector) {
                    const sectorName = this.getSectorDisplayName(this.targetSector);
                    sectorTitle.textContent = `📊 ${sectorName} 热力图`;
                }
                
                // 加载该行业的热力图数据
                await this.loadSectorSpecificHeatmap(this.targetSector);
            }
        } catch (error) {
            console.error('加载目标行业热力图失败:', error);
        }
    }
    
    /**
     * 获取行业显示名称
     */
    getSectorDisplayName(sectorCode) {
        const sectorMap = {
            'technology': '科技',
            'healthcare': '医疗保健',
            'financials': '金融',
            'consumer-discretionary': '非必需消费品',
            'industrials': '工业',
            'communication-services': '通信服务',
            'consumer-staples': '必需消费品',
            'energy': '能源',
            'utilities': '公用事业',
            'real-estate': '房地产',
            'materials': '材料',
            'aerospace-defense': '航空航天与国防',
            'automotive': '汽车'
        };
        return sectorMap[sectorCode] || sectorCode;
    }
    
    /**
     * 加载特定行业的热力图
     */
    async loadSectorSpecificHeatmap(sectorCode) {
        try {
            const heatmapCanvas = document.getElementById('market-heatmap');
            if (!heatmapCanvas) return;
            
            // 显示加载状态
            heatmapCanvas.innerHTML = `
                <div class="heatmap-placeholder">
                    <div class="placeholder-icon">📊</div>
                    <p>正在加载${this.getSectorDisplayName(sectorCode)}热力图...</p>
                </div>
            `;
            
            // 模拟加载延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 生成该行业的模拟数据
            const sectorData = this.generateSectorMockData(sectorCode, true, true);
            
            // 渲染热力图
            this.renderSectorHeatmap(heatmapCanvas, sectorData);
            
        } catch (error) {
            console.error(`加载${sectorCode}热力图失败:`, error);
            const heatmapCanvas = document.getElementById('market-heatmap');
            if (heatmapCanvas) {
                heatmapCanvas.innerHTML = `
                    <div class="heatmap-placeholder error">
                        <div class="placeholder-icon">⚠️</div>
                        <p>热力图加载失败</p>
                    </div>
                `;
            }
        }
    }
    
    /**
     * 渲染行业热力图
     */
    renderSectorHeatmap(container, data) {
        // 清空容器
        container.innerHTML = '';
        
        // 创建热力图网格
        const grid = document.createElement('div');
        grid.className = 'mini-heatmap-grid';
        
        data.stocks.forEach(stock => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.style.backgroundColor = this.getColorByChange(stock.change_percent);
            cell.style.width = `${Math.max(20, Math.min(100, stock.market_cap / 1000000))}px`;
            cell.style.height = `${Math.max(20, Math.min(60, Math.abs(stock.change_percent) * 10))}px`;
            cell.title = `${stock.symbol}: ${stock.change_percent > 0 ? '+' : ''}${stock.change_percent.toFixed(2)}%`;
            
            const label = document.createElement('span');
            label.textContent = stock.symbol;
            label.className = 'cell-label';
            cell.appendChild(label);
            
            grid.appendChild(cell);
        });
        
        container.appendChild(grid);
        
        // 添加迷你热力图样式
        if (!document.getElementById('mini-heatmap-styles')) {
            const styles = `
                <style id="mini-heatmap-styles">
                    .mini-heatmap-grid {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 2px;
                        padding: 10px;
                        justify-content: center;
                        align-items: flex-end;
                    }
                    .heatmap-cell {
                        position: relative;
                        border-radius: 2px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: transform 0.2s;
                        cursor: pointer;
                    }
                    .heatmap-cell:hover {
                        transform: scale(1.1);
                        z-index: 10;
                    }
                    .cell-label {
                        font-size: 8px;
                        font-weight: bold;
                        color: white;
                        text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
                    }
                </style>
            `;
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }
    
    /**
     * 根据涨跌幅获取颜色
     */
    getColorByChange(change) {
        if (change > 5) return '#66bd63';
        if (change > 3) return '#a6d96a';
        if (change > 1) return '#d9ef8b';
        if (change > 0) return '#fee08b';
        if (change > -1) return '#fdae61';
        if (change > -3) return '#f46d43';
        return '#d73027';
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 控制面板事件
        document.getElementById('market-data-source')?.addEventListener('change', () => {
            this.refreshMarketHeatmap();
        });
        
        document.getElementById('market-timeframe')?.addEventListener('change', () => {
            this.refreshMarketHeatmap();
        });
        
        document.getElementById('sector-sort')?.addEventListener('change', () => {
            this.refreshSectorHeatmaps();
        });
        
        document.getElementById('sector-display-mode')?.addEventListener('change', () => {
            this.changeSectorDisplayMode();
        });

        // 返回全景视图按钮
        const backToOverviewBtn = document.getElementById('back-to-overview');
        if (backToOverviewBtn) {
            backToOverviewBtn.addEventListener('click', () => {
                this.showOverview();
            });
        }

        // 监听URL hash变化
        window.addEventListener('hashchange', () => {
            this.handleUrlHash();
        });

        // 行业卡片点击事件
        document.querySelectorAll('.sector-heatmap-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.sector-expand-btn')) {
                    const sector = card.dataset.sector;
                    if (sector) {
                        this.expandSector(sector);
                    }
                }
            });
        });
    }

    /**
     * 处理URL hash变化
     */
    handleUrlHash() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            if (hash === 'sector-heatmaps') {
                this.scrollToSection('sector-heatmaps');
                this.showOverview();
            } else if (hash === 'market-overview') {
                this.scrollToSection('market-overview');
                this.showOverview();
            } else if (hash.startsWith('sector-')) {
                const sector = hash.replace('sector-', '');
                this.expandSector(sector);
            } else {
                this.scrollToSection(hash);
            }
        }
    }

    /**
     * 滚动到指定区域
     */
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        try {
            this.isLoading = true;
            
            // 加载市场全景热力图
            await this.loadMarketHeatmap();
            
            // 加载各行业小热力图
            await this.loadSectorMiniHeatmaps();
            
        } catch (error) {
            console.error('加载初始数据失败:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 加载市场全景热力图
     */
    async loadMarketHeatmap() {
        const container = document.getElementById('market-heatmap');
        if (!container) return;

        try {
            // 模拟加载数据
            const stockData = this.generateMockStockData(500);
            
            // 清空容器
            container.innerHTML = '';
            
            // 创建热力图渲染器并渲染
            const renderer = new HeatmapRenderer(container, {
                width: container.offsetWidth,
                height: 600,
                showLabels: true,
                colorScheme: 'RdYlGn'
            });
            renderer.render(stockData, 'change_percent');
            
        } catch (error) {
            console.error('加载市场热力图失败:', error);
            container.innerHTML = '<div class="error-message">加载失败，请稍后重试</div>';
        }
    }

    /**
     * 加载各行业小热力图
     */
    async loadSectorMiniHeatmaps() {
        const sectors = ['technology', 'healthcare', 'financial', 'consumer', 'energy', 'industrial'];
        
        for (const sector of sectors) {
            await this.loadSectorMiniHeatmap(sector);
        }
    }

    /**
     * 加载单个行业小热力图
     */
    async loadSectorMiniHeatmap(sector) {
        // 映射sector名称到HTML中的ID
        const sectorIdMap = {
            'technology': 'tech-mini-heatmap',
            'healthcare': 'healthcare-mini-heatmap',
            'financial': 'financial-mini-heatmap',
            'consumer': 'consumer-mini-heatmap',
            'energy': 'energy-mini-heatmap',
            'industrial': 'industrial-mini-heatmap'
        };
        
        const containerId = sectorIdMap[sector];
        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            // 生成该行业的模拟数据（增加数量以获得更好的视觉效果）
            const sectorStocks = this.generateSectorMockData(sector, false, true);
            
            // 清空容器
            container.innerHTML = '';
            
            // 创建小热力图渲染器并渲染
            const renderer = new HeatmapRenderer(container, {
                width: container.offsetWidth,
                height: 180,
                showLabels: false,
                colorScheme: 'RdYlGn',
                fontSize: 8,
                padding: 1,
                cornerRadius: 2
            });
            renderer.render(sectorStocks, 'change_percent');
            
        } catch (error) {
            console.error(`加载${sector}行业热力图失败:`, error);
            container.innerHTML = '<div class="mini-error">加载失败</div>';
        }
    }

    /**
     * 展开特定行业
     */
    expandSector(sector) {
        this.currentSector = sector;
        
        // 隐藏概览区域
        document.getElementById('market-overview').style.display = 'none';
        document.getElementById('sector-heatmaps').style.display = 'none';
        
        // 显示特定行业区域
        const featuredSection = document.getElementById('featured-sector-section');
        featuredSection.style.display = 'block';
        
        // 更新行业信息
        this.updateFeaturedSectorInfo(sector);
        
        // 加载行业详细热力图
        this.loadFeaturedSectorHeatmap(sector);
        
        // 滚动到顶部
        featuredSection.scrollIntoView({ behavior: 'smooth' });
        
        // 更新URL hash
        window.history.pushState(null, null, `#sector-${sector}`);
    }

    /**
     * 显示概览视图
     */
    showOverview() {
        // 显示概览区域
        document.getElementById('market-overview').style.display = 'block';
        document.getElementById('sector-heatmaps').style.display = 'block';
        
        // 隐藏特定行业区域
        document.getElementById('featured-sector-section').style.display = 'none';
        
        this.currentSector = null;
        
        // 更新URL hash
        window.history.pushState(null, null, '#sector-heatmaps');
    }

    /**
     * 更新特定行业信息
     */
    updateFeaturedSectorInfo(sector) {
        const sectorNames = {
            'technology': '💻 科技行业',
            'healthcare': '🏥 医疗保健',
            'financial': '🏦 金融服务',
            'consumer': '🛍️ 消费品',
            'energy': '⚡ 能源',
            'industrial': '🏭 工业'
        };
        
        const sectorStats = {
            'technology': { count: 128, change: '+2.34%', leader: 'AAPL', volume: '$2.8B' },
            'healthcare': { count: 95, change: '+1.87%', leader: 'JNJ', volume: '$1.2B' },
            'financial': { count: 87, change: '-0.52%', leader: 'JPM', volume: '$1.8B' },
            'consumer': { count: 76, change: '+0.93%', leader: 'AMZN', volume: '$2.1B' },
            'energy': { count: 42, change: '-1.24%', leader: 'XOM', volume: '$0.9B' },
            'industrial': { count: 89, change: '+1.15%', leader: 'BA', volume: '$1.1B' }
        };
        
        document.getElementById('featured-sector-name').textContent = sectorNames[sector] + '深度分析';
        document.getElementById('featured-sector-count').textContent = sectorStats[sector].count;
        document.getElementById('featured-sector-change').textContent = sectorStats[sector].change;
        document.getElementById('featured-sector-leader').textContent = sectorStats[sector].leader;
        document.getElementById('featured-sector-volume').textContent = sectorStats[sector].volume;
    }

    /**
     * 加载特定行业详细热力图
     */
    async loadFeaturedSectorHeatmap(sector) {
        const container = document.getElementById('featured-sector-heatmap');
        if (!container) return;

        try {
            // 显示加载状态
            container.innerHTML = '<div class="heatmap-placeholder"><div class="placeholder-icon">📊</div><p>正在加载行业详细热力图...</p></div>';
            
            // 模拟加载延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 生成该行业的详细数据
            const sectorStocks = this.generateSectorMockData(sector, true);
            
            // 清空容器
            container.innerHTML = '';
            
            // 创建详细热力图渲染器并渲染
            const renderer = new HeatmapRenderer(container, {
                width: container.offsetWidth,
                height: 500,
                showLabels: true,
                colorScheme: 'RdYlGn',
                fontSize: 12
            });
            renderer.render(sectorStocks, 'change_percent');
            
        } catch (error) {
            console.error(`加载${sector}行业详细热力图失败:`, error);
            container.innerHTML = '<div class="error-message">加载失败，请稍后重试</div>';
        }
    }

    /**
     * 刷新市场热力图
     */
    async refreshMarketHeatmap() {
        console.log('刷新市场热力图');
        await this.loadMarketHeatmap();
    }

    /**
     * 刷新行业热力图
     */
    async refreshSectorHeatmaps() {
        console.log('刷新行业热力图');
        await this.loadSectorMiniHeatmaps();
    }

    /**
     * 改变行业显示模式
     */
    changeSectorDisplayMode() {
        const mode = document.getElementById('sector-display-mode').value;
        const grid = document.getElementById('sector-heatmaps-grid');
        
        // 移除所有模式类
        grid.classList.remove('grid-mode', 'list-mode', 'compact-mode');
        
        // 添加新模式类
        grid.classList.add(`${mode}-mode`);
        
        console.log('切换显示模式:', mode);
    }

    /**
     * 开始自动刷新
     */
    startAutoRefresh() {
        // 每30秒自动刷新一次
        this.refreshInterval = setInterval(() => {
            if (!this.isLoading) {
                this.refreshMarketHeatmap();
                if (!this.currentSector) {
                    this.refreshSectorHeatmaps();
                }
            }
        }, 30000);
    }

    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * 渲染行业热力图
     */
    renderSectorHeatmaps() {
        // 初始化时渲染所有行业小热力图
        setTimeout(() => {
            this.loadSectorMiniHeatmaps();
        }, 500);
    }

    /**
     * 生成模拟股票数据
     */
    generateMockStockData(count = 100) {
        const stocks = [];
        const sectors = ['technology', 'healthcare', 'financial', 'consumer', 'energy', 'industrial'];
        
        for (let i = 0; i < count; i++) {
            stocks.push({
                symbol: `STOCK${i.toString().padStart(3, '0')}`,
                name: `Stock ${i}`,
                sector: sectors[i % sectors.length],
                market_cap: Math.random() * 1000000000000, // 随机市值
                change_percent: (Math.random() - 0.5) * 20, // -10% 到 +10%
                price: Math.random() * 1000 + 10,
                volume: Math.random() * 10000000
            });
        }
        
        return stocks;
    }

    /**
     * 生成特定行业模拟数据
     */
    generateSectorMockData(sector, detailed = false, miniHeatmap = false) {
        const counts = {
            'technology': detailed ? 128 : (miniHeatmap ? 35 : 20),
            'healthcare': detailed ? 95 : (miniHeatmap ? 28 : 15),
            'financial': detailed ? 87 : (miniHeatmap ? 25 : 12),
            'consumer': detailed ? 76 : (miniHeatmap ? 22 : 10),
            'energy': detailed ? 42 : (miniHeatmap ? 18 : 8),
            'industrial': detailed ? 89 : (miniHeatmap ? 30 : 14)
        };
        
        const count = counts[sector] || 10;
        const stocks = [];
        
        // 为缩略图创建更多样化的数据分布
        const changeRanges = miniHeatmap ? {
            positive: { min: 0.5, max: 8 },
            negative: { min: -8, max: -0.5 },
            neutral: { min: -0.5, max: 0.5 }
        } : {
            positive: { min: 0, max: 15 },
            negative: { min: -15, max: 0 },
            neutral: { min: -2, max: 2 }
        };
        
        for (let i = 0; i < count; i++) {
            // 创建更真实的市值分布
            const marketCapTier = Math.random();
            let market_cap;
            if (marketCapTier < 0.1) {
                market_cap = Math.random() * 1000000000000 + 500000000000; // 大盘股
            } else if (marketCapTier < 0.4) {
                market_cap = Math.random() * 100000000000 + 10000000000; // 中盘股
            } else {
                market_cap = Math.random() * 10000000000 + 1000000000; // 小盘股
            }
            
            // 创建更真实的涨跌幅分布
            const changeType = Math.random();
            let change_percent;
            if (changeType < 0.35) {
                // 上涨股票
                change_percent = Math.random() * (changeRanges.positive.max - changeRanges.positive.min) + changeRanges.positive.min;
            } else if (changeType < 0.7) {
                // 下跌股票
                change_percent = Math.random() * (changeRanges.negative.max - changeRanges.negative.min) + changeRanges.negative.min;
            } else {
                // 平盘股票
                change_percent = Math.random() * (changeRanges.neutral.max - changeRanges.neutral.min) + changeRanges.neutral.min;
            }
            
            stocks.push({
                symbol: `${sector.toUpperCase().substring(0, 3)}${i.toString().padStart(3, '0')}`,
                name: `${sector} Stock ${i}`,
                sector: sector,
                market_cap: market_cap,
                change_percent: change_percent,
                price: Math.random() * 500 + 10,
                volume: Math.random() * 5000000
            });
        }
        
        // 按市值排序，确保大股票在前面（符合热力图最佳实践）
        const sortedStocks = stocks.sort((a, b) => b.market_cap - a.market_cap);
        
        // 返回包含 stocks 属性的对象，以匹配 renderSectorHeatmap 的期望格式
        return {
            stocks: sortedStocks,
            sector: sector,
            totalCount: sortedStocks.length
        };
    }
}

// 全局函数（供HTML调用）
function refreshMarketHeatmap() {
    if (window.panoramicHeatmap) {
        window.panoramicHeatmap.refreshMarketHeatmap();
    }
}

function refreshSectorHeatmaps() {
    if (window.panoramicHeatmap) {
        window.panoramicHeatmap.refreshSectorHeatmaps();
    }
}

function expandSector(sector) {
    if (window.panoramicHeatmap) {
        window.panoramicHeatmap.expandSector(sector);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    window.panoramicHeatmap = new PanoramicHeatmap();
});

// 页面卸载时清理
window.addEventListener('beforeunload', function() {
    if (window.panoramicHeatmap) {
        window.panoramicHeatmap.stopAutoRefresh();
    }
});