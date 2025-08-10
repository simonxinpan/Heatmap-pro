// script.js (V5.4 - Modified for Chinese Name Priority)

const appContainer = document.getElementById('app-container');
const tooltip = document.getElementById('tooltip');
let fullMarketData = null; // 用于缓存从API获取的完整数据
let dataRefreshInterval = null; // 数据刷新定时器

document.addEventListener('DOMContentLoaded', function() {
    router();
    initializeTagSystem();
});
window.addEventListener('popstate', router);

// 标签系统初始化
function initializeTagSystem() {
    const tagButton = document.getElementById('tagButton');
    const tagModal = document.getElementById('tagModal');
    const tagDetailModal = document.getElementById('tagDetailModal');
    const tagModalClose = document.querySelector('.tag-modal-close');
    const tagDetailClose = document.querySelector('.tag-detail-close');
    const backBtn = document.querySelector('.back-btn');

    // 打开标签模态框
    if (tagButton) {
        tagButton.addEventListener('click', function() {
            loadTagCategories();
            tagModal.style.display = 'block';
        });
    }

    // 关闭标签模态框
    if (tagModalClose) {
        tagModalClose.addEventListener('click', function() {
            tagModal.style.display = 'none';
        });
    }

    // 关闭标签详情模态框
    if (tagDetailClose) {
        tagDetailClose.addEventListener('click', function() {
            tagDetailModal.style.display = 'none';
        });
    }

    // 返回按钮
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            tagDetailModal.style.display = 'none';
            tagModal.style.display = 'block';
        });
    }

    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === tagModal) {
            tagModal.style.display = 'none';
        }
        if (event.target === tagDetailModal) {
            tagDetailModal.style.display = 'none';
        }
    });
}

// 加载标签分类
async function loadTagCategories() {
    try {
        const response = await fetch('/api/tags');
        const tags = await response.json();
        
        const categorizedTags = categorizeTags(tags);
        renderTagCategories(categorizedTags);
    } catch (error) {
        console.error('加载标签失败:', error);
        // 使用模拟数据作为后备
        renderTagCategories(getMockTagCategories());
    }
}

// 标签分类
function categorizeTags(tags) {
    const categories = {
        'stock-performance': {
            title: '股市表现类',
            icon: '📈',
            tags: []
        },
        'financial-performance': {
            title: '财务表现类',
            icon: '💰',
            tags: []
        },
        'industry-classification': {
            title: '行业分类',
            icon: '🏭',
            tags: []
        },
        'trend-ranking': {
            title: '趋势排位类',
            icon: '🚀',
            tags: []
        },
        'special-list': {
            title: '特殊名单类',
            icon: '⭐',
            tags: []
        }
    };

    tags.forEach(tag => {
        const category = tag.category || 'special-list';
        if (categories[category]) {
            categories[category].tags.push(tag);
        }
    });

    return categories;
}

// 获取模拟标签数据
function getMockTagCategories() {
    return {
        'stock-performance': {
            title: '股市表现类',
            icon: '📈',
            tags: [
                { id: 1, name: '52周最高', category: 'stock-performance' },
                { id: 2, name: '52周最低', category: 'stock-performance' },
                { id: 3, name: '高股息率', category: 'stock-performance' },
                { id: 4, name: '低市盈率', category: 'stock-performance' },
                { id: 5, name: '高市值', category: 'stock-performance' }
            ]
        },
        'financial-performance': {
            title: '财务表现类',
            icon: '💰',
            tags: [
                { id: 6, name: '高ROE', category: 'financial-performance' },
                { id: 7, name: '低负债率', category: 'financial-performance' },
                { id: 8, name: '高增长率', category: 'financial-performance' },
                { id: 9, name: '高贝塔系数', category: 'financial-performance' },
                { id: 10, name: 'VIX恐慌指数相关', category: 'financial-performance' }
            ]
        },
        'industry-classification': {
            title: '行业分类',
            icon: '🏭',
            tags: [
                { id: 11, name: '科技股', category: 'industry-classification' },
                { id: 12, name: '金融股', category: 'industry-classification' },
                { id: 13, name: '医疗保健', category: 'industry-classification' },
                { id: 14, name: '能源股', category: 'industry-classification' },
                { id: 15, name: '消费品', category: 'industry-classification' },
                { id: 16, name: '工业股', category: 'industry-classification' },
                { id: 17, name: '房地产', category: 'industry-classification' },
                { id: 18, name: '公用事业', category: 'industry-classification' },
                { id: 19, name: '材料股', category: 'industry-classification' },
                { id: 20, name: '通信服务', category: 'industry-classification' },
                { id: 21, name: '必需消费品', category: 'industry-classification' },
                { id: 22, name: '可选消费品', category: 'industry-classification' },
                { id: 23, name: '生物技术', category: 'industry-classification' },
                { id: 24, name: '半导体', category: 'industry-classification' }
            ]
        },
        'trend-ranking': {
            title: '趋势排位类',
            icon: '🚀',
            tags: [
                { id: 25, name: '近期强势', category: 'trend-ranking' },
                { id: 26, name: '近期弱势', category: 'trend-ranking' },
                { id: 27, name: '成交量放大', category: 'trend-ranking' },
                { id: 28, name: '突破新高', category: 'trend-ranking' },
                { id: 29, name: '跌破支撑', category: 'trend-ranking' }
            ]
        },
        'special-list': {
            title: '特殊名单类',
            icon: '⭐',
            tags: [
                { id: 30, name: '标普500', category: 'special-list' },
                { id: 31, name: '纳斯达克100', category: 'special-list' },
                { id: 32, name: '道琼斯', category: 'special-list' },
                { id: 33, name: 'ESG评级高', category: 'special-list' },
                { id: 34, name: '分析师推荐', category: 'special-list' }
            ]
        }
    };
}

