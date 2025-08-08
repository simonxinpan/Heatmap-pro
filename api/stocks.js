// /api/stocks.js - 快速数据读取API (从数据库缓存读取)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export default async function handler(request, response) {
    try {
        console.log("📊 Reading cached stock data from Neon DB...");
        
        // 直接从数据库读取已缓存的股票数据（包含最新报价）
        const { rows: stocks } = await pool.query(`
            SELECT 
                ticker, 
                name_zh, 
                sector_zh, 
                market_cap, 
                logo,
                last_price,
                change_amount,
                change_percent,
                last_updated
            FROM stocks 
            ORDER BY sector_zh, ticker
        `);
        
        if (stocks.length === 0) {
            return response.status(404).json({ error: "No stocks found in database." });
        }
        
        // 转换为前端期望的数据格式
        const heatmapData = stocks.map(stock => ({
            ticker: stock.ticker,
            name_zh: stock.name_zh,
            sector_zh: stock.sector_zh,
            market_cap: stock.market_cap,
            logo: stock.logo,
            // 嵌套 quote 对象以保持前端兼容性
            quote: {
                c: stock.last_price || 0,      // 当前价格
                d: stock.change_amount || 0,    // 变化金额
                dp: stock.change_percent || 0,  // 变化百分比
                pc: stock.last_price ? (stock.last_price - (stock.change_amount || 0)) : 0, // 前收盘价
                o: 0, h: 0, l: 0, v: 0  // 其他字段暂时设为0
            },
            last_updated: stock.last_updated
        }));
        
        console.log(`✅ Successfully retrieved ${heatmapData.length} stocks from cache`);
        
        // 设置缓存头
        response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("❌ Error reading stock data from database:", error);
        response.status(500).json({ 
            error: 'Failed to retrieve stock data from cache.',
            details: error.message 
        });
    }
}