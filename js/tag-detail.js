/**
 * 标签详情页面交互逻辑
 * 负责标签详情的数据加载、热力图渲染和用户交互
 */

class TagDetailPage {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.heatmapRenderer = new HeatmapRenderer();
        this.stockHeatmap = null;
        this.currentTagId = null;
        this.isLoading = false;
        
        this.init();
    }

    /**
     * 初始化页面
     */
    init() {
        this.currentTagId = this.getTagIdFromURL();
        this.setupEventListeners();
        this.loadTagData();
    }

    /**
     * 从URL获取标签ID
     */
    getTagIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('tagId') || 'sector_科技';
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 窗口大小调整时重新渲染热力图
        window.addEventListener('resize', this.debounce(() => {
            if (this.stockHeatmap) {
                this.stockHeatmap.resize();
            }
        }, 300));
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
     * 加载标签数据
     */
    async loadTagData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            // 解析标签ID
            const tagInfo = this.parseTagId(this.currentTagId);
            
            // 更新页面标题和描述
            this.updateTagInfo(tagInfo);
            
            // 生成模拟数据
            const stockData = this.generateTagStockData(tagInfo);
            
            // 渲染热力图
            await this.renderHeatmap(stockData);
            
        } catch (error) {
            console.error('Error loading tag data:', error);
            this.showError('加载标签数据失败，请稍后重试');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * 解析标签ID
     */
    parseTagId(tagId) {
        const tagMap = {
            'sector_科技': { name: '科技行业', description: '包含信息技术、软件、硬件等科技类股票' },
            'sector_金融': { name: '金融行业', description: '包含银行、保险、证券等金融类股票' },
            'sector_医疗': { name: '医疗行业', description: '包含制药、医疗设备、生物技术等医疗类股票' },
            'sector_消费': { name: '消费行业', description: '包含零售、餐饮、娱乐等消费类股票' },
            'sector_能源': { name: '能源行业', description: '包含石油、天然气、新能源等能源类股票' },
            'special_ai': { name: 'AI概念', description: '人工智能相关的科技股票' },
            'special_ev': { name: '电动车概念', description: '电动汽车及相关产业链股票' },
            'special_sp500': { name: 'S&P 500', description: '标准普尔500指数成分股' }
        };
        
        return tagMap[tagId] || { name: '未知标签', description: '标签信息不可用' };
    }

    /**
     * 更新标签信息
     */
    updateTagInfo(tagInfo) {
        document.getElementById('tag-title').textContent = tagInfo.name;
        document.getElementById('tag-description').textContent = tagInfo.description;
        document.title = `${tagInfo.name} - 标签详情`;
    }

    /**
     * 生成标签股票数据
     */
    generateTagStockData(tagInfo) {
        const stockCount = Math.floor(Math.random() * 30) + 20; // 20-50只股票
        const stocks = [];
        
        for (let i = 0; i < stockCount; i++) {
            const symbol = this.generateStockSymbol();
            const name = this.generateCompanyName(symbol);
            const price = Math.random() * 500 + 10;
            const changePercent = (Math.random() - 0.5) * 20; // -10% 到 +10%
            const marketCap = Math.random() * 2000000000000 + 1000000000; // 10亿到2万亿
            
            stocks.push({
                symbol,
                name,
                price: price.toFixed(2),
                change: (price * changePercent / 100).toFixed(2),
                changePercent: changePercent.toFixed(2),
                marketCap,
                volume: Math.floor(Math.random() * 100000000),
                sector: tagInfo.name
            });
        }
        
        return stocks;
    }

    /**
     * 生成股票代码
     */
    generateStockSymbol() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const length = Math.random() > 0.7 ? 4 : 3;
        let symbol = '';
        for (let i = 0; i < length; i++) {
            symbol += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        return symbol;
    }

    /**
     * 生成公司名称
     */
    generateCompanyName(symbol) {
        const prefixes = ['科技', '创新', '智能', '数字', '云端', '未来', '先进', '全球', '新兴', '领先'];
        const suffixes = ['科技', '集团', '公司', '企业', '系统', '平台', '网络', '软件', '硬件', '服务'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix}${suffix}`;
    }

    /**
     * 渲染热力图
     */
    async renderHeatmap(stockData) {
        const container = document.getElementById('tag-heatmap');
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建热力图实例
        this.stockHeatmap = new StockHeatmap(container, {
            data: stockData,
            colorScheme: 'RdYlGn',
            showLabels: true,
            enableTooltip: true,
            enableClick: true,
            minFontSize: 10,
            maxFontSize: 16
        });
        
        // 渲染热力图
        await this.stockHeatmap.render();
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const container = document.getElementById('tag-heatmap');
        container.innerHTML = `
            <div class="heatmap-placeholder">
                <div class="placeholder-icon">⏳</div>
                <p>正在加载标签热力图...</p>
            </div>
        `;
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        // 加载完成后，热力图会自动替换占位符
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        const container = document.getElementById('tag-heatmap');
        container.innerHTML = `
            <div class="heatmap-placeholder error">
                <div class="placeholder-icon">❌</div>
                <p>${message}</p>
                <button onclick="window.tagDetailPage.loadTagData()" class="retry-btn">重试</button>
            </div>
        `;
    }

    /**
     * 刷新标签数据
     */
    async refreshTagData() {
        await this.loadTagData();
    }
}

/**
 * 设置嵌入模式
 * 隐藏导航栏、页头、侧边栏和页脚等装饰元素，优化嵌入显示
 */
function setupEmbedMode() {
    // 创建嵌入模式样式
    const embedStyle = document.createElement('style');
    embedStyle.textContent = `
        /* 隐藏全局导航栏 */
        .global-navbar {
            display: none !important;
        }
        
        /* 隐藏页头/标题区域 */
        .hero-section {
            display: none !important;
        }
        
        /* 隐藏右侧边栏 */
        .sidebar-panel {
            display: none !important;
        }
        
        /* 隐藏页脚 */
        .footer {
            display: none !important;
        }
        
        /* 调整body样式 */
        body {
            margin: 0 !important;
            padding-top: 0 !important;
            overflow-x: hidden !important;
        }
        
        /* 调整主内容区域 */
        .main-content {
            padding: 20px !important;
            margin: 0 !important;
            min-height: 100vh !important;
            max-width: 100% !important;
        }
        
        /* 优化热力图区域显示 */
        .heatmap-section {
            margin: 0 !important;
            padding: 0 !important;
        }
        
        .tag-info-section {
            margin: 0 !important;
            padding: 0 0 20px 0 !important;
        }
        
        /* 调整区域标题 */
        .section-title {
            font-size: 1.5rem !important;
            margin-bottom: 10px !important;
        }
        
        .section-subtitle {
            font-size: 0.9rem !important;
            margin-bottom: 15px !important;
        }
        
        /* 优化热力图容器 */
        .heatmap-canvas {
            min-height: 400px !important;
        }
    `;
    
    document.head.appendChild(embedStyle);
    
    // 设置页面标题
    document.title = '标签详情 - 嵌入模式';
}

/**
 * 全局函数：刷新标签数据
 */
function refreshTagData() {
    if (window.tagDetailPage) {
        window.tagDetailPage.refreshTagData();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否为嵌入模式
    const urlParams = new URLSearchParams(window.location.search);
    const isEmbedMode = urlParams.get('embed') === 'true';
    
    if (isEmbedMode) {
        setupEmbedMode();
    }
    
    // 初始化标签详情页面
    window.tagDetailPage = new TagDetailPage();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', function() {
    if (window.tagDetailPage && window.tagDetailPage.stockHeatmap) {
        // 清理热力图资源
        window.tagDetailPage.stockHeatmap = null;
    }
});