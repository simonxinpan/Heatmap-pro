// /api/stocks-simple.js - 热力图专用API
// 返回简化的股票数据，专门为热力图组件优化

import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// 模拟数据 - 当数据库不可用时使用
const mockStockData = [
    // 科技股
    { ticker: 'AAPL', name_zh: '苹果公司', sector_zh: '信息技术', market_cap: 2450000000000, change_percent: 1.69 },
    { ticker: 'MSFT', name_zh: '微软', sector_zh: '信息技术', market_cap: 2200000000000, change_percent: 0.85 },
    { ticker: 'GOOGL', name_zh: '谷歌A', sector_zh: '信息技术', market_cap: 1500000000000, change_percent: -0.42 },
    { ticker: 'NVDA', name_zh: '英伟达', sector_zh: '半导体', market_cap: 900000000000, change_percent: 3.45 },
    { ticker: 'META', name_zh: 'Meta Platforms', sector_zh: '信息技术', market_cap: 750000000000, change_percent: 1.87 },
    { ticker: 'TSLA', name_zh: '特斯拉', sector_zh: '非必需消费品', market_cap: 800000000000, change_percent: -1.23 },
    { ticker: 'AMZN', name_zh: '亚马逊', sector_zh: '非必需消费品', market_cap: 1200000000000, change_percent: 2.15 },
    
    // 金融股
    { ticker: 'BRK.B', name_zh: '伯克希尔哈撒韦B', sector_zh: '金融', market_cap: 650000000000, change_percent: 0.45 },
    { ticker: 'JPM', name_zh: '摩根大通', sector_zh: '金融', market_cap: 420000000000, change_percent: 1.23 },
    { ticker: 'V', name_zh: 'Visa', sector_zh: '信息技术', market_cap: 380000000000, change_percent: 0.78 },
    { ticker: 'MA', name_zh: '万事达', sector_zh: '信息技术', market_cap: 320000000000, change_percent: 1.12 },
    { ticker: 'BAC', name_zh: '美国银行', sector_zh: '金融', market_cap: 280000000000, change_percent: -0.34 },
    
    // 医疗保健
    { ticker: 'JNJ', name_zh: '强生', sector_zh: '医疗保健', market_cap: 450000000000, change_percent: 0.56 },
    { ticker: 'UNH', name_zh: '联合健康', sector_zh: '医疗保健', market_cap: 480000000000, change_percent: 1.89 },
    { ticker: 'PFE', name_zh: '辉瑞', sector_zh: '医疗保健', market_cap: 220000000000, change_percent: -0.67 },
    { ticker: 'ABBV', name_zh: '艾伯维', sector_zh: '医疗保健', market_cap: 260000000000, change_percent: 0.89 },
    
    // 消费品
    { ticker: 'PG', name_zh: '宝洁', sector_zh: '日常消费品', market_cap: 340000000000, change_percent: 0.23 },
    { ticker: 'KO', name_zh: '可口可乐', sector_zh: '日常消费品', market_cap: 250000000000, change_percent: 0.45 },
    { ticker: 'PEP', name_zh: '百事可乐', sector_zh: '日常消费品', market_cap: 230000000000, change_percent: 0.67 },
    { ticker: 'WMT', name_zh: '沃尔玛', sector_zh: '日常消费品', market_cap: 420000000000, change_percent: 1.34 },
    
    // 工业
    { ticker: 'BA', name_zh: '波音', sector_zh: '工业', market_cap: 120000000000, change_percent: -2.45 },
    { ticker: 'CAT', name_zh: '卡特彼勒', sector_zh: '工业', market_cap: 140000000000, change_percent: 1.56 },
    { ticker: 'GE', name_zh: '通用电气', sector_zh: '工业', market_cap: 110000000000, change_percent: 0.78 },
    
    // 能源
    { ticker: 'XOM', name_zh: '埃克森美孚', sector_zh: '能源', market_cap: 380000000000, change_percent: 2.34 },
    { ticker: 'CVX', name_zh: '雪佛龙', sector_zh: '能源', market_cap: 290000000000, change_percent: 1.78 },
    
    // 公用事业
    { ticker: 'NEE', name_zh: '新纪元能源', sector_zh: '公用事业', market_cap: 150000000000, change_percent: 0.45 },
    { ticker: 'DUK', name_zh: '杜克能源', sector_zh: '公用事业', market_cap: 75000000000, change_percent: 0.23 },
    
    // 房地产
    { ticker: 'AMT', name_zh: '美国电塔', sector_zh: '房地产', market_cap: 95000000000, change_percent: 1.12 },
    { ticker: 'PLD', name_zh: '普洛斯', sector_zh: '房地产', market_cap: 85000000000, change_percent: 0.89 },
    
    // 原材料
    { ticker: 'LIN', name_zh: '林德', sector_zh: '原材料', market_cap: 180000000000, change_percent: 0.67 },
    { ticker: 'NEM', name_zh: '纽蒙特矿业', sector_zh: '原材料', market_cap: 45000000000, change_percent: -1.23 },
    
    // 通讯服务
    { ticker: 'T', name_zh: '美国电话电报', sector_zh: '通讯服务', market_cap: 120000000000, change_percent: -0.45 },
    { ticker: 'VZ', name_zh: '威瑞森', sector_zh: '通讯服务', market_cap: 160000000000, change_percent: 0.34 },
    
    // 媒体娱乐
    { ticker: 'DIS', name_zh: '迪士尼', sector_zh: '媒体娱乐', market_cap: 180000000000, change_percent: 1.45 },
    { ticker: 'NFLX', name_zh: '奈飞', sector_zh: '媒体娱乐', market_cap: 180000000000, change_percent: 2.34 },
    
    // 更多半导体
    { ticker: 'INTC', name_zh: '英特尔', sector_zh: '半导体', market_cap: 200000000000, change_percent: -0.89 },
    { ticker: 'AMD', name_zh: '超威半导体', sector_zh: '半导体', market_cap: 220000000000, change_percent: 2.67 },
    { ticker: 'QCOM', name_zh: '高通', sector_zh: '半导体', market_cap: 180000000000, change_percent: 1.23 },
    { ticker: 'AVGO', name_zh: '博通', sector_zh: '半导体', market_cap: 520000000000, change_percent: 0.78 }
];