// 渲染标签分类
function renderTagCategories(categories) {
    const container = document.getElementById('tagCategories');
    if (!container) return;

    container.innerHTML = '';

    Object.entries(categories).forEach(([categoryKey, category]) => {
        if (category.tags.length === 0) return;

        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        categorySection.innerHTML = `
            <div class="category-header">
                <span class="category-icon">${category.icon}</span>
                <h3 class="category-title">${category.title}</h3>
            </div>
            <div class="category-tags">
                ${category.tags.map(tag => `
                    <span class="tag ${categoryKey}" data-tag-id="${tag.id}" data-category="${categoryKey}">
                        ${tag.name}
                    </span>
                `).join('')}
            </div>
        `;

        container.appendChild(categorySection);
    });

    // 添加标签点击事件
    container.addEventListener('click', function(event) {
        if (event.target.classList.contains('tag')) {
            const tagId = event.target.dataset.tagId;
            const category = event.target.dataset.category;
            const tagName = event.target.textContent;
            showTagDetail(tagId, tagName, category);
        }
    });
}

// 显示标签详情
async function showTagDetail(tagId, tagName, category) {
    try {
        const response = await fetch(`/api/tags/${tagId}/stocks`);
        const data = await response.json();
        
        renderTagDetail({
            id: tagId,
            name: tagName,
            category: category,
            ...data
        });
    } catch (error) {
        console.error('加载标签详情失败:', error);
        // 使用模拟数据作为后备
        renderTagDetail(getMockTagDetail(tagId, tagName, category));
    }

    document.getElementById('tagModal').style.display = 'none';
    document.getElementById('tagDetailModal').style.display = 'block';
}

// 获取模拟标签详情数据
function getMockTagDetail(tagId, tagName, category) {
    const mockData = {
        1: {
            description: '过去52周内达到最高价格的股票',
            totalStocks: 156,
            avgReturn: '+12.5%',
            totalMarketCap: '$2.8T',
            stocks: [
                { ticker: 'AAPL', name: 'Apple Inc.', price: 175.43, change: 2.15, changePercent: 1.24 },
                { ticker: 'MSFT', name: 'Microsoft Corp.', price: 338.11, change: 4.22, changePercent: 1.27 },
                { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 125.37, change: -0.85, changePercent: -0.67 },
                { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 127.74, change: 1.33, changePercent: 1.05 },
                { ticker: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: 8.75, changePercent: 3.65 }
            ]
        },
        6: {
            description: '净资产收益率超过15%的优质公司',
            totalStocks: 89,
            avgReturn: '+18.3%',
            totalMarketCap: '$1.5T',
            stocks: [
                { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 421.13, change: 12.45, changePercent: 3.05 },
                { ticker: 'META', name: 'Meta Platforms', price: 296.73, change: 5.21, changePercent: 1.79 },
                { ticker: 'NFLX', name: 'Netflix Inc.', price: 378.45, change: -2.15, changePercent: -0.56 },
                { ticker: 'CRM', name: 'Salesforce Inc.', price: 189.33, change: 3.67, changePercent: 1.98 },
                { ticker: 'ADBE', name: 'Adobe Inc.', price: 512.78, change: 7.89, changePercent: 1.56 }
            ]
        },
        11: {
            description: '科技行业相关的创新型公司',
            totalStocks: 234,
            avgReturn: '+15.7%',
            totalMarketCap: '$4.2T',
            stocks: [
                { ticker: 'AAPL', name: 'Apple Inc.', price: 175.43, change: 2.15, changePercent: 1.24 },
                { ticker: 'MSFT', name: 'Microsoft Corp.', price: 338.11, change: 4.22, changePercent: 1.27 },
                { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 125.37, change: -0.85, changePercent: -0.67 },
                { ticker: 'META', name: 'Meta Platforms', price: 296.73, change: 5.21, changePercent: 1.79 },
                { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 421.13, change: 12.45, changePercent: 3.05 }
            ]
        },
        30: {
            description: '标准普尔500指数成分股',
            totalStocks: 500,
            avgReturn: '+11.2%',
            totalMarketCap: '$35.8T',
            stocks: [
                { ticker: 'AAPL', name: 'Apple Inc.', price: 175.43, change: 2.15, changePercent: 1.24 },
                { ticker: 'MSFT', name: 'Microsoft Corp.', price: 338.11, change: 4.22, changePercent: 1.27 },
                { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 127.74, change: 1.33, changePercent: 1.05 },
                { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 421.13, change: 12.45, changePercent: 3.05 },
                { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 125.37, change: -0.85, changePercent: -0.67 }
            ]
        },
        25: {
            description: '近期表现强劲的股票',
            totalStocks: 78,
            avgReturn: '+22.8%',
            totalMarketCap: '$1.9T',
            stocks: [
                { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 421.13, change: 12.45, changePercent: 3.05 },
                { ticker: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: 8.75, changePercent: 3.65 },
                { ticker: 'META', name: 'Meta Platforms', price: 296.73, change: 5.21, changePercent: 1.79 },
                { ticker: 'AMD', name: 'Advanced Micro Devices', price: 102.33, change: 4.12, changePercent: 4.20 },
                { ticker: 'NFLX', name: 'Netflix Inc.', price: 378.45, change: 6.78, changePercent: 1.82 }
            ]
        }
    };

    return {
        id: tagId,
        name: tagName,
        category: category,
        description: mockData[tagId]?.description || '暂无描述',
        totalStocks: mockData[tagId]?.totalStocks || 0,
        avgReturn: mockData[tagId]?.avgReturn || '0%',
        totalMarketCap: mockData[tagId]?.totalMarketCap || '$0',
        stocks: mockData[tagId]?.stocks || []
    };
}

