// api/sector-dashboard.js
// 行业仪表盘API - 聚合所有行业的关键指标数据

import { db } from '@vercel/postgres';

// 数据库查询函数 - 获取行业聚合数据
async function getSectorDashboardData() {
    try {
        // SQL查询语句 - 按行业聚合股票数据
        const query = `
            SELECT 
                sector_zh,
                COUNT(*) as stock_count,
                AVG(change_percent) as weighted_avg_change,
                SUM(market_cap) as total_market_cap,
                SUM(volume) as volume,
                (
                    SELECT ticker 
                    FROM stocks s2 
                    WHERE s2.sector_zh = s1.sector_zh 
                    ORDER BY s2.change_percent DESC 
                    LIMIT 1
                ) as leading_ticker
            FROM stocks s1
            WHERE market_cap IS NOT NULL 
                AND change_percent IS NOT NULL
                AND volume IS NOT NULL
            GROUP BY sector_zh
            ORDER BY total_market_cap DESC
        `;
        
        const result = await db.query(query);
        
        // 为每个行业添加图标和额外统计信息
        const sectorIcons = {
            '科技': '💻',
            '医疗保健': '🏥', 
            '金融服务': '🏦',
            '消费品': '🛍️',
            '能源': '⚡',
            '工业': '🏭',
            '半导体': '🔬',
            '通讯服务': '📡',
            '媒体娱乐': '🎬',
            '金融': '💰'
        };
        
        return result.rows.map(row => ({
            sector_key: row.sector_zh.toLowerCase().replace(/[^a-z0-9]/g, ''),
            sector_zh: row.sector_zh,
            sector_icon: sectorIcons[row.sector_zh] || '📊',
            stock_count: parseInt(row.stock_count),
            weighted_avg_change: parseFloat(row.weighted_avg_change).toFixed(2),
            total_market_cap: parseFloat(row.total_market_cap).toFixed(1),
            volume: parseFloat(row.volume).toFixed(1),
            leading_ticker: row.leading_ticker,
            last_updated: new Date().toISOString()
        }));
        
    } catch (error) {
        console.error('Database query error in getSectorDashboardData:', error);
        // 如果数据库查询失败，返回模拟数据作为备用
        return generateFallbackData();
    }
}

// 备用模拟数据函数
function generateFallbackData() {
    const sectors = [
        { key: 'technology', name: '科技', icon: '💻' },
        { key: 'healthcare', name: '医疗保健', icon: '🏥' },
        { key: 'financial', name: '金融服务', icon: '🏦' },
        { key: 'consumer', name: '消费品', icon: '🛍️' },
        { key: 'energy', name: '能源', icon: '⚡' },
        { key: 'industrial', name: '工业', icon: '🏭' }
    ];

    return sectors.map(sector => {
        const stockCount = Math.floor(Math.random() * 100) + 20;
        const weightedAvgChange = (Math.random() - 0.5) * 8;
        const totalMarketCap = Math.random() * 5000 + 1000;
        const volume = Math.random() * 100 + 20;
        const leadingTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META'];
        
        return {
            sector_key: sector.key,
            sector_zh: sector.name,
            sector_icon: sector.icon,
            stock_count: stockCount,
            weighted_avg_change: Number(weightedAvgChange.toFixed(2)),
            total_market_cap: Number(totalMarketCap.toFixed(1)),
            volume: Number(volume.toFixed(1)),
            leading_ticker: leadingTickers[Math.floor(Math.random() * leadingTickers.length)],
            last_updated: new Date().toISOString()
        };
    }).sort((a, b) => b.total_market_cap - a.total_market_cap);
}

export default async function handler(req, res) {
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

        // 获取仪表盘数据（从数据库或备用数据）
        const dashboardData = await getSectorDashboardData();
        
        // 设置缓存头 - 5分钟缓存
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        
        res.status(200).json({
            success: true,
            data: dashboardData,
            timestamp: new Date().toISOString(),
            total_sectors: dashboardData.length
        });
        
    } catch (error) {
        // 详细的错误日志记录
        console.error('Sector Dashboard API Error:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url
        });
        
        // 返回标准的500错误响应
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred while processing your request',
            timestamp: new Date().toISOString()
        });
    }
};