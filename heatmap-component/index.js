// 热力图组件包主入口文件
// 提供统一的API接口和组件整合

// 导入核心组件
// 注意：在浏览器环境中，这些文件需要通过script标签按顺序加载

/**
 * 热力图组件主类
 * 整合了StockHeatmap、DataProcessor和HeatmapRenderer的功能
 */
class HeatmapComponent {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? 
            document.getElementById(container) : container;
        
        if (!this.container) {
            throw new Error('容器元素未找到');
        }
        
        // 合并配置
        this.config = this.mergeConfig(options);
        
        // 初始化组件
        this.dataProcessor = new DataProcessor(this.config.apiConfig);
        this.renderer = new HeatmapRenderer(this.container, this.config.renderConfig);
        this.stockHeatmap = new StockHeatmap(this.container, [], this.config.heatmapConfig);
        
        // 状态管理
        this.currentData = [];
        this.currentMetric = this.config.defaultMetric || 'changePercent';
        this.isLoading = false;
        
        // 绑定事件
        this.bindEvents();
    }
    
    /**
     * 合并配置选项
     */
    mergeConfig(userOptions) {
        const defaultConfig = {
            // 渲染配置
            renderConfig: {
                width: userOptions.width || 800,
                height: userOptions.height || 600,
                padding: userOptions.padding || 20,
                showLabels: userOptions.showLabels !== false,
                showTooltip: userOptions.showTooltip !== false,
                interactive: userOptions.interactive !== false,
                animation: userOptions.animation !== false,
                colorScheme: userOptions.colorScheme || 'default'
            },
            
            // 热力图配置
            heatmapConfig: {
                interactive: userOptions.interactive !== false,
                showTooltip: userOptions.showTooltip !== false,
                onStockClick: userOptions.onStockClick || null,
                onStockHover: userOptions.onStockHover || null
            },
            
            // API配置
            apiConfig: {
                baseUrl: userOptions.baseUrl || '',
                timeout: userOptions.timeout || 10000,
                retryCount: userOptions.retryCount || 3
            },
            
            // 其他配置
            defaultMetric: userOptions.defaultMetric || 'changePercent',
            autoRefresh: userOptions.autoRefresh || false,
            refreshInterval: userOptions.refreshInterval || 30000,
            preset: userOptions.preset || null
        };
        
        // 如果指定了预设，应用预设配置
        if (userOptions.preset && window.HeatmapConfig) {
            const presetConfig = window.HeatmapConfig.getPresetConfig(userOptions.preset);
            Object.assign(defaultConfig.renderConfig, presetConfig);
        }
        
        return defaultConfig;
    }
    
    /**
     * 绑定事件处理器
     */
    bindEvents() {
        // 窗口大小变化时自动调整
        if (this.config.autoResize) {
            window.addEventListener('resize', this.debounce(() => {
                this.resize();
            }, 300));
        }
        
        // 自动刷新
        if (this.config.autoRefresh) {
            this.startAutoRefresh();
        }
    }
    
    /**
     * 渲染热力图
     * @param {Array} data - 股票数据数组
     * @param {string} metric - 显示指标
     */
    async render(data, metric = null) {
        try {
            this.isLoading = true;
            this.showLoading();
            
            // 验证数据
            if (window.HeatmapConfig && !window.HeatmapConfig.validateData(data)) {
                throw new Error('数据格式验证失败');
            }
            
            this.currentData = data;
            this.currentMetric = metric || this.currentMetric;
            
            // 使用StockHeatmap进行渲染
            await this.stockHeatmap.render(data);
            
            this.hideLoading();
            this.isLoading = false;
            
            // 触发渲染完成事件
            this.emit('renderComplete', { data, metric: this.currentMetric });
            
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * 加载市场数据并渲染
     */
    async loadMarketData() {
        try {
            const data = await this.dataProcessor.getMarketData();
            await this.render(data);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * 加载行业数据并渲染
     * @param {string} sector - 行业名称
     */
    async loadSectorData(sector) {
        try {
            const data = await this.dataProcessor.getSectorData(sector);
            await this.render(data);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * 加载标签数据并渲染
     * @param {string} tag - 标签名称
     */
    async loadTagData(tag) {
        try {
            const data = await this.dataProcessor.getTagData(tag);
            await this.render(data.stocks || data);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * 加载趋势数据并渲染
     * @param {string} type - 趋势类型 (gainers, losers, active)
     */
    async loadTrendingData(type = 'gainers') {
        try {
            const data = await this.dataProcessor.getTrendingData(type);
            await this.render(data);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    /**
     * 更新显示指标
     * @param {string} metric - 新的指标名称
     */
    updateMetric(metric) {
        if (this.currentData.length > 0) {
            this.render(this.currentData, metric);
        }
    }
    
    /**
     * 刷新当前数据
     */
    async refresh() {
        if (this.currentData.length > 0) {
            // 这里可以根据当前数据类型重新加载
            // 简化实现：重新渲染当前数据
            await this.render(this.currentData, this.currentMetric);
        }
    }
    
    /**
     * 调整组件大小
     * @param {number} width - 新宽度
     * @param {number} height - 新高度
     */
    resize(width = null, height = null) {
        if (width && height) {
            this.config.renderConfig.width = width;
            this.config.renderConfig.height = height;
        } else {
            // 自动计算大小
            const rect = this.container.getBoundingClientRect();
            this.config.renderConfig.width = rect.width;
            this.config.renderConfig.height = rect.height;
        }
        
        if (this.renderer) {
            this.renderer.resize(this.config.renderConfig.width, this.config.renderConfig.height);
        }
        
        // 重新渲染
        if (this.currentData.length > 0) {
            this.render(this.currentData, this.currentMetric);
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading() {
        if (!this.loadingElement) {
            this.loadingElement = document.createElement('div');
            this.loadingElement.className = 'heatmap-loading';
            this.loadingElement.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">加载中...</div>
            `;
            this.loadingElement.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                z-index: 1000;
            `;
        }
        
        this.container.style.position = 'relative';
        this.container.appendChild(this.loadingElement);
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        if (this.loadingElement && this.loadingElement.parentNode) {
            this.loadingElement.parentNode.removeChild(this.loadingElement);
        }
    }
    
    /**
     * 开始自动刷新
     */
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            if (!this.isLoading) {
                this.refresh();
            }
        }, this.config.refreshInterval);
    }
    
    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
    
    /**
     * 错误处理
     */
    handleError(error) {
        console.error('热力图组件错误:', error);
        
        this.hideLoading();
        this.isLoading = false;
        
        // 显示错误信息
        this.showError(error.message || '加载失败');
        
        // 触发错误事件
        this.emit('error', error);
    }
    
    /**
     * 显示错误信息
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="heatmap-error" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #666;
                font-size: 14px;
            ">
                <div style="margin-bottom: 10px;">⚠️</div>
                <div>${message}</div>
                <button onclick="this.parentNode.parentNode.heatmapComponent.refresh()" 
                        style="margin-top: 10px; padding: 5px 10px; cursor: pointer;">
                    重试
                </button>
            </div>
        `;
        
        // 保存组件引用以便重试
        this.container.heatmapComponent = this;
    }
    
    /**
     * 事件发射器
     */
    emit(eventName, data) {
        const event = new CustomEvent(`heatmap:${eventName}`, {
            detail: data
        });
        this.container.dispatchEvent(event);
    }
    
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * 导出为图片
     */
    exportAsImage(filename = 'heatmap.png') {
        if (this.renderer && this.renderer.exportAsImage) {
            this.renderer.exportAsImage(filename);
        } else if (this.stockHeatmap && this.stockHeatmap.exportAsImage) {
            this.stockHeatmap.exportAsImage(filename);
        }
    }
    
    /**
     * 获取当前数据
     */
    getCurrentData() {
        return {
            data: this.currentData,
            metric: this.currentMetric,
            config: this.config
        };
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        // 停止自动刷新
        this.stopAutoRefresh();
        
        // 清理事件监听器
        window.removeEventListener('resize', this.resize);
        
        // 销毁子组件
        if (this.renderer && this.renderer.destroy) {
            this.renderer.destroy();
        }
        
        if (this.stockHeatmap && this.stockHeatmap.destroy) {
            this.stockHeatmap.destroy();
        }
        
        if (this.dataProcessor && this.dataProcessor.clearCache) {
            this.dataProcessor.clearCache();
        }
        
        // 清空容器
        if (this.container) {
            this.container.innerHTML = '';
            this.container.heatmapComponent = null;
        }
    }
}

// 便捷的工厂函数
function createHeatmap(container, options = {}) {
    return new HeatmapComponent(container, options);
}

// 预设配置的便捷函数
function createPanoramicHeatmap(container, options = {}) {
    return new HeatmapComponent(container, {
        preset: 'panoramic',
        ...options
    });
}

function createCompactHeatmap(container, options = {}) {
    return new HeatmapComponent(container, {
        preset: 'compact',
        ...options
    });
}

function createMiniHeatmap(container, options = {}) {
    return new HeatmapComponent(container, {
        preset: 'mini',
        ...options
    });
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        HeatmapComponent,
        createHeatmap,
        createPanoramicHeatmap,
        createCompactHeatmap,
        createMiniHeatmap
    };
} else {
    // 浏览器环境
    window.HeatmapComponent = HeatmapComponent;
    window.createHeatmap = createHeatmap;
    window.createPanoramicHeatmap = createPanoramicHeatmap;
    window.createCompactHeatmap = createCompactHeatmap;
    window.createMiniHeatmap = createMiniHeatmap;
}