// 渲染标签详情
function renderTagDetail(tagData) {
    const container = document.getElementById('tagDetailContent');
    if (!container) return;

    const categoryTitles = {
        'stock-performance': '股市表现类',
        'financial-performance': '财务表现类',
        'industry-classification': '行业分类',
        'trend-ranking': '趋势排位类',
        'special-list': '特殊名单类'
    };

    container.innerHTML = `
        <div class="tag-header ${tagData.category}">
            <div class="tag-title">
                <h1 class="tag-name">${tagData.name}</h1>
            </div>
            <p class="tag-description">${tagData.description}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${tagData.totalStocks}</div>
                <p class="stat-label">股票总数</p>
            </div>
            <div class="stat-card">
                <div class="stat-value">${tagData.avgReturn}</div>
                <p class="stat-label">平均回报</p>
            </div>
            <div class="stat-card">
                <div class="stat-value">${tagData.totalMarketCap}</div>
                <p class="stat-label">总市值</p>
            </div>
        </div>
        
        <div class="stocks-section">
            <div class="stocks-header">
                <h3 class="stocks-title">相关股票</h3>
            </div>
            <table class="stocks-table">
                <thead>
                    <tr>
                        <th>股票代码</th>
                        <th>公司名称</th>
                        <th>当前价格</th>
                        <th>涨跌额</th>
                        <th>涨跌幅</th>
                    </tr>
                </thead>
                <tbody>
                    ${tagData.stocks.map(stock => `
                        <tr>
                            <td class="stock-ticker">${stock.ticker}</td>
                            <td class="stock-name">${stock.name}</td>
                            <td class="stock-price">$${stock.price.toFixed(2)}</td>
                            <td class="stock-change ${stock.change >= 0 ? 'positive' : 'negative'}">
                                ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                            </td>
                            <td class="stock-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}">
                                ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 启动数据自动刷新机制（每5分钟）
function startDataRefresh() {
    // 清除现有定时器
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
    }
    
    // 设置每5分钟刷新一次数据
    dataRefreshInterval = setInterval(async () => {
        console.log('🔄 自动刷新股票数据...');
        try {
            const res = await fetch('/api/stocks-simple');
            if (res.ok) {
                const result = await res.json();
                const newData = result.data || result; // 兼容新旧格式
                fullMarketData = newData;
                
                // 显示缓存状态信息
                if (result.meta) {
                    updateCacheStatus(result.meta);
                }
                
                // 如果当前在主页，重新渲染
                const currentPath = window.location.pathname;
                if (currentPath === '/' || currentPath.startsWith('/sector/')) {
                    const sectorName = currentPath.startsWith('/sector/') ? 
                        decodeURIComponent(currentPath.split('/sector/')[1]) : null;
                    await renderHomePage(sectorName);
                    console.log('✅ 数据刷新完成');
                }
            }
        } catch (error) {
            console.warn('⚠️ 数据刷新失败:', error.message);
        }
    }, 5 * 60 * 1000); // 5分钟 = 5 * 60 * 1000毫秒
    
    console.log('🚀 数据自动刷新已启动（每5分钟）');
}

// 停止数据刷新
function stopDataRefresh() {
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
        dataRefreshInterval = null;
        console.log('⏹️ 数据自动刷新已停止');
    }
}

// 使用防抖技术优化resize事件，避免频繁重绘
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(rerenderCurrentView, 250);
});

// 主路由函数，根据URL参数决定渲染哪个页面
async function router() {
    showLoading();
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const symbol = params.get('symbol');
    const sector = params.get('sector');

    if (page === 'stock' && symbol) {
        await renderStockDetailPage(symbol);
    } else if (sector) {
        // 如果有sector参数，则渲染行业详情页
        await renderHomePage(decodeURIComponent(sector));
    } else {
        // 默认渲染全景热力图
        document.title = '股票热力图 - 全景';
        await renderHomePage();
    }
}

// 显示加载动画
function showLoading() {
    appContainer.innerHTML = `<div class="loading-indicator"><div class="spinner"></div><p>数据加载中...</p></div>`;
}

