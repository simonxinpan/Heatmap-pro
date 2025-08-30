/**
 * 可移植股票热力图组件
 * 独立的、可在任何项目中使用的热力图组件
 */
class StockHeatmap {
    constructor(container, stockData = [], options = {}) {
        this.container = container;
        this.data = stockData;
        this.options = {
            metric: 'changePercent', // 支持 changePercent, volume, marketCap
            category: 'market', // market, sector, tag, trending
            interactive: true,
            showTooltip: true,
            colorScheme: 'default',
            onStockClick: null,
            ...options
        };
        this.tooltip = null;
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.createStyles();
        if (this.options.showTooltip) {
            this.createTooltip();
        }
    }

    /**
     * 渲染热力图
     */
    render(data) {
        if (data) {
            this.data = data;
        }
        
        if (!this.data || !this.data.length) {
            this.showEmptyState();
            return;
        }

        // 清空容器
        this.container.innerHTML = '';
        
        // 创建热力图容器
        const heatmapWrapper = document.createElement('div');
        heatmapWrapper.className = 'heatmap-wrapper';
        
        // 创建股票块
        this.data.forEach(stock => {
            const stockBlock = this.createStockBlock(stock);
            heatmapWrapper.appendChild(stockBlock);
        });
        
        this.container.appendChild(heatmapWrapper);
    }

    /**
     * 创建股票块
     */
    createStockBlock(stock) {
        const block = document.createElement('div');
        block.className = 'stock-block';
        
        // 获取指标值
        const metricValue = this.getMetricValue(stock);
        
        // 计算颜色
        const color = this.getColor(metricValue);
        block.style.backgroundColor = color;
        
        // 计算大小（基于市值或成交量）
        const size = this.getSize(stock);
        block.style.width = `${size}px`;
        block.style.height = `${size}px`;
        
        // 添加内容
        const symbol = document.createElement('div');
        symbol.className = 'stock-symbol';
        symbol.textContent = stock.symbol || stock.ticker || stock.code;
        
        const change = document.createElement('div');
        change.className = 'stock-change';
        change.textContent = this.formatMetricValue(metricValue);
        
        block.appendChild(symbol);
        block.appendChild(change);
        
        // 添加交互事件
        if (this.options.interactive) {
            this.addInteractivity(block, stock);
        }
        
        return block;
    }

    /**
     * 获取指标值
     */
    getMetricValue(stock) {
        const metric = this.options.metric;
        
        // 支持多种字段名格式
        if (metric === 'changePercent') {
            return stock.changePercent || stock.change_percent || stock.changePct || 0;
        }
        if (metric === 'volume') {
            return stock.volume || stock.vol || 0;
        }
        if (metric === 'marketCap') {
            return stock.marketCap || stock.market_cap || stock.cap || 0;
        }
        
        return stock[metric] || 0;
    }

