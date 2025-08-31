const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

// 设置静态文件服务
app.use(express.static(__dirname));

// 设置CORS头
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 主页路由 - 重定向到热力图中心
app.get('/', (req, res) => {
    res.redirect('/heatmap-center.html');
});

// 热力图中心页面
app.get('/heatmap-center.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'heatmap-center.html'));
});

// 标签广场页面（如果存在）
app.get('/index.html', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('标签广场页面暂未创建');
    }
});

// 趋势榜单页面（如果存在）
app.get('/trending.html', (req, res) => {
    const trendingPath = path.join(__dirname, 'trending.html');
    if (fs.existsSync(trendingPath)) {
        res.sendFile(trendingPath);
    } else {
        res.status(404).send('趋势榜单页面暂未创建');
    }
});

// 行业仪表盘API
app.get('/api/sector-dashboard', (req, res) => {
    // 定义行业列表和对应的中文名称
    const sectors = [
        { key: 'technology', name: '信息技术', icon: '💻' },
        { key: 'healthcare', name: '医疗保健', icon: '🏥' },
        { key: 'financial', name: '金融服务', icon: '🏦' },
        { key: 'consumer', name: '非必需消费品', icon: '🛍️' },
        { key: 'energy', name: '能源', icon: '⚡' },
        { key: 'industrial', name: '工业', icon: '🏭' },
        { key: 'semiconductor', name: '半导体', icon: '🔬' },
        { key: 'telecom', name: '通讯服务', icon: '📡' },
        { key: 'media', name: '媒体娱乐', icon: '🎬' },
        { key: 'finance', name: '金融', icon: '💰' }
    ];

    const dashboardData = sectors.map(sector => {
        const stockCount = Math.floor(Math.random() * 100) + 20;
        const weightedAvgChange = (Math.random() - 0.5) * 8;
        const totalMarketCap = Math.random() * 5000 + 1000;
        const volume = Math.random() * 100 + 20;
        
        const leadingTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'PFE', 'XOM', 'BA'];
        const leadingTicker = leadingTickers[Math.floor(Math.random() * leadingTickers.length)];
        
        return {
            sector_key: sector.key,
            sector_zh: sector.name,
            sector_icon: sector.icon,
            stock_count: stockCount,
            weighted_avg_change: Number(weightedAvgChange.toFixed(2)),
            total_market_cap: Number(totalMarketCap.toFixed(1)),
            volume: Number(volume.toFixed(1)),
            leading_ticker: leadingTicker,
            rising_stocks: Math.floor(stockCount * (0.3 + Math.random() * 0.4)),
            falling_stocks: Math.floor(stockCount * (0.2 + Math.random() * 0.3)),
            last_updated: new Date().toISOString()
        };
    });

    res.json({
        success: true,
        data: dashboardData.sort((a, b) => b.total_market_cap - a.total_market_cap),
        timestamp: new Date().toISOString()
    });
});

// API路由 - 模拟股票数据
app.get('/api/stocks', (req, res) => {
    // 模拟股票数据
    const mockStocks = [
        {
            ticker: 'AAPL',
            name: '苹果公司',
            sector: '科技',
            market_cap: 2800000000000,
            change_percent: 2.5,
            price: 175.43
        },
        {
            ticker: 'MSFT',
            name: '微软公司',
            sector: '科技',
            market_cap: 2400000000000,
            change_percent: 1.8,
            price: 338.11
        },
        {
            ticker: 'GOOGL',
            name: '谷歌',
            sector: '科技',
            market_cap: 1600000000000,
            change_percent: -0.5,
            price: 127.85
        },
        {
            ticker: 'TSLA',
            name: '特斯拉',
            sector: '汽车',
            market_cap: 800000000000,
            change_percent: 3.2,
            price: 248.50
        },
        {
            ticker: 'NVDA',
            name: '英伟达',
            sector: '科技',
            market_cap: 1200000000000,
            change_percent: 4.1,
            price: 485.20
        }
    ];
    
    res.json(mockStocks);
});

// API路由 - 简化股票数据（支持sector筛选）
app.get('/api/stocks-simple', (req, res) => {
    const { sector } = req.query;
    
    // 扩展的模拟股票数据
    const allStocks = [
        { ticker: 'AAPL', name_zh: '苹果公司', sector_zh: '信息技术', market_cap: 2800000000000, change_percent: 2.5 },
        { ticker: 'MSFT', name_zh: '微软', sector_zh: '信息技术', market_cap: 2400000000000, change_percent: 1.8 },
        { ticker: 'GOOGL', name_zh: '谷歌', sector_zh: '信息技术', market_cap: 1600000000000, change_percent: -0.5 },
        { ticker: 'NVDA', name_zh: '英伟达', sector_zh: '信息技术', market_cap: 1200000000000, change_percent: 4.1 },
        { ticker: 'META', name_zh: '脸书', sector_zh: '信息技术', market_cap: 800000000000, change_percent: 1.2 },
        { ticker: 'TSLA', name_zh: '特斯拉', sector_zh: '汽车', market_cap: 800000000000, change_percent: 3.2 },
        { ticker: 'JPM', name_zh: '摩根大通', sector_zh: '金融', market_cap: 450000000000, change_percent: 0.8 },
        { ticker: 'BAC', name_zh: '美国银行', sector_zh: '金融', market_cap: 280000000000, change_percent: -0.3 },
        { ticker: 'WFC', name_zh: '富国银行', sector_zh: '金融', market_cap: 180000000000, change_percent: 1.1 },
        { ticker: 'JNJ', name_zh: '强生', sector_zh: '医疗保健', market_cap: 420000000000, change_percent: 0.5 },
        { ticker: 'PFE', name_zh: '辉瑞', sector_zh: '医疗保健', market_cap: 220000000000, change_percent: -1.2 },
        { ticker: 'UNH', name_zh: '联合健康', sector_zh: '医疗保健', market_cap: 480000000000, change_percent: 2.1 }
    ];
    
    // 根据sector参数筛选
    let filteredStocks = allStocks;
    if (sector) {
        filteredStocks = allStocks.filter(stock => stock.sector_zh === sector);
    }
    
    // 返回数据格式
    const response = {
        data: filteredStocks,
        timestamp: new Date().toISOString(),
        source: 'mock',
        sector: sector || null,
        total: filteredStocks.length
    };
    
    res.json(response);
});

// API路由 - 模拟行业数据
app.get('/api/sectors', (req, res) => {
    const mockSectors = [
        { name: '科技', count: 120, change_percent: 2.1 },
        { name: '金融', count: 85, change_percent: -0.8 },
        { name: '医疗', count: 65, change_percent: 1.5 },
        { name: '消费', count: 78, change_percent: 0.3 },
        { name: '工业', count: 92, change_percent: -1.2 },
        { name: '能源', count: 45, change_percent: 3.8 }
    ];
    
    res.json(mockSectors);
});

// API路由 - 模拟标签数据
app.get('/api/tags', (req, res) => {
    const mockTags = [
        { id: 'ai', name: '人工智能', count: 25, trend: 'up' },
        { id: 'ev', name: '电动汽车', count: 18, trend: 'up' },
        { id: 'cloud', name: '云计算', count: 32, trend: 'stable' },
        { id: 'biotech', name: '生物技术', count: 15, trend: 'down' },
        { id: 'fintech', name: '金融科技', count: 22, trend: 'up' }
    ];
    
    res.json(mockTags);
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 热力图中心服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 访问热力图中心: http://localhost:${PORT}/heatmap-center.html`);
    console.log('按 Ctrl+C 停止服务器');
});

module.exports = app;