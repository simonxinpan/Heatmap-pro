/**
 * 独立的仪表盘脚本
 * 职责：行业数据获取、iframe嵌入式卡片创建
 * 重构后的简洁版本
 */

class SectorDashboard {
    constructor() {
        this.dashboardData = [];
        this.isLoading = false;
        this.init();
    }

    init() {
        this.loadSectorData();
    }

    // 获取行业聚合数据
    async loadSectorData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);

        try {
            const response = await fetch('/api/sector-dashboard');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                this.dashboardData = result.data;
                this.renderDashboard();
                console.log('行业数据加载成功:', this.dashboardData.length, '个行业');
            } else {
                throw new Error(result.message || '数据格式错误');
            }
        } catch (error) {
            console.error('加载行业数据失败:', error);
            this.showError(`加载失败: ${error.message}`);
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    // 渲染仪表盘
    renderDashboard() {
        const container = document.getElementById('dashboard-container');
        if (!container) {
            console.error('找不到仪表盘容器元素');
            return;
        }

        // 清空容器
        container.innerHTML = '';

        // 循环创建行业卡片
        this.dashboardData.forEach((sector, index) => {
            const sectorCard = this.createSectorCard(sector, index);
            container.appendChild(sectorCard);
        });

        console.log('仪表盘渲染完成，共', this.dashboardData.length, '个行业卡片');
    }

    // 创建行业卡片
    createSectorCard(sector, index) {
        const cardElement = document.createElement('div');
        cardElement.className = 'sector-card';
        cardElement.setAttribute('data-sector', sector.sector_zh);

        // 计算涨跌幅颜色
        const changePercent = parseFloat(sector.avg_change_percent) || 0;
        const changeColor = changePercent >= 0 ? '#00c851' : '#ff4444';
        const changeSign = changePercent >= 0 ? '+' : '';

        // 创建卡片HTML结构
        cardElement.innerHTML = `
            <div class="sector-card-header">
                <h3 class="sector-name">${sector.sector_zh}</h3>
                <div class="sector-stats">
                    <span class="change-percent" style="color: ${changeColor}">
                        ${changeSign}${changePercent.toFixed(2)}%
                    </span>
                    <span class="stock-count">${sector.stock_count || 0}只股票</span>
                </div>
            </div>
            
            <div class="sector-details">
                <div class="detail-item">
                    <span class="label">总市值:</span>
                    <span class="value">${this.formatMarketCap(sector.total_market_cap)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">上涨:</span>
                    <span class="value" style="color: #00c851">${sector.rising_count || 0}只</span>
                </div>
                <div class="detail-item">
                    <span class="label">下跌:</span>
                    <span class="value" style="color: #ff4444">${sector.falling_count || 0}只</span>
                </div>
            </div>
            
            <div class="sector-heatmap-container">
                <iframe 
                    src="/heatmap-viewer.html?sector=${encodeURIComponent(sector.sector_zh)}&embed=true"
                    frameborder="0"
                    width="100%"
                    height="200"
                    loading="lazy"
                    title="${sector.sector_zh}热力图"
                    class="sector-heatmap-iframe">
                </iframe>
            </div>
            
            <div class="sector-card-footer">
                <button class="view-full-btn" onclick="window.open('/heatmap-viewer.html?sector=${encodeURIComponent(sector.sector_zh)}', '_blank')">
                    查看完整热力图
                </button>
            </div>
        `;

        return cardElement;
    }

    // 格式化市值显示
    formatMarketCap(value) {
        if (!value || isNaN(value)) return '暂无数据';
        
        const num = parseFloat(value);
        if (num >= 1e12) {
            return (num / 1e12).toFixed(2) + '万亿';
        } else if (num >= 1e8) {
            return (num / 1e8).toFixed(2) + '亿';
        } else if (num >= 1e4) {
            return (num / 1e4).toFixed(2) + '万';
        } else {
            return num.toFixed(2);
        }
    }

    // 显示加载状态
    showLoading(show) {
        const container = document.getElementById('dashboard-container');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>正在加载行业数据...</p>
                </div>
            `;
            
            // 添加加载动画样式
            this.addLoadingStyles();
        }
    }

    // 显示错误信息
    showError(message) {
        const container = document.getElementById('dashboard-container');
        if (!container) return;

        container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h3>加载失败</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">重新加载</button>
            </div>
        `;
    }

    // 添加加载动画样式
    addLoadingStyles() {
        if (document.getElementById('dashboard-loading-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'dashboard-loading-styles';
        style.textContent = `
            .loading-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 300px;
                color: #666;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 16px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .error-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 300px;
                color: #666;
                text-align: center;
            }
            
            .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .retry-btn {
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 16px;
            }
            
            .retry-btn:hover {
                background: #0056b3;
            }
            
            .sector-card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            .sector-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            
            .sector-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .sector-name {
                margin: 0;
                color: #333;
                font-size: 18px;
            }
            
            .sector-stats {
                display: flex;
                gap: 12px;
                align-items: center;
            }
            
            .change-percent {
                font-weight: bold;
                font-size: 16px;
            }
            
            .stock-count {
                color: #666;
                font-size: 14px;
            }
            
            .sector-details {
                display: flex;
                gap: 16px;
                margin-bottom: 16px;
                flex-wrap: wrap;
            }
            
            .detail-item {
                display: flex;
                gap: 4px;
            }
            
            .detail-item .label {
                color: #666;
                font-size: 14px;
            }
            
            .detail-item .value {
                font-weight: 500;
                font-size: 14px;
            }
            
            .sector-heatmap-container {
                margin: 16px 0;
                border-radius: 4px;
                overflow: hidden;
                background: #f8f9fa;
            }
            
            .sector-heatmap-iframe {
                display: block;
                border: none;
            }
            
            .sector-card-footer {
                text-align: center;
                margin-top: 12px;
            }
            
            .view-full-btn {
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .view-full-btn:hover {
                background: #0056b3;
            }
        `;
        
        document.head.appendChild(style);
    }

    // 刷新数据
    refresh() {
        this.loadSectorData();
    }
}

// 全局刷新函数
function refreshDashboard() {
    if (window.sectorDashboard) {
        window.sectorDashboard.refresh();
    }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('仪表盘脚本初始化开始');
    window.sectorDashboard = new SectorDashboard();
    console.log('仪表盘脚本初始化完成');
});

// 导出供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SectorDashboard;
}