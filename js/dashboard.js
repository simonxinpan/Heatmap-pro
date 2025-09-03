// dashboard.js
// 行业仪表盘动态渲染逻辑

class SectorDashboard {
    constructor() {
        this.dashboardData = [];
        this.sortBy = 'market_cap';
        this.displayMode = 'grid';
        this.isLoading = false;
        
        // 行业图片映射 - 使用英文文件名避免编码问题
        this.sectorImageMap = {
            '信息技术': 'technology.png',
            '工业': 'industrial.png',
            '金融': 'financial.png',
            '医疗保健': 'healthcare.png',
            '非必需消费品': 'consumer.png',
            '日常消费品': 'consumer-staples.png',
            '公用事业': 'utilities.png',
            '房地产': 'real-estate.png',
            '原材料': 'materials.png',
            '能源': 'energy.png',
            '半导体': 'semiconductor.png',
            '媒体娱乐': 'media.png',
            '通讯服务': 'communication.png',
            '金融服务': 'financial-services.png'
        };
        
        this.init();
        this.addMiniHeatmapStyles();
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
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
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
            
            // 注意：迷你热力图现在通过iframe嵌入，无需额外加载
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
                <button class="industry-expand-btn" onclick="viewSectorDetail('${sector.sector_zh}', '${sector.sector_key}')">
                    <span>🔍</span>
                    <span class="expand-text">查看详情</span>
                </button>
            </div>
            
            <div class="mini-heatmap-container">
                <div id="mini-heatmap-${sector.sector_key}" class="mini-heatmap-canvas" style="width: 100%; height: 150px; border-radius: 8px; background: #f8f9fa; position: relative; cursor: pointer;" onclick="window.open('/panoramic-heatmap.html?sector=${encodeURIComponent(sector.sector_zh)}', '_blank')">
                    <div class="mini-heatmap-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #666; font-size: 14px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 16px; height: 16px; border: 2px solid #ddd; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            加载中...
                        </div>
                    </div>
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
            if (!e.target.closest('.industry-expand-btn') && !e.target.closest('.mini-heatmap-container')) {
                this.navigateToSector(sector.sector_zh);
            }
        });
        
        // 异步加载迷你热力图
        setTimeout(() => {
            this.loadAndRenderMiniHeatmap(sector.sector_key, sector.sector_zh);
        }, 100 * index); // 错开加载时间，避免同时请求过多
        
        return card;
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
        // 行业名称到Vercel热力图链接的映射表
        const sectorUrlMap = {
            '信息技术': 'https://heatmap-pro.vercel.app/?sector=%E4%BF%A1%E6%81%AF%E6%8A%80%E6%9C%AF',
            '工业': 'https://heatmap-pro.vercel.app/?sector=%E5%B7%A5%E4%B8%9A',
            '金融': 'https://heatmap-pro.vercel.app/?sector=%E9%87%91%E8%9E%8D',
            '医疗保健': 'https://heatmap-pro.vercel.app/?sector=%E5%8C%BB%E7%96%97%E4%BF%9D%E5%81%A5',
            '非必需消费品': 'https://heatmap-pro.vercel.app/?sector=%E9%9D%9E%E5%BF%85%E9%9C%80%E6%B6%88%E8%B4%B9%E5%93%81',
            '日常消费品': 'https://heatmap-pro.vercel.app/?sector=%E6%97%A5%E5%B8%B8%E6%B6%88%E8%B4%B9%E5%93%81',
            '公用事业': 'https://heatmap-pro.vercel.app/?sector=%E5%85%AC%E7%94%A8%E4%BA%8B%E4%B8%9A',
            '房地产': 'https://heatmap-pro.vercel.app/?sector=%E6%88%BF%E5%9C%B0%E4%BA%A7',
            '原材料': 'https://heatmap-pro.vercel.app/?sector=%E5%8E%9F%E6%9D%90%E6%96%99',
            '能源': 'https://heatmap-pro.vercel.app/?sector=%E8%83%BD%E6%BA%90',
            '半导体': 'https://heatmap-pro.vercel.app/?sector=%E5%8D%8A%E5%AF%BC%E4%BD%93',
            '媒体娱乐': 'https://heatmap-pro.vercel.app/?sector=%E5%AA%92%E4%BD%93%E5%A8%B1%E4%B9%90',
            '通讯服务': 'https://heatmap-pro.vercel.app/?sector=%E9%80%9A%E8%AE%AF%E6%9C%8D%E5%8A%A1'
        };
        
        // 获取对应的Vercel链接
        const vercelUrl = sectorUrlMap[sectorZh];
        
        if (vercelUrl) {
            // 在新窗口打开Vercel热力图页面
            window.open(vercelUrl, '_blank');
        } else {
            // 如果没有找到对应链接，回退到本地页面
            console.warn(`未找到行业 "${sectorZh}" 的Vercel链接，回退到本地页面`);
            window.location.href = `panoramic-heatmap.html?sector=${encodeURIComponent(sectorZh)}`;
        }
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
    
    getSectorImageFile(sectorZh) {
        return this.sectorImageMap[sectorZh] || 'default.png';
    }

    /**
     * 异步加载并渲染迷你热力图
     * @param {string} sectorKey - 行业英文键名
     * @param {string} sectorName - 行业中文名称
     */
    async loadAndRenderMiniHeatmap(sectorKey, sectorName) {
        try {
            // 1. 获取该行业的股票数据
            const response = await fetch(`/api/stocks-simple?sector=${encodeURIComponent(sectorName)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const stockData = await response.json();
            
            if (!stockData || !Array.isArray(stockData) || stockData.length === 0) {
                this.showMiniHeatmapError(sectorKey, '暂无数据');
                return;
            }
            
            // 2. 找到对应的迷你热力图容器
            const containerElement = document.getElementById(`mini-heatmap-${sectorKey}`);
            if (!containerElement) {
                console.warn(`Mini heatmap container not found for sector: ${sectorKey}`);
                return;
            }
            
            // 3. 清除加载状态
            containerElement.innerHTML = '';
            
            // 4. 创建迷你热力图配置
            const miniHeatmapOptions = {
                width: containerElement.offsetWidth || 300,
                height: 150,
                showControls: false,
                showLegend: false,
                showTooltip: false,
                interactive: false,
                metric: 'change_percent'
            };
            
            // 5. 实例化热力图组件
            const miniHeatmap = new StockHeatmap(containerElement, miniHeatmapOptions);
            
            // 6. 渲染迷你热力图（传入isMini=true）
            miniHeatmap.render(stockData, sectorName, true);
            
        } catch (error) {
            console.error(`Failed to load mini heatmap for ${sectorName}:`, error);
            this.showMiniHeatmapError(sectorKey, '加载失败');
        }
    }

    /**
     * 显示迷你热力图错误状态
     * @param {string} sectorKey - 行业键名
     * @param {string} message - 错误信息
     */
    showMiniHeatmapError(sectorKey, message) {
        const containerElement = document.getElementById(`mini-heatmap-${sectorKey}`);
        if (containerElement) {
            containerElement.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #999; font-size: 14px; text-align: center;">
                    <div style="margin-bottom: 4px;">⚠️</div>
                    <div>${message}</div>
                </div>
            `;
        }
    }

    /**
     * 添加迷你热力图相关样式
     */
    addMiniHeatmapStyles() {
        if (document.querySelector('#mini-heatmap-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'mini-heatmap-styles';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .mini-heatmap-canvas {
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            
            .mini-heatmap-canvas:hover {
                transform: scale(1.02);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
        `;
        document.head.appendChild(style);
    }
}

// 全局函数：刷新仪表盘
function refreshDashboard() {
    if (window.sectorDashboard) {
        window.sectorDashboard.refresh();
    }
}

// 全局函数：查看行业详情（新的实现）
function viewSectorDetail(sectorZh, sectorKey) {
    // 打开标签详情页面，不带embed参数，在新标签页中打开
    const detailUrl = `tag-detail.html?tagId=sector_${sectorKey}`;
    window.open(detailUrl, '_blank');
}

// 全局函数：展开行业（兼容现有代码）
function expandSector(sector) {
    // 行业名称到Vercel热力图链接的映射表
    const sectorUrlMap = {
        '信息技术': 'https://heatmap-pro.vercel.app/?sector=%E4%BF%A1%E6%81%AF%E6%8A%80%E6%9C%AF',
        '工业': 'https://heatmap-pro.vercel.app/?sector=%E5%B7%A5%E4%B8%9A',
        '金融': 'https://heatmap-pro.vercel.app/?sector=%E9%87%91%E8%9E%8D',
        '医疗保健': 'https://heatmap-pro.vercel.app/?sector=%E5%8C%BB%E7%96%97%E4%BF%9D%E5%81%A5',
        '非必需消费品': 'https://heatmap-pro.vercel.app/?sector=%E9%9D%9E%E5%BF%85%E9%9C%80%E6%B6%88%E8%B4%B9%E5%93%81',
        '日常消费品': 'https://heatmap-pro.vercel.app/?sector=%E6%97%A5%E5%B8%B8%E6%B6%88%E8%B4%B9%E5%93%81',
        '公用事业': 'https://heatmap-pro.vercel.app/?sector=%E5%85%AC%E7%94%A8%E4%BA%8B%E4%B8%9A',
        '房地产': 'https://heatmap-pro.vercel.app/?sector=%E6%88%BF%E5%9C%B0%E4%BA%A7',
        '原材料': 'https://heatmap-pro.vercel.app/?sector=%E5%8E%9F%E6%9D%90%E6%96%99',
        '能源': 'https://heatmap-pro.vercel.app/?sector=%E8%83%BD%E6%BA%90',
        '半导体': 'https://heatmap-pro.vercel.app/?sector=%E5%8D%8A%E5%AF%BC%E4%BD%93',
        '媒体娱乐': 'https://heatmap-pro.vercel.app/?sector=%E5%AA%92%E4%BD%93%E5%A8%B1%E4%B9%90',
        '通讯服务': 'https://heatmap-pro.vercel.app/?sector=%E9%80%9A%E8%AE%AF%E6%9C%8D%E5%8A%A1'
    };
    
    // 获取对应的Vercel链接
    const vercelUrl = sectorUrlMap[sector];
    
    if (vercelUrl) {
        // 在新窗口打开Vercel热力图页面
        window.open(vercelUrl, '_blank');
    } else {
        // 如果没有找到对应链接，回退到本地页面
        console.warn(`未找到行业 "${sector}" 的Vercel链接，回退到本地页面`);
        window.location.href = `panoramic-heatmap.html?sector=${encodeURIComponent(sector)}`;
    }
}

// 页面加载完成后初始化仪表盘
document.addEventListener('DOMContentLoaded', () => {
    // 只在包含dashboard-grid元素的页面初始化
    if (document.getElementById('dashboard-grid')) {
        window.sectorDashboard = new SectorDashboard();
    }
});