// 渲染主页（全景或行业详情）
async function renderHomePage(sectorName = null) {
    // 启动数据自动刷新（仅在主页时）
    if (!sectorName) {
        startDataRefresh();
    }
    try {
        // 尝试获取市场数据，如果失败则使用模拟数据
        let marketData;
        try {
            console.log('🔄 正在获取股票数据...');
            const res = await fetch('/api/stocks-simple');
            if (!res.ok) {
                throw new Error('API不可用');
            }
            const result = await res.json();
            
            // 新的 API 直接返回股票数组
            if (Array.isArray(result)) {
                marketData = result;
                console.log(`✅ 获取到 ${marketData.length} 只股票数据`);
            } else {
                // 兼容旧格式
                marketData = result.data || result;
                
                // 显示缓存状态信息
                if (result.meta) {
                    const { total, cached, updated, marketStatus, cacheMinutes, processingTime } = result.meta;
                    console.log(`📊 股票数据获取完成:`);
                    console.log(`   总数: ${total} | 缓存命中: ${cached} | API更新: ${updated}`);
                    console.log(`   市场状态: ${marketStatus} | 缓存策略: ${cacheMinutes}分钟`);
                    console.log(`   处理时间: ${processingTime}ms`);
                    
                    // 在页面上显示缓存状态
                    updateCacheStatus(result.meta);
                } else {
                    console.log(`✅ 获取到 ${marketData.length} 只股票数据`);
                }
            }
        } catch (apiError) {
            console.log('API不可用，使用模拟数据进行演示');
            // 使用标普500主要股票的模拟数据
            marketData = [
                // 科技股
                { ticker: 'AAPL', name_zh: '苹果公司', sector_zh: '科技', market_cap: 2450000, change_percent: 1.69, logo: 'https://logo.clearbit.com/apple.com' },
                { ticker: 'MSFT', name_zh: '微软', sector_zh: '科技', market_cap: 2200000, change_percent: 0.85, logo: 'https://logo.clearbit.com/microsoft.com' },
                { ticker: 'GOOGL', name_zh: '谷歌', sector_zh: '科技', market_cap: 1500000, change_percent: -0.42, logo: 'https://logo.clearbit.com/google.com' },
                { ticker: 'NVDA', name_zh: '英伟达', sector_zh: '科技', market_cap: 900000, change_percent: 3.45, logo: 'https://logo.clearbit.com/nvidia.com' },
                { ticker: 'META', name_zh: 'Meta平台', sector_zh: '科技', market_cap: 750000, change_percent: 1.87, logo: 'https://logo.clearbit.com/meta.com' },
                { ticker: 'NFLX', name_zh: '奈飞', sector_zh: '科技', market_cap: 180000, change_percent: 2.34, logo: 'https://logo.clearbit.com/netflix.com' },
                { ticker: 'ADBE', name_zh: '奥多比', sector_zh: '科技', market_cap: 220000, change_percent: 1.12, logo: 'https://logo.clearbit.com/adobe.com' },
                { ticker: 'CRM', name_zh: '赛富时', sector_zh: '科技', market_cap: 190000, change_percent: 0.78, logo: 'https://logo.clearbit.com/salesforce.com' },
                
                // 消费股
                { ticker: 'AMZN', name_zh: '亚马逊', sector_zh: '消费', market_cap: 1200000, change_percent: 2.15, logo: 'https://logo.clearbit.com/amazon.com' },
                { ticker: 'TSLA', name_zh: '特斯拉', sector_zh: '消费', market_cap: 800000, change_percent: -1.23, logo: 'https://logo.clearbit.com/tesla.com' },
                { ticker: 'HD', name_zh: '家得宝', sector_zh: '消费', market_cap: 320000, change_percent: 1.45, logo: 'https://logo.clearbit.com/homedepot.com' },
                { ticker: 'MCD', name_zh: '麦当劳', sector_zh: '消费', market_cap: 210000, change_percent: 0.67, logo: 'https://logo.clearbit.com/mcdonalds.com' },
                { ticker: 'NKE', name_zh: '耐克', sector_zh: '消费', market_cap: 160000, change_percent: -0.89, logo: 'https://logo.clearbit.com/nike.com' },
                { ticker: 'SBUX', name_zh: '星巴克', sector_zh: '消费', market_cap: 110000, change_percent: 1.23, logo: 'https://logo.clearbit.com/starbucks.com' },
                
                // 金融股
                { ticker: 'BRK.B', name_zh: '伯克希尔', sector_zh: '金融', market_cap: 700000, change_percent: 0.45, logo: 'https://logo.clearbit.com/berkshirehathaway.com' },
                { ticker: 'JPM', name_zh: '摩根大通', sector_zh: '金融', market_cap: 450000, change_percent: 1.34, logo: 'https://logo.clearbit.com/jpmorganchase.com' },
                { ticker: 'BAC', name_zh: '美国银行', sector_zh: '金融', market_cap: 280000, change_percent: 0.89, logo: 'https://logo.clearbit.com/bankofamerica.com' },
                { ticker: 'WFC', name_zh: '富国银行', sector_zh: '金融', market_cap: 180000, change_percent: 1.12, logo: 'https://logo.clearbit.com/wellsfargo.com' },
                { ticker: 'GS', name_zh: '高盛', sector_zh: '金融', market_cap: 120000, change_percent: 0.56, logo: 'https://logo.clearbit.com/goldmansachs.com' },
                
                // 医疗股
                { ticker: 'UNH', name_zh: '联合健康', sector_zh: '医疗', market_cap: 450000, change_percent: 1.23, logo: 'https://logo.clearbit.com/unitedhealthgroup.com' },
                { ticker: 'JNJ', name_zh: '强生', sector_zh: '医疗', market_cap: 420000, change_percent: 0.67, logo: 'https://logo.clearbit.com/jnj.com' },
                { ticker: 'PFE', name_zh: '辉瑞', sector_zh: '医疗', market_cap: 180000, change_percent: -0.45, logo: 'https://logo.clearbit.com/pfizer.com' },
                { ticker: 'ABBV', name_zh: '艾伯维', sector_zh: '医疗', market_cap: 280000, change_percent: 1.78, logo: 'https://logo.clearbit.com/abbvie.com' },
                { ticker: 'TMO', name_zh: '赛默飞', sector_zh: '医疗', market_cap: 200000, change_percent: 0.89, logo: 'https://logo.clearbit.com/thermofisher.com' },
                
                // 工业股
                { ticker: 'BA', name_zh: '波音', sector_zh: '工业', market_cap: 130000, change_percent: -2.34, logo: 'https://logo.clearbit.com/boeing.com' },
                { ticker: 'CAT', name_zh: '卡特彼勒', sector_zh: '工业', market_cap: 140000, change_percent: 1.45, logo: 'https://logo.clearbit.com/caterpillar.com' },
                { ticker: 'GE', name_zh: '通用电气', sector_zh: '工业', market_cap: 120000, change_percent: 2.12, logo: 'https://logo.clearbit.com/ge.com' },
                { ticker: 'MMM', name_zh: '3M公司', sector_zh: '工业', market_cap: 90000, change_percent: 0.34, logo: 'https://logo.clearbit.com/3m.com' },
                
                // 能源股
                { ticker: 'XOM', name_zh: '埃克森美孚', sector_zh: '能源', market_cap: 420000, change_percent: 2.67, logo: 'https://logo.clearbit.com/exxonmobil.com' },
                { ticker: 'CVX', name_zh: '雪佛龙', sector_zh: '能源', market_cap: 280000, change_percent: 1.89, logo: 'https://logo.clearbit.com/chevron.com' },
                { ticker: 'COP', name_zh: '康菲石油', sector_zh: '能源', market_cap: 140000, change_percent: 3.12, logo: 'https://logo.clearbit.com/conocophillips.com' },
                
                // 通信股
                { ticker: 'VZ', name_zh: '威瑞森', sector_zh: '通信', market_cap: 170000, change_percent: 0.45, logo: 'https://logo.clearbit.com/verizon.com' },
                { ticker: 'T', name_zh: 'AT&T', sector_zh: '通信', market_cap: 130000, change_percent: -0.23, logo: 'https://logo.clearbit.com/att.com' },
                { ticker: 'CMCSA', name_zh: '康卡斯特', sector_zh: '通信', market_cap: 160000, change_percent: 1.12, logo: 'https://logo.clearbit.com/comcast.com' },
                
                // 公用事业
                { ticker: 'NEE', name_zh: '新纪元能源', sector_zh: '公用事业', market_cap: 150000, change_percent: 0.78, logo: 'https://logo.clearbit.com/nexteraenergy.com' },
                { ticker: 'DUK', name_zh: '杜克能源', sector_zh: '公用事业', market_cap: 80000, change_percent: 0.34, logo: 'https://logo.clearbit.com/duke-energy.com' },
                
                // 房地产
                { ticker: 'AMT', name_zh: '美国电塔', sector_zh: '房地产', market_cap: 90000, change_percent: 1.23, logo: 'https://logo.clearbit.com/americantower.com' },
                { ticker: 'PLD', name_zh: '普洛斯', sector_zh: '房地产', market_cap: 110000, change_percent: 0.89, logo: 'https://logo.clearbit.com/prologis.com' }
            ];
        }
        fullMarketData = marketData; // 更新全局数据缓存

        let dataToRender = fullMarketData;
        let headerHtml;

        if (sectorName) {
            // 过滤出特定行业的数据
            dataToRender = fullMarketData.filter(stock => stock.sector_zh === sectorName);
            document.title = `${sectorName} - 行业热力图`;
            headerHtml = `<header class="header"><h1>${sectorName}</h1><a href="/" class="back-link" onclick="navigate(event, '/')">← 返回全景图</a></header>`;
        } else {
            // 全景图的标题
            headerHtml = `
                <header class="header">
                    <div class="header-content">
                        <div class="header-main">
                            <h1>股票热力图</h1>
                            <div class="data-source">美股市场 (BETA)</div>
                        </div>
                        <div class="header-actions">
                            <a href="/cache-admin.html" class="admin-link" title="缓存管理">
                                <span class="admin-icon">⚙️</span>
                                <span class="admin-text">缓存管理</span>
                            </a>
                        </div>
                    </div>
                </header>
            `;
        }
        
        if (!dataToRender || dataToRender.length === 0) {
            appContainer.innerHTML = `<div class="loading-indicator">没有找到数据，后台可能正在更新，请稍后刷新...</div>`;
            return;
        }

        // 渲染页面骨架
        appContainer.innerHTML = `
            ${headerHtml}
            <div id="cache-status" class="cache-status" style="display: none;"></div>
            <main id="heatmap-container-final" class="heatmap-container-final"></main>
            <footer class="legend">
                <span>-3%</span>
                <div class="legend-item"><div class="legend-color-box loss-5"></div></div>
                <div class="legend-item"><div class="legend-color-box loss-3"></div></div>
                <div class="legend-item"><div class="legend-color-box loss-1"></div></div>
                <div class="legend-item"><div class="legend-color-box flat"></div></div>
                <div class="legend-item"><div class="legend-color-box gain-1"></div></div>
                <div class="legend-item"><div class="legend-color-box gain-3"></div></div>
                <div class="legend-item"><div class="legend-color-box gain-5"></div></div>
                <span>+3%</span>
            </footer>
        `;
        
        // 行业视图下不显示图例
        if (sectorName) {
            appContainer.querySelector('.legend').style.display = 'none';
        }

        // 使用 requestAnimationFrame 确保在DOM渲染后执行treemap计算
        requestAnimationFrame(() => {
            const container = document.getElementById('heatmap-container-final');
            if (container) {
                generateTreemap(dataToRender, container, !sectorName);
            }
        });
    } catch (error) {
        console.error("Render HomePage Error:", error);
        appContainer.innerHTML = `<div class="loading-indicator">加载失败: ${error.message}</div>`;
    }
}

