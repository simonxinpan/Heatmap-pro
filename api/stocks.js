// /api/stocks.js (最终读取器版本 - 纯数据库读取)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// --- API 主处理函数 ---
export default async function handler(request, response) {
    try {
        console.log('Fetching stock data from database...');
        
        // 从数据库获取完整的股票数据
        const { rows: stocks } = await pool.query(`
            SELECT 
                ticker,
                name_zh,
                sector_zh,
                price,
                change_amount,
                change_percent,
                volume,
                market_cap,
                pe_ratio,
                dividend_yield,
                updated_at
            FROM stocks
            ORDER BY ticker
        `);
        
        if (stocks.length === 0) {
            return response.status(404).json({ 
                error: "No stocks found in database.",
                hint: "Please run the database initialization script first."
            });
        }
        
        // 格式化数据为热力图所需格式
        const heatmapData = stocks.map(stock => ({
            ticker: stock.ticker,
            name_zh: stock.name_zh,
            sector_zh: stock.sector_zh,
            price: stock.price || 0,
            change_amount: stock.change_amount || 0,
            change_percent: stock.change_percent || 0,
            volume: stock.volume || 0,
            market_cap: stock.market_cap || 0,
            pe_ratio: stock.pe_ratio || null,
            dividend_yield: stock.dividend_yield || null,
            tags: [],
            updated_at: stock.updated_at
        }));
        
        console.log(`Successfully fetched ${heatmapData.length} stocks from database`);
        
        // 设置缓存头
        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        response.status(200).json({
            success: true,
            data: heatmapData,
            count: heatmapData.length,
            last_updated: stocks[0]?.updated_at || null
        });
        
    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ 
            success: false,
            error: 'Failed to fetch stock data from database.',
            details: error.message
        });
    }
}