export default async function handler(request, response) {
    try {
        // 从URL参数中获取sector筛选条件
        const url = new URL(request.url, `http://${request.headers.host}`);
        const sector = url.searchParams.get('sector');
        
        console.log(`🔄 Fetching simplified stock data for heatmap${sector ? ` (sector: ${sector})` : ' (all sectors)'}...`);
        
        // 设置强缓存头，提升性能
        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // 5分钟缓存，10分钟过期重新验证
        response.setHeader('CDN-Cache-Control', 'max-age=300'); // CDN缓存5分钟
        response.setHeader('Vary', 'Accept-Encoding'); // 支持压缩缓存
        
        // 尝试从数据库获取数据
        try {
            let query = `
                SELECT 
                    ticker,
                    name_zh,
                    sector_zh,
                    market_cap,
                    change_percent,
                    volume,
                    last_updated
                FROM stocks
                WHERE 
                    sector_zh IS NOT NULL AND sector_zh != '' AND
                    market_cap IS NOT NULL AND market_cap > 0 AND
                    change_percent IS NOT NULL
            `;
            
            let queryParams = [];
            
            // 如果提供了sector参数，添加筛选条件
            if (sector) {
                query += ` AND sector_zh = $1`;
                queryParams.push(sector);
            }
            
            query += ` ORDER BY market_cap DESC LIMIT 502`;
            
            const { rows: stocks } = await pool.query(query, queryParams);
            
            if (stocks.length > 0) {
                console.log(`✅ Successfully fetched ${stocks.length} stocks from database`);
                
                // 添加数据时间戳
                const responseData = {
                    data: stocks,
                    timestamp: new Date().toISOString(),
                    count: stocks.length,
                    source: 'database'
                };
                
                response.writeHead(200, { 'Content-Type': 'application/json' });
                return response.end(JSON.stringify(responseData));
            }
        } catch (dbError) {
            console.log('⚠️ Database unavailable, using mock data:', dbError.message);
        }
        
        // 如果数据库不可用或没有数据，使用模拟数据
        let filteredMockData = mockStockData;
        
        // 如果提供了sector参数，筛选模拟数据
        if (sector) {
            filteredMockData = mockStockData.filter(stock => stock.sector_zh === sector);
        }
        
        console.log(`📊 Using mock data: ${filteredMockData.length} stocks${sector ? ` (sector: ${sector})` : ''}`);
        response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120'); // 较短缓存
        
        const responseData = {
            data: filteredMockData,
            timestamp: new Date().toISOString(),
            count: filteredMockData.length,
            source: 'mock',
            sector: sector || 'all'
        };
        
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(responseData));
        
    } catch (error) {
        console.error('❌ API /stocks-simple.js Error:', error);
        
        // 最后的后备方案：返回模拟数据
        console.log('🔄 Fallback to mock data due to error');
        response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        
        let fallbackMockData = mockStockData;
        
        // 如果提供了sector参数，筛选模拟数据
        if (sector) {
            fallbackMockData = mockStockData.filter(stock => stock.sector_zh === sector);
        }
        
        const responseData = {
            data: fallbackMockData,
            timestamp: new Date().toISOString(),
            count: fallbackMockData.length,
            source: 'mock',
            sector: sector || 'all',
            error: 'Database connection failed'
        };
        
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(responseData));
    }
}