// 生成Treemap布局的核心函数（性能优化版）
function generateTreemap(data, container, groupIntoSectors = true) {
    container.innerHTML = '';
    const { clientWidth: totalWidth, clientHeight: totalHeight } = container;
    if (totalWidth === 0 || totalHeight === 0 || !data || data.length === 0) return;

    // 性能优化：使用DocumentFragment减少DOM操作
    const fragment = document.createDocumentFragment();
    const elementsToRender = [];
    
    let itemsToLayout;
    if (groupIntoSectors) {
        const stocksBySector = groupDataBySector(data);
        itemsToLayout = Object.entries(stocksBySector).map(([sectorName, sectorData]) => ({
            name: sectorName, 
            isSector: true, 
            value: sectorData.total_market_cap,
            items: sectorData.stocks.map(s => ({ ...s, value: s.market_cap, isSector: false }))
        }));
    } else {
        itemsToLayout = data.map(s => ({ ...s, value: s.market_cap, isSector: false }));
    }

    // 递归布局函数
    function layout(items, x, y, width, height, parentEl) {
        if (items.length === 0 || width <= 1 || height <= 1) return;
        
        const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0);
        if (totalValue <= 0) return;

        if (items.length === 1) {
            renderNode(items[0], x, y, width, height, parentEl);
            return;
        }

        let bestSplitIndex = 0;
        let minDiff = Infinity;
        const targetValue = totalValue / 2;
        let cumulativeValue = 0;

        for (let i = 0; i < items.length - 1; i++) {
            cumulativeValue += items[i].value || 0;
            const diff = Math.abs(cumulativeValue - targetValue);
            if (diff < minDiff) {
                minDiff = diff;
                bestSplitIndex = i;
            }
        }

        const firstGroup = items.slice(0, bestSplitIndex + 1);
        const secondGroup = items.slice(bestSplitIndex + 1);
        const firstValue = firstGroup.reduce((s, item) => s + (item.value || 0), 0);
        
        const proportion = totalValue > 0 ? firstValue / totalValue : 0.5;
        const isHorizontal = width > height;

        if (isHorizontal) {
            const firstWidth = width * proportion;
            layout(firstGroup, x, y, firstWidth, height, parentEl);
            layout(secondGroup, x + firstWidth, y, width - firstWidth, height, parentEl);
        } else {
            const firstHeight = height * proportion;
            layout(firstGroup, x, y, width, firstHeight, parentEl);
            layout(secondGroup, x, y + firstHeight, width, height - firstHeight, parentEl);
        }
    }

    // 渲染单个节点（行业或股票）- 性能优化版
    function renderNode(node, x, y, width, height, parentEl) {
        if (node.isSector) {
            const sectorEl = createSectorElement(node, x, y, width, height);
            if (parentEl === container) {
                fragment.appendChild(sectorEl);
            } else {
                parentEl.appendChild(sectorEl);
            }
            const titleEl = sectorEl.querySelector('.treemap-title-link');
            const titleHeight = titleEl ? titleEl.offsetHeight : 31;
            const contentContainer = sectorEl.querySelector('.treemap-sector-content');
            layout(node.items, 0, 0, width, height - titleHeight, contentContainer);
        } else {
            // 性能优化：只渲染可见区域的股票，小于4px的不渲染
            if (width < 4 || height < 4) return;
            
            // 延迟渲染：将股票元素信息存储，稍后批量创建
            elementsToRender.push({ node, x, y, width, height, parentEl });
        }
    }
    
    // 开始布局
    layout(itemsToLayout, 0, 0, totalWidth, totalHeight, container);
    
    // 批量渲染股票元素（性能优化）
    const batchSize = 50; // 每批渲染50个元素
    let currentBatch = 0;
    
    function renderBatch() {
        const start = currentBatch * batchSize;
        const end = Math.min(start + batchSize, elementsToRender.length);
        const batchFragment = document.createDocumentFragment();
        
        for (let i = start; i < end; i++) {
            const { node, x, y, width, height, parentEl } = elementsToRender[i];
            const stockEl = createStockElement(node, width, height);
            stockEl.style.left = `${x}px`;
            stockEl.style.top = `${y}px`;
            
            if (parentEl === container) {
                batchFragment.appendChild(stockEl);
            } else {
                parentEl.appendChild(stockEl);
            }
        }
        
        if (batchFragment.hasChildNodes()) {
            container.appendChild(batchFragment);
        }
        
        currentBatch++;
        
        // 如果还有更多元素需要渲染，使用requestAnimationFrame继续
        if (end < elementsToRender.length) {
            requestAnimationFrame(renderBatch);
        } else {
            console.log(`✅ 完成渲染 ${elementsToRender.length} 只股票`);
        }
    }
    
    // 首先添加行业容器到DOM
    if (fragment.hasChildNodes()) {
        container.appendChild(fragment);
    }
    
    // 开始批量渲染股票
    if (elementsToRender.length > 0) {
        console.log(`🚀 开始批量渲染 ${elementsToRender.length} 只股票...`);
        requestAnimationFrame(renderBatch);
    }
}

