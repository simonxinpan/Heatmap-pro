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