    /**
     * 格式化指标值显示
     */
    formatMetricValue(value) {
        const metric = this.options.metric;
        
        if (metric === 'changePercent') {
            return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
        }
        if (metric === 'volume') {
            if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
            }
            if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}K`;
            }
            return value.toString();
        }
        if (metric === 'marketCap') {
            if (value >= 1000000000000) {
                return `${(value / 1000000000000).toFixed(1)}T`;
            }
            if (value >= 1000000000) {
                return `${(value / 1000000000).toFixed(1)}B`;
            }
            if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
            }
            return value.toString();
        }
        
        return value.toFixed(2);
    }

    /**
     * 根据指标值获取颜色
     */
    getColor(value) {
        const metric = this.options.metric;
        
        if (metric === 'changePercent') {
            if (value > 5) return '#00C851'; // 深绿
            if (value > 2) return '#4CAF50'; // 绿
            if (value > 0) return '#8BC34A'; // 浅绿
            if (value > -2) return '#FFC107'; // 黄
            if (value > -5) return '#FF9800'; // 橙
            return '#F44336'; // 红
        }
        
        // 对于成交量和市值，使用蓝色系
        if (metric === 'volume' || metric === 'marketCap') {
            const intensity = Math.min(1, Math.log(value + 1) / 20);
            const blue = Math.floor(255 * (0.3 + 0.7 * intensity));
            return `rgb(0, 100, ${blue})`;
        }
        
        return '#666';
    }

    /**
     * 根据数据计算大小
     */
    getSize(stock) {
        const minSize = 60;
        const maxSize = 120;
        
        // 优先使用市值，其次成交量
        let sizeValue = stock.marketCap || stock.market_cap || stock.volume || stock.vol || 1000000000;
        
        const minValue = 1000000000; // 10亿
        const maxValue = 3000000000000; // 3万亿
        
        const ratio = Math.log(sizeValue - minValue + 1) / Math.log(maxValue - minValue + 1);
        return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * ratio));
    }

    /**
     * 添加交互功能
     */
    addInteractivity(block, stock) {
        block.addEventListener('mouseenter', (e) => {
            if (this.tooltip) {
                this.showTooltip(e, stock);
            }
            block.style.transform = 'scale(1.05)';
            block.style.zIndex = '10';
        });
        
        block.addEventListener('mouseleave', () => {
            if (this.tooltip) {
                this.hideTooltip();
            }
            block.style.transform = 'scale(1)';
            block.style.zIndex = '1';
        });
        
        block.addEventListener('click', () => {
            this.onStockClick(stock);
        });
    }

    /**
     * 创建工具提示
     */
    createTooltip() {
        if (document.getElementById('heatmap-tooltip')) {
            this.tooltip = document.getElementById('heatmap-tooltip');
            return;
        }
        
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'heatmap-tooltip';
        this.tooltip.className = 'heatmap-tooltip';
        document.body.appendChild(this.tooltip);
    }

    /**
     * 显示工具提示
     */
    showTooltip(event, stock) {
        if (!this.tooltip) return;
        
        const changeValue = this.getMetricValue(stock);
        const stockName = stock.name || stock.name_zh || stock.companyName || stock.symbol;
        const stockPrice = stock.price || stock.close || stock.last || 0;
        const marketCap = stock.marketCap || stock.market_cap || 0;
        
        this.tooltip.innerHTML = `
            <div><strong>${stock.symbol || stock.ticker}</strong></div>
            <div>${stockName}</div>
            <div>价格: $${stockPrice.toFixed(2)}</div>
            <div>变化: ${this.formatMetricValue(changeValue)}</div>
            <div>市值: $${(marketCap / 1000000000).toFixed(1)}B</div>
        `;
        
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = event.pageX + 10 + 'px';
        this.tooltip.style.top = event.pageY - 10 + 'px';
    }

    /**
     * 隐藏工具提示
     */
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }

    /**
     * 股票点击事件
     */
    onStockClick(stock) {
        console.log('Stock clicked:', stock);
        if (this.options.onStockClick) {
            this.options.onStockClick(stock);
        }
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        this.container.innerHTML = `
            <div class="heatmap-empty">
                <div class="empty-icon">📊</div>
                <div class="empty-text">暂无数据</div>
            </div>
        `;
    }

    /**
     * 创建样式
     */
    createStyles() {
        if (document.getElementById('heatmap-component-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'heatmap-component-styles';
        style.textContent = `
            .heatmap-wrapper {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                padding: 10px;
                justify-content: flex-start;
                align-items: flex-start;
            }
            
            .stock-block {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                border-radius: 4px;
                cursor: pointer;
                transition: transform 0.2s ease;
                position: relative;
                min-width: 60px;
                min-height: 60px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            }
            
            .stock-symbol {
                font-weight: bold;
                font-size: 11px;
                color: white;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
                margin-bottom: 2px;
            }
            
            .stock-change {
                font-size: 9px;
                color: white;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
            }
            
            .heatmap-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: #666;
            }
            
            .empty-icon {
                font-size: 48px;
                margin-bottom: 10px;
            }
            
            .empty-text {
                font-size: 16px;
            }
            
            .heatmap-tooltip {
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 10px;
                border-radius: 6px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                display: none;
                max-width: 200px;
            }
            
            @media (max-width: 768px) {
                .heatmap-wrapper {
                    gap: 2px;
                    padding: 5px;
                }
                
                .stock-block {
                    min-width: 50px;
                    min-height: 50px;
                }
                
                .stock-symbol {
                    font-size: 10px;
                }
                
                .stock-change {
                    font-size: 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 销毁组件
     */
    destroy() {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
        this.container.innerHTML = '';
    }
}

// 如果在Node.js环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockHeatmap;
}

// 如果在浏览器环境中，添加到全局对象
if (typeof window !== 'undefined') {
    window.StockHeatmap = StockHeatmap;
}