// 创建行业板块的DOM元素
function createSectorElement(sector, x, y, width, height) {
    const sectorEl = document.createElement('div');
    sectorEl.className = 'treemap-sector';
    sectorEl.style.left = `${x}px`; sectorEl.style.top = `${y}px`;
    sectorEl.style.width = `${width}px`; sectorEl.style.height = `${height}px`;
    
    const titleLink = document.createElement('a');
    titleLink.className = 'treemap-title-link';
    titleLink.href = `/?sector=${encodeURIComponent(sector.name)}`;
    titleLink.onclick = (e) => navigate(e, titleLink.href);
    titleLink.innerHTML = `<h2 class="treemap-title">${sector.name}</h2>`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'treemap-sector-content';
    
    sectorEl.appendChild(titleLink);
    sectorEl.appendChild(contentDiv);
    return sectorEl;
}

// 创建单个股票的DOM元素
// 性能优化：使用事件委托减少事件监听器数量
let tooltipEventDelegated = false;

function setupTooltipDelegation() {
    if (tooltipEventDelegated) return;
    
    const container = document.getElementById('heatmap-container-final');
    if (!container) return;
    
    container.addEventListener('mouseover', (e) => {
        const stockLink = e.target.closest('.treemap-stock');
        if (!stockLink || !tooltip) return;
        
        const stockData = JSON.parse(stockLink.dataset.stockInfo);
        const change = parseFloat(stockData.change_percent || 0);
        const marketCap = stockData.market_cap ? (stockData.market_cap / 1000).toFixed(2) : 'N/A';
        const changeClass = change >= 0 ? 'gain' : 'loss';
        
        tooltip.innerHTML = `<div class="tooltip-header">${stockData.ticker} - ${stockData.name_zh}</div><div class="tooltip-row"><span class="tooltip-label">涨跌幅</span><span class="tooltip-value ${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span></div><div class="tooltip-row"><span class="tooltip-label">总市值</span><span class="tooltip-value">${marketCap}B</span></div><div class="tooltip-row"><span class="tooltip-label">所属行业</span><span class="tooltip-value">${stockData.sector_zh || 'N/A'}</span></div>`;
        tooltip.style.display = 'block';
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!e.target.closest('.treemap-stock') || !tooltip) return;
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
    });
    
    container.addEventListener('mouseout', (e) => {
        if (!e.target.closest('.treemap-stock') || !tooltip) return;
        tooltip.style.display = 'none';
    });
    
    tooltipEventDelegated = true;
}

