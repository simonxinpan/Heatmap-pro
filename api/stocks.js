// /api/stocks.js - 高性能缓存版本
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export default async function handler(request, response) {
    try {
        console.log("API /stocks.js called - 缓存版本");
        
        // 直接从数据库获取包含报价的股票数据
        const result = await pool.query(`
            SELECT 
                ticker as symbol, 
                name_zh as company_name, 
                market_cap,
                COALESCE(last_price, 0) as last_price,
                COALESCE(change_amount, 0) as change_amount,
                COALESCE(change_percent, 0) as change_percent,
                last_updated
            FROM stocks 
            ORDER BY market_cap DESC NULLS LAST
        `);
        
        const stocksData = result.rows;
        console.log(`从数据库获取到 ${stocksData.length} 只股票的缓存数据`);
        
        // 格式化返回数据
        const heatmapData = stocksData.map(stock => ({
            symbol: stock.symbol,
            company_name: stock.company_name,
            market_cap: stock.market_cap,
            last_price: parseFloat(stock.last_price) || 0,
            change_amount: parseFloat(stock.change_amount) || 0,
            change_percent: parseFloat(stock.change_percent) || 0
        }));

        console.log(`返回 ${heatmapData.length} 只股票数据给前端`);
        
        response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    }
}