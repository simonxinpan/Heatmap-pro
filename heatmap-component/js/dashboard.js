// dashboard.js
// 行业仪表盘动态渲染逻辑

class SectorDashboard {
    constructor() {
        this.dashboardData = [];
        this.sortBy = 'market_cap';
        this.displayMode = 'grid';
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardData();
    }

    setupEventListeners() {
        // 排序方式变更
        const sortSelect = document.getElementById('dashboard-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.renderDashboard();
            });
        }

        // 显示模式变更
        const displaySelect = document.getElementById('dashboard-display-mode');
        if (displaySelect) {
            displaySelect.addEventListener('change', (e) => {
                this.displayMode = e.target.value;
                this.updateDisplayMode();
            });
        }
    }

    async loadDashboardData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);

        try {
            const response = await fetch('/api/sector-dashboard');
            const result = await response.json();
            
            if (result.success) {
                this.dashboardData = result.data;
                this.renderDashboard();
            } else {
                throw new Error(result.error || '加载仪表盘数据失败');
            }
        } catch (error) {
            console.error('Dashboard loading error:', error);
            this.showError('加载行业数据失败，请稍后重试');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    renderDashboard() {
        const dashboardGrid = document.getElementById('dashboard-grid');
        if (!dashboardGrid || !this.dashboardData.length) return;

        // 排序数据
        const sortedData = this.sortDashboardData(this.dashboardData, this.sortBy);
        
        // 清空现有内容
        dashboardGrid.innerHTML = '';
        
        // 渲染每个行业卡片
        sortedData.forEach((sector, index) => {
            const cardElement = this.createSectorCard(sector, index);
            dashboardGrid.appendChild(cardElement);
            
            // 异步加载迷你热力图
            this.loadMiniHeatmap(sector.sector_zh, sector.sector_key);
        });
    }

    createSectorCard(sector, index) {
        const card = document.createElement('div');
        card.className = 'industry-card';
        card.setAttribute('data-sector', sector.sector_key);
        
        // 计算涨跌幅样式类
        const changeClass = sector.weighted_avg_change >= 0 ? 'positive' : 'negative';
        const changeSign = sector.weighted_avg_change >= 0 ? '+' : '';
        
        card.innerHTML = `
            <div class="industry-card-header">
                <div class="industry-info">
                    <div class="industry-icon">${sector.sector_icon}</div>
                    <div class="industry-details">
                        <h3 class="industry-name">${sector.sector_zh}</h3>
                        <div class="industry-metrics">
                            <span class="industry-change ${changeClass}">
                                ${changeSign}${sector.weighted_avg_change}%
                            </span>
                            <span class="industry-count">${sector.stock_count}只股票</span>
                        </div>
                    </div>
                </div>
                <button class="industry-expand-btn" onclick="expandSector('${sector.sector_zh}')">
                    <span>🔍</span>
                </button>
            </div>
            
            <div class="industry-mini-heatmap" id="heatmap-${sector.sector_zh}">
                <div class="mini-heatmap-loading">
                    <div class="loading-dots"></div>
                    <p>加载热力图...</p>
                </div>
            </div>
            
            <div class="industry-stats">
                <div class="stat-row">
                    <div class="stat-item">
                        <span class="stat-value">¥${this.formatMarketCap(sector.total_market_cap)}</span>
                        <span class="stat-label">总市值</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${sector.leading_ticker}</span>
                        <span class="stat-label">领涨股</span>
                    </div>
                </div>
                <div class="stat-row">
                    <div class="stat-item">
                        <span class="stat-value">${sector.rising_stocks}</span>
                        <span class="stat-label">上涨</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${sector.falling_stocks}</span>
                        <span class="stat-label">下跌</span>
                    </div>
                </div>
            </div>
        `;
        
        // 添加点击事件
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.industry-expand-btn')) {
                this.navigateToSector(sector.sector_zh);
            }
        });
        
        return card;
    }

    async loadMiniHeatmap(sectorZh, sectorKey) {
        const heatmapContainer = document.getElementById(`heatmap-${sectorZh}`);
        if (!heatmapContainer) return;

        try {
            // 创建iframe来嵌入真实的Vercel热力图
            const iframe = document.createElement('iframe');
            
            // 根据行业名称构建对应的Vercel URL
            let vercelUrl = 'https://heatmap-luutyw2ks-simon-pans-projects.vercel.app/';
            if (sectorZh !== '全部') {
                vercelUrl += `?sector=${encodeURIComponent(sectorZh)}`;
            }
            
            iframe.src = vercelUrl;
            iframe.style.width = '100%';
            iframe.style.height = '120px';
            iframe.style.border = 'none';
            iframe.style.borderRadius = '4px';
            iframe.style.pointerEvents = 'none'; // 禁用iframe内的交互
            iframe.loading = 'lazy';
            
            // 清空容器并添加iframe
            heatmapContainer.innerHTML = '';
            heatmapContainer.appendChild(iframe);
            
            // 添加点击事件到容器
            heatmapContainer.style.cursor = 'pointer';
            heatmapContainer.addEventListener('click', () => {
                // 在新窗口打开完整的热力图
                window.open(vercelUrl, '_blank');
            });
            
            // 添加加载状态
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'mini-loading';
            loadingDiv.textContent = '加载中...';
            loadingDiv.style.position = 'absolute';
            loadingDiv.style.top = '50%';
            loadingDiv.style.left = '50%';
            loadingDiv.style.transform = 'translate(-50%, -50%)';
            loadingDiv.style.fontSize = '12px';
            loadingDiv.style.color = '#666';
            
            heatmapContainer.style.position = 'relative';
            heatmapContainer.appendChild(loadingDiv);
            
            // iframe加载完成后移除加载提示
            iframe.onload = () => {
                if (loadingDiv.parentNode) {
                    loadingDiv.remove();
                }
            };
            
            // 处理加载错误
            iframe.onerror = () => {
                heatmapContainer.innerHTML = `
                    <div class="mini-heatmap-error">
                        <span>⚠️</span>
                        <p>加载失败</p>
                    </div>
                `;
            };
        } catch (error) {
            console.error(`Mini heatmap loading error for ${sectorZh}:`, error);
            heatmapContainer.innerHTML = `
                <div class="mini-heatmap-error">
                    <span>⚠️</span>
                    <p>加载失败</p>
                </div>
            `;
        }
    }

    sortDashboardData(data, sortBy) {
        const sortedData = [...data];
        
        switch (sortBy) {
            case 'market_cap':
                return sortedData.sort((a, b) => b.total_market_cap - a.total_market_cap);
            case 'performance':
                return sortedData.sort((a, b) => b.weighted_avg_change - a.weighted_avg_change);
            case 'volume':
                return sortedData.sort((a, b) => b.volume - a.volume);
            default:
                return sortedData;
        }
    }

    updateDisplayMode() {
        const dashboardGrid = document.getElementById('dashboard-grid');
        if (!dashboardGrid) return;
        
        // 移除现有的显示模式类
        dashboardGrid.classList.remove('grid-mode', 'compact-mode');
        
        // 添加新的显示模式类
        dashboardGrid.classList.add(`${this.displayMode}-mode`);
    }

    formatMarketCap(value) {
        if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}万亿`;
        } else {
            return `${value.toFixed(0)}亿`;
        }
    }

    navigateToSector(sectorZh) {
        // 导航到特定行业页面
        window.location.href = `panoramic-heatmap.html?sector=${encodeURIComponent(sectorZh)}`;
    }

    showLoading(show) {
        const loadingElement = document.getElementById('dashboard-loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const dashboardGrid = document.getElementById('dashboard-grid');
        if (dashboardGrid) {
            dashboardGrid.innerHTML = `
                <div class="dashboard-error">
                    <div class="error-icon">⚠️</div>
                    <h3>加载失败</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-btn">重试</button>
                </div>
            `;
        }
    }

    // 公共方法：刷新仪表盘
    refresh() {
        this.loadDashboardData();
    }
}

// 全局函数：刷新仪表盘
function refreshDashboard() {
    if (window.sectorDashboard) {
        window.sectorDashboard.refresh();
    }
}

// 全局函数：展开行业（兼容现有代码）
function expandSector(sector) {
    window.location.href = `panoramic-heatmap.html?sector=${encodeURIComponent(sector)}`;
}

// 页面加载完成后初始化仪表盘
document.addEventListener('DOMContentLoaded', () => {
    // 只在包含dashboard-grid元素的页面初始化
    if (document.getElementById('dashboard-grid')) {
        window.sectorDashboard = new SectorDashboard();
    }
});