function createStockElement(stock, width, height) {
    // 确保事件委托已设置
    setupTooltipDelegation();
    
    const stockLink = document.createElement('a');
    stockLink.className = 'treemap-stock';
    stockLink.href = `https://stock-details-final-lckt58yeg-simon-pans-projects.vercel.app/?symbol=${stock.ticker}`;
    stockLink.target = '_blank';
    stockLink.style.cssText = `width:${width}px;height:${height}px;position:absolute;`;
    
    // 将股票数据存储在dataset中，供事件委托使用
    stockLink.dataset.stockInfo = JSON.stringify({
        ticker: stock.ticker,
        name_zh: stock.name_zh,
        change_percent: stock.change_percent,
        market_cap: stock.market_cap,
        sector_zh: stock.sector_zh
    });

    const change = parseFloat(stock.change_percent || 0);
    const area = width * height;
    
    // 性能优化：减少DOM层级，直接设置className
    let detailClass = 'detail-xs';
    if (area > 10000) detailClass = 'detail-xl';
    else if (area > 4000) detailClass = 'detail-lg';
    else if (area > 1500) detailClass = 'detail-md';
    else if (area > 600) detailClass = 'detail-sm';
    
    stockLink.className = `treemap-stock stock ${getColorClass(change)} ${detailClass}`;
    
    // 性能优化：直接设置innerHTML，减少DOM操作
    stockLink.innerHTML = `<span class="stock-name-zh">${stock.name_zh}</span><span class="stock-ticker">${stock.ticker}</span><span class="stock-change">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>`;
    
    return stockLink;
}

// 按行业分组数据
function groupDataBySector(data) {
    if (!data) return {};
    return data.reduce((acc, stock) => {
        const sector = stock.sector_zh || '其他';
        if (!acc[sector]) { acc[sector] = { stocks: [], total_market_cap: 0 }; }
        acc[sector].stocks.push(stock);
        acc[sector].total_market_cap += (stock.market_cap || 0);
        return acc;
    }, {});
}

// 根据涨跌幅获取颜色类
function getColorClass(change) {
    if (isNaN(change) || Math.abs(change) < 0.01) return 'flat';
    if (change >= 3) return 'gain-5'; if (change >= 2) return 'gain-4'; if (change >= 1) return 'gain-3';
    if (change >= 0.25) return 'gain-2'; if (change > 0) return 'gain-1';
    if (change <= -3) return 'loss-5'; if (change <= -2) return 'loss-4'; if (change <= -1) return 'loss-3';
    if (change <= -0.25) return 'loss-2'; return 'loss-1';
}

// SPA导航函数
function navigate(event, path) {
    event.preventDefault();
    window.history.pushState({}, '', path);
    router();
}

