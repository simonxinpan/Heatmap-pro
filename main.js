// 股票热力图 Pro - 主脚本
// 负责初始化热力图组件，获取数据并设置交互

class HeatmapProApp {
    constructor() {
        this.heatmap = null;
        this.apiBaseUrl = 'http://localhost:3000/api'; // 本地API地址
        this.tagExplorerUrl = 'http://localhost:3000'; // 标签广场应用地址
        this.init();
    }

    async init() {
        try {
            console.log('初始化股票热力图 Pro...');
            
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initHeatmap());
            } else {
                this.initHeatmap();
            }
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('应用初始化失败，请刷新页面重试');
        }
    }

    async initHeatmap() {
        try {
            const container = document.getElementById('stock-heatmap');
            if (!container) {
                throw new Error('找不到热力图容器');
            }

            // 创建热力图实例
            this.heatmap = new StockHeatmap(container, {
                width: container.offsetWidth || 1200,
                height: 600,
                apiUrl: `${this.apiBaseUrl}/stocks-simple`,
                category: 'market', // 默认显示市场概览
                metric: 'change_percent', // 默认显示涨跌幅
                timeRange: '1d', // 默认显示日线数据
                autoRefresh: true,
                refreshInterval: 30000, // 30秒自动刷新
                enableFullscreen: true,
                enableExport: true,
                onCellClick: (data) => {
                    this.handleStockClick(data);
                }
            });

            // 热力图在构造函数中已自动初始化
            // await this.heatmap.init(); // 不需要手动调用init
            
            console.log('热力图初始化完成');
            
            // 设置窗口大小调整事件
            window.addEventListener('resize', () => {
                if (this.heatmap) {
                    this.heatmap.resize();
                }
            });
            
        } catch (error) {
            console.error('热力图初始化失败:', error);
            this.showError('热力图加载失败，请检查网络连接');
        }
    }

    handleStockClick(stockData) {
        try {
            console.log('股票点击事件:', stockData);
            
            if (stockData && stockData.symbol) {
                // 构建跳转URL - 跳转到标签广场应用的股票详情页
                const detailUrl = `${this.tagExplorerUrl}/stock-detail.html?symbol=${encodeURIComponent(stockData.symbol)}`;
                
                // 在新标签页中打开
                window.open(detailUrl, '_blank');
                
                // 可选：显示提示信息
                this.showTooltip(`正在跳转到 ${stockData.symbol} 详情页...`);
            }
        } catch (error) {
            console.error('处理股票点击事件失败:', error);
        }
    }

    showError(message) {
        const container = document.getElementById('stock-heatmap');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3> 错误</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()">重新加载</button>
                </div>
            `;
        }
    }

    showTooltip(message) {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.textContent = message;
            tooltip.style.display = 'block';
            tooltip.style.opacity = '1';
            
            // 3秒后隐藏
            setTimeout(() => {
                tooltip.style.opacity = '0';
                setTimeout(() => {
                    tooltip.style.display = 'none';
                }, 300);
            }, 3000);
        }
    }

    // 公共方法：手动刷新数据
    refresh() {
        if (this.heatmap) {
            this.heatmap.refresh();
        }
    }

    // 公共方法：切换全屏
    toggleFullscreen() {
        if (this.heatmap) {
            this.heatmap.toggleFullscreen();
        }
    }

    // 公共方法：导出图片
    exportImage() {
        if (this.heatmap) {
            this.heatmap.exportImage();
        }
    }

    // 销毁实例
    destroy() {
        if (this.heatmap) {
            this.heatmap.destroy();
            this.heatmap = null;
        }
    }
}

// 全局实例
let heatmapApp;

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        heatmapApp = new HeatmapProApp();
    });
} else {
    heatmapApp = new HeatmapProApp();
}

// 导出到全局作用域，便于调试和外部调用
window.heatmapApp = heatmapApp;

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (heatmapApp) {
        heatmapApp.destroy();
    }
});

