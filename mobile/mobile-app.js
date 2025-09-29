// 移动版美股数据应用 - 主JavaScript文件

class MobileStockApp {
    constructor() {
        this.currentPage = 'tagsPage';
        this.currentMarket = 'sp500';
        this.apiBaseUrl = '/api';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.setupTouchGestures();
        this.setupPerformanceOptimization();
        
        // 初始化热力图模块
        this.initializeHeatmap();
    }

    /**
     * 初始化热力图模块
     */
    initializeHeatmap() {
        // 动态加载热力图模块
        if (typeof MobileHeatmap !== 'undefined') {
            this.heatmapModule = new MobileHeatmap();
        } else {
            // 如果模块未加载，延迟初始化
            setTimeout(() => {
                if (typeof MobileHeatmap !== 'undefined') {
                    this.heatmapModule = new MobileHeatmap();
                }
            }, 100);
        }
        
        // 监听热力图事件
        window.addEventListener('showStockDetail', (e) => {
            this.openStockDetail(e.detail.symbol);
        });
        
        window.addEventListener('showToast', (e) => {
            this.showToast(e.detail.message);
        });
    }

    setupEventListeners() {
        // 底部导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetPage = e.currentTarget.dataset.page;
                this.navigateToPage(targetPage);
            });
        });

        // 刷新按钮
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshCurrentPage();
        });

        // 返回按钮
        document.getElementById('backBtn').addEventListener('click', () => {
            this.navigateToPage('tagsPage');
        });

        // 市场切换Tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const market = e.currentTarget.dataset.market;
                this.switchMarket(market);
            });
        });

        // 下拉刷新
        this.setupPullToRefresh();
    }

    setupTouchGestures() {
        let startY = 0;
        let startX = 0;
        
        document.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const endX = e.changedTouches[0].clientX;
            const deltaY = endY - startY;
            const deltaX = endX - startX;

            // 左右滑动切换页面
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.swipeRight();
                } else {
                    this.swipeLeft();
                }
            }
        }, { passive: true });
    }

    setupPullToRefresh() {
        let startY = 0;
        let isPulling = false;
        
        document.querySelectorAll('.page').forEach(page => {
            page.addEventListener('touchstart', (e) => {
                if (page.scrollTop === 0) {
                    startY = e.touches[0].clientY;
                    isPulling = true;
                }
            }, { passive: true });

            page.addEventListener('touchmove', (e) => {
                if (isPulling && page.scrollTop === 0) {
                    const currentY = e.touches[0].clientY;
                    const pullDistance = currentY - startY;
                    
                    if (pullDistance > 80) {
                        this.showToast('释放刷新');
                    }
                }
            }, { passive: true });

            page.addEventListener('touchend', (e) => {
                if (isPulling) {
                    const endY = e.changedTouches[0].clientY;
                    const pullDistance = endY - startY;
                    
                    if (pullDistance > 80) {
                        this.refreshCurrentPage();
                    }
                    isPulling = false;
                }
            }, { passive: true });
        });
    }

    setupPerformanceOptimization() {
        // 虚拟滚动优化
        this.setupVirtualScrolling();
        
        // 图片懒加载
        this.setupLazyLoading();
        
        // 防抖处理
        this.debounce = (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };
    }

    navigateToPage(pageId) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });

        // 显示目标页面
        document.getElementById(pageId).classList.remove('hidden');

        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

        this.currentPage = pageId;
        
        // 加载页面数据
        this.loadPageData(pageId);
    }

    swipeLeft() {
        const pages = ['tagsPage', 'rankingPage', 'heatmapPage'];
        const currentIndex = pages.indexOf(this.currentPage);
        if (currentIndex < pages.length - 1) {
            this.navigateToPage(pages[currentIndex + 1]);
        }
    }

    swipeRight() {
        const pages = ['tagsPage', 'rankingPage', 'heatmapPage'];
        const currentIndex = pages.indexOf(this.currentPage);
        if (currentIndex > 0) {
            this.navigateToPage(pages[currentIndex - 1]);
        }
    }

    async loadInitialData() {
        this.showLoading();
        try {
            await this.loadTagsData();
        } catch (error) {
            this.handleError('加载数据失败', error);
        } finally {
            this.hideLoading();
        }
    }

    async loadPageData(pageId) {
        switch (pageId) {
            case 'tagsPage':
                await this.loadTagsData();
                break;
            case 'rankingPage':
                await this.loadRankingData();
                break;
            case 'heatmapPage':
                await this.loadHeatmapData();
                break;
        }
    }

    async loadTagsData() {
        const cacheKey = 'tags';
        const cachedData = this.getFromCache(cacheKey);
        
        if (cachedData) {
            this.renderTags(cachedData);
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/sector-aggregation`);
            const data = await response.json();
            
            if (data.success) {
                this.setCache(cacheKey, data.result);
                this.renderTags(data.result);
            } else {
                throw new Error(data.error || '获取标签数据失败');
            }
        } catch (error) {
            this.handleError('加载标签失败', error);
            this.renderTags(this.getMockTagsData());
        }
    }

    renderTags(data) {
        const container = document.getElementById('tagsGrid');
        container.innerHTML = '';

        const tags = [
            { name: '涨幅榜', count: data.gainers?.length || 0, category: 'gainers' },
            { name: '跌幅榜', count: data.losers?.length || 0, category: 'losers' },
            { name: '成交量榜', count: data.volume?.length || 0, category: 'volume' },
            { name: '市值榜', count: data.marketCap?.length || 0, category: 'marketCap' },
            { name: '科技股', count: data.technology?.length || 0, category: 'technology' },
            { name: '金融股', count: data.financial?.length || 0, category: 'financial' },
            { name: '医疗股', count: data.healthcare?.length || 0, category: 'healthcare' },
            { name: '中概股', count: data.chinese?.length || 0, category: 'chinese' }
        ];

        tags.forEach(tag => {
            const card = this.createTagCard(tag);
            container.appendChild(card);
        });
    }

    createTagCard(tag) {
        const card = document.createElement('div');
        card.className = 'tag-card';
        card.innerHTML = `
            <div class="tag-card-title">${tag.name}</div>
            <div class="tag-card-info">
                <span class="tag-card-count">${tag.count} 只股票</span>
                <div class="tag-card-status"></div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            this.openTagDetail(tag.category);
        });
        
        return card;
    }

    async loadRankingData() {
        const cacheKey = `ranking_${this.currentMarket}`;
        const cachedData = this.getFromCache(cacheKey);
        
        if (cachedData) {
            this.renderRanking(cachedData);
            return;
        }

        try {
            const endpoint = this.currentMarket === 'sp500' ? '/stocks' : '/stocks?filter=chinese';
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`);
            const data = await response.json();
            
            if (data.success) {
                this.setCache(cacheKey, data.result);
                this.renderRanking(data.result);
            } else {
                throw new Error(data.error || '获取榜单数据失败');
            }
        } catch (error) {
            this.handleError('加载榜单失败', error);
            this.renderRanking(this.getMockRankingData());
        }
    }

    renderRanking(data) {
        const container = document.getElementById('rankingList');
        container.innerHTML = '';

        data.slice(0, 50).forEach((stock, index) => {
            const item = this.createRankingItem(stock, index + 1);
            container.appendChild(item);
        });
    }

    createRankingItem(stock, rank) {
        const item = document.createElement('div');
        item.className = 'ranking-item';
        
        const changePercent = ((stock.current_price - stock.previous_close) / stock.previous_close * 100).toFixed(2);
        const changeClass = changePercent >= 0 ? 'positive' : 'negative';
        const changeSign = changePercent >= 0 ? '+' : '';
        
        item.innerHTML = `
            <div class="ranking-item-top">
                <div class="ranking-item-left">
                    <div class="ranking-number ${rank <= 3 ? 'top3' : ''}">${rank}</div>
                    <div>
                        <div class="ranking-name">${stock.company_name_cn || stock.symbol}</div>
                        <div class="ranking-market-cap">${this.formatMarketCap(stock.market_cap)}</div>
                    </div>
                </div>
            </div>
            <div class="ranking-item-bottom">
                <div class="ranking-price">$${stock.current_price.toFixed(2)}</div>
                <div class="ranking-change ${changeClass}">${changeSign}${changePercent}%</div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            this.openStockDetail(stock.symbol);
        });
        
        return item;
    }

    async loadHeatmapData() {
        const cacheKey = 'heatmap';
        const cachedData = this.getFromCache(cacheKey);
        
        if (cachedData) {
            this.renderHeatmap(cachedData);
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/stocks?limit=50`);
            const data = await response.json();
            
            if (data.success) {
                this.setCache(cacheKey, data.result);
                this.renderHeatmap(data.result);
            } else {
                throw new Error(data.error || '获取热力图数据失败');
            }
        } catch (error) {
            this.handleError('加载热力图失败', error);
            this.renderHeatmap(this.getMockHeatmapData());
        }
    }

    renderHeatmap(data) {
        const container = document.getElementById('heatmapCanvas');
        container.innerHTML = '';
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 简化的热力图布局算法
        const blocks = this.calculateHeatmapLayout(data, containerWidth, containerHeight);
        
        blocks.forEach(block => {
            const element = this.createHeatmapBlock(block);
            container.appendChild(element);
        });
    }

    calculateHeatmapLayout(data, width, height) {
        const blocks = [];
        const cols = Math.floor(width / 80);
        const rows = Math.ceil(data.length / cols);
        const blockWidth = width / cols;
        const blockHeight = height / rows;
        
        data.forEach((stock, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            blocks.push({
                ...stock,
                x: col * blockWidth,
                y: row * blockHeight,
                width: blockWidth - 2,
                height: blockHeight - 2
            });
        });
        
        return blocks;
    }

    createHeatmapBlock(block) {
        const element = document.createElement('div');
        element.className = 'heatmap-block';
        
        const changePercent = ((block.current_price - block.previous_close) / block.previous_close * 100);
        const intensity = Math.min(Math.abs(changePercent) / 5, 1);
        const color = changePercent >= 0 
            ? `rgba(245, 34, 45, ${intensity})` 
            : `rgba(82, 196, 26, ${intensity})`;
        
        element.style.cssText = `
            left: ${block.x}px;
            top: ${block.y}px;
            width: ${block.width}px;
            height: ${block.height}px;
            background-color: ${color};
        `;
        
        element.innerHTML = `
            <div class="heatmap-block-symbol">${block.symbol}</div>
            <div class="heatmap-block-change">${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%</div>
        `;
        
        element.addEventListener('click', () => {
            this.openStockDetail(block.symbol);
        });
        
        return element;
    }

    switchMarket(market) {
        this.currentMarket = market;
        
        // 更新Tab状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-market="${market}"]`).classList.add('active');
        
        // 重新加载数据
        this.loadRankingData();
    }

    openTagDetail(category) {
        // 这里可以跳转到标签详情页或显示模态框
        this.showToast(`打开${category}分类`);
    }

    openStockDetail(symbol) {
        // 跳转到移动版个股详情页
        window.open(`https://stock-details-final.vercel.app/mobile.html?symbol=${symbol}`, '_blank');
    }

    async loadStockDetail(symbol) {
        const container = document.getElementById('stockDetailContent');
        container.innerHTML = '<div class="detail-section">加载中...</div>';
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/stocks?symbol=${symbol}`);
            const data = await response.json();
            
            if (data.success && data.result.length > 0) {
                this.renderStockDetail(data.result[0]);
            } else {
                throw new Error('股票数据不存在');
            }
        } catch (error) {
            this.handleError('加载股票详情失败', error);
            container.innerHTML = '<div class="detail-section">加载失败，请重试</div>';
        }
    }

    renderStockDetail(stock) {
        const container = document.getElementById('stockDetailContent');
        const changePercent = ((stock.current_price - stock.previous_close) / stock.previous_close * 100).toFixed(2);
        const changeClass = changePercent >= 0 ? 'positive' : 'negative';
        
        container.innerHTML = `
            <div class="detail-section">
                <h3 class="detail-section-title">价格信息</h3>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 24px; font-weight: 600;">$${stock.current_price.toFixed(2)}</div>
                        <div class="ranking-change ${changeClass}">${changePercent >= 0 ? '+' : ''}${changePercent}%</div>
                    </div>
                    <div style="text-align: right; color: #8C8C8C;">
                        <div>昨收: $${stock.previous_close.toFixed(2)}</div>
                        <div>市值: ${this.formatMarketCap(stock.market_cap)}</div>
                    </div>
                </div>
            </div>
            <div class="detail-section">
                <h3 class="detail-section-title">公司信息</h3>
                <div>
                    <div><strong>公司名称:</strong> ${stock.company_name_cn || stock.company_name}</div>
                    <div><strong>股票代码:</strong> ${stock.symbol}</div>
                    <div><strong>所属行业:</strong> ${stock.sector || '未知'}</div>
                </div>
            </div>
        `;
    }

    refreshCurrentPage() {
        this.clearCache();
        this.showToast('刷新中...');
        this.loadPageData(this.currentPage);
    }

    // 缓存管理
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    // 工具方法
    formatMarketCap(marketCap) {
        if (!marketCap) return '未知';
        const billion = marketCap / 1000000000;
        return `${billion.toFixed(1)}B`;
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }

    handleError(message, error) {
        console.error(message, error);
        this.showToast(message);
    }

    // 模拟数据
    getMockTagsData() {
        return {
            gainers: new Array(20).fill(null),
            losers: new Array(20).fill(null),
            volume: new Array(20).fill(null),
            marketCap: new Array(20).fill(null),
            technology: new Array(15).fill(null),
            financial: new Array(12).fill(null),
            healthcare: new Array(10).fill(null),
            chinese: new Array(25).fill(null)
        };
    }

    getMockRankingData() {
        return new Array(50).fill(null).map((_, index) => ({
            symbol: `MOCK${index + 1}`,
            company_name_cn: `模拟公司${index + 1}`,
            current_price: 100 + Math.random() * 500,
            previous_close: 100 + Math.random() * 500,
            market_cap: (Math.random() * 1000 + 100) * 1000000000
        }));
    }

    getMockHeatmapData() {
        return this.getMockRankingData().slice(0, 30);
    }

    setupVirtualScrolling() {
        // 虚拟滚动实现（简化版）
        // 在实际项目中可以使用更完善的虚拟滚动库
    }

    setupLazyLoading() {
        // 图片懒加载实现
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MobileStockApp();
});

// PWA支持
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}