// 渲染股票详情页
async function renderStockDetailPage(symbol) {
    try {
        appContainer.innerHTML = `<div class="loading-indicator"><div class="spinner"></div><p>正在加载 ${symbol} 的详细数据...</p></div>`;
        
        // 所有股票都跳转到外部增强版详情页，传递股票代码参数
        const externalDetailUrl = `https://stock-details-final-bwjamhrli-simon-pans-projects.vercel.app/?symbol=${symbol}`;
        window.location.href = externalDetailUrl;
        return;
        
        const res = await fetch(`/api/stocks?ticker=${symbol}`);
        if (!res.ok) throw new Error('获取股票详情失败');
        const { profile, quote } = await res.json();
        
        const nameZh = profile.name_zh || ''; 
        const sectorZh = profile.sector_zh || profile.finnhubIndustry || 'N/A';
        const description = profile.description || '暂无公司简介。';
        const change = quote.dp || 0; 
        const changeAmount = quote.d || 0; 
        const changeClass = change >= 0 ? 'gain' : 'loss';
        const marketCapBillion = profile.marketCapitalization ? (profile.marketCapitalization / 1000).toFixed(2) : 'N/A';
        const shareBillion = profile.shareOutstanding ? (profile.shareOutstanding / 1000).toFixed(2) : 'N/A';
        const high = quote.h || 0; 
        const low = quote.l || 0; 
        const currentPrice = quote.c || 0; 
        const openPrice = quote.o || 0;

        document.title = `${nameZh} (${profile.ticker}) - 股票详情`;
        
        appContainer.innerHTML = `
            <header class="header">
                <h1>${nameZh} ${profile.name} (${profile.ticker})</h1>
                <a href="javascript:history.back()" class="back-link" onclick="navigate(event, document.referrer || '/')">← 返回上一页</a>
                <div class="upgrade-notice">
                    <p>💡 想要查看更详细的股票分析？ <a href="./details/stock-detail.html?symbol=${symbol}" class="upgrade-link">点击查看增强版详情页</a></p>
                </div>
            </header>
            <div class="stock-detail-page">
                <main class="main-content">
                    <div class="card">
                        <div class="stock-header">
                            <div class="stock-identity">
                                <img src="${profile.logo}" alt="${profile.name} Logo" class="stock-logo" onerror="this.style.display='none'">
                                <div class="stock-name">
                                    <h1>${profile.name}</h1>
                                    <p>${profile.exchange}: ${profile.ticker}</p>
                                </div>
                            </div>
                            <div class="stock-price-info">
                                <div class="current-price">${currentPrice.toFixed(2)} <span class="price-change ${changeClass}">${change >= 0 ? '+' : ''}${changeAmount.toFixed(2)} (${change.toFixed(2)}%)</span></div>
                                <div class="market-status">数据来源: Finnhub</div>
                            </div>
                        </div>
                    </div>
                    <section class="chart-section">
                        <div class="chart-placeholder">
                            <p>📈 K线图功能正在开发中...</p>
                            <p><a href="./details/stock-detail.html?symbol=${symbol}" class="chart-upgrade-link">查看增强版图表分析</a></p>
                        </div>
                    </section>
                </main>
                <aside class="right-sidebar">
                    <div class="card">
                        <h2 class="card-title">关于 ${nameZh}</h2>
                        <p class="company-info-text">${description}</p>
                        <div class="summary-item"><span class="label">市值</span><span class="value">${marketCapBillion}B USD</span></div>
                        <div class="summary-item"><span class="label">总股本</span><span class="value">${shareBillion}B</span></div>
                        <div class="summary-item"><span class="label">行业</span><span class="value">${sectorZh}</span></div>
                        <div class="summary-item"><span class="label">官网</span><span class="value"><a href="${profile.weburl}" target="_blank" rel="noopener noreferrer">${profile.weburl ? profile.weburl.replace(/^(https?:\/\/)?(www\.)?/, '') : 'N/A'}</a></span></div>
                    </div>
                    <div class="card">
                        <h2 class="card-title">关键数据</h2>
                        <div class="summary-item"><span class="label">开盘价</span><span class="value">${openPrice.toFixed(2)}</span></div>
                        <div class="summary-item"><span class="label">最高价</span><span class="value">${high.toFixed(2)}</span></div>
                        <div class="summary-item"><span class="label">最低价</span><span class="value">${low.toFixed(2)}</span></div>
                    </div>
                    <div class="card upgrade-card">
                        <h2 class="card-title">🚀 增强功能</h2>
                        <p>升级到增强版详情页，获得：</p>
                        <ul>
                            <li>📊 交互式价格图表</li>
                            <li>📈 技术指标分析</li>
                            <li>💰 详细财务数据</li>
                            <li>📰 相关新闻链接</li>
                        </ul>
                        <a href="./details/stock-detail.html?symbol=${symbol}" class="upgrade-button">立即体验</a>
                    </div>
                </aside>
            </div>
        `;
    } catch (error) {
        console.error('Error rendering stock detail page:', error);
        appContainer.innerHTML = `<div class="loading-indicator">${error.message}</div>`;
    }
}

// 更新缓存状态显示
function updateCacheStatus(meta) {
    const statusEl = document.getElementById('cache-status');
    if (!statusEl) return;
    
    const { total, cached, updated, marketStatus, cacheMinutes, processingTime } = meta;
    const cacheHitRate = total > 0 ? ((cached / total) * 100).toFixed(1) : '0';
    
    statusEl.innerHTML = `
        <div class="cache-info">
            <span class="cache-stat">📊 ${total}只股票</span>
            <span class="cache-stat">⚡ ${cacheHitRate}%缓存命中</span>
            <span class="cache-stat">🔄 ${updated}只更新</span>
            <span class="cache-stat">📈 ${marketStatus}</span>
            <span class="cache-stat">⏱️ ${processingTime}ms</span>
        </div>
    `;
    statusEl.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        if (statusEl) statusEl.style.display = 'none';
    }, 3000);
}

// 当窗口大小改变时，重新渲染当前的视图
function rerenderCurrentView() {
    if (!fullMarketData) return; // 如果没有数据，则不执行任何操作
    const container = document.getElementById('heatmap-container-final');
    if (container) {
        const params = new URLSearchParams(window.location.search);
        const sector = params.get('sector');
        if (sector) {
            const dataToRender = fullMarketData.filter(stock => stock.sector_zh === decodeURIComponent(sector));
            generateTreemap(dataToRender, container, false);
        } else {
            generateTreemap(fullMarketData, container, true);
        }
    }
}