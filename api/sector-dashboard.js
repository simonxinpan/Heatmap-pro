// api/sector-dashboard.js
// 行业仪表盘API - 聚合所有行业的关键指标数据

import fs from 'fs';
import path from 'path';

// 模拟数据库查询 - 在实际项目中这里应该连接真实数据库
function generateSectorDashboardData() {
    // 定义行业列表和对应的中文名称
    const sectors = [
        { key: 'technology', name: '科技', icon: '💻' },
        { key: 'healthcare', name: '医疗保健', icon: '🏥' },
        { key: 'financial', name: '金融服务', icon: '🏦' },
        { key: 'consumer', name: '消费品', icon: '🛍️' },
        { key: 'energy', name: '能源', icon: '⚡' },
        { key: 'industrial', name: '工业', icon: '🏭' },
        { key: 'semiconductor', name: '半导体', icon: '🔬' },
        { key: 'telecom', name: '通讯服务', icon: '📡' },
        { key: 'media', name: '媒体娱乐', icon: '🎬' },
        { key: 'finance', name: '金融', icon: '💰' }
    ];

    const dashboardData = sectors.map(sector => {
        // 生成每个行业的聚合指标
        const stockCount = Math.floor(Math.random() * 100) + 20; // 20-120只股票
        const weightedAvgChange = (Math.random() - 0.5) * 8; // -4% 到 +4%
        const totalMarketCap = Math.random() * 5000 + 1000; // 1000-6000亿
        const volume = Math.random() * 100 + 20; // 20-120亿交易量
        
        // 生成领涨/跌股票代码
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
            // 添加一些额外的统计信息
            rising_stocks: Math.floor(stockCount * (0.3 + Math.random() * 0.4)), // 30%-70%的股票上涨
            falling_stocks: Math.floor(stockCount * (0.2 + Math.random() * 0.3)), // 20%-50%的股票下跌
            last_updated: new Date().toISOString()
        };
    });

    // 按总市值排序
    return dashboardData.sort((a, b) => b.total_market_cap - a.total_market_cap);
}

export default function handler(req, res) {
    try {
        // 设置CORS头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        if (req.method !== 'GET') {
            res.status(405).json({ success: false, error: 'Method not allowed' });
            return;
        }

        // 生成仪表盘数据
        const dashboardData = generateSectorDashboardData();
        
        // 设置缓存头 - 5分钟缓存
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: dashboardData,
            timestamp: new Date().toISOString(),
            total_sectors: dashboardData.length
        }));
        
    } catch (error) {
        console.error('Sector Dashboard API Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: 'Internal server error',
            message: error.message
        }));
    }
};
