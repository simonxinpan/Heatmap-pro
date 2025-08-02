import { Pool } from 'pg';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 数据库连接配置
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export default async function handler(request, response) {
     if (request.method !== 'GET') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }
    
    // 股票详情页逻辑保持不变
    const { searchParams } = new URL(request.url, `https://${request.headers.host}`);
    const ticker = searchParams.get('ticker');
    if (ticker) {
        try {
            const data = await fetchSingleStockData(pool, ticker);
            return response.status(200).json(data);
        } catch(error) {
            console.error(`[PG] Error fetching single stock data for ${ticker}:`, error.message);
            return response.status(500).json({ error: 'Failed to fetch stock detail.' });
        }
    }

    // ===================================================================
    // ================== 这是我们最核心的逻辑修改 ==================
    // ===================================================================
    // 热力图主页逻辑
    try {
        console.log("[PG] Fetching all heatmap data from 'stocks' table, ORDERED BY MARKET CAP...");
        
        // 在SQL查询中直接加入 ORDER BY market_cap DESC
        const { rows } = await pool.query(`
            SELECT ticker, name_zh, sector_zh, market_cap, change_percent, logo 
            FROM stocks
            ORDER BY market_cap DESC
        `);
        
        console.log(`[PG] Successfully returned ${rows ? rows.length : 0} stocks for heatmap, sorted by market cap.`);
        response.status(200).json(rows || []);

    } catch (error) {
        console.error('[PG] Stocks API Error:', error.message, error.stack);
        response.status(500).json({ error: 'Failed to fetch stock data from database.' });
    }
}


// fetchSingleStockData 函数保持不变
async function fetchSingleStockData(pool, ticker) {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) throw new Error('FINNHUB_API_KEY is not configured.');
    const { rows } = await pool.query('SELECT name_zh, sector_zh FROM stock_list WHERE ticker = $1', [ticker]);
    const stockInfo = rows[0];
    if (!stockInfo) console.warn(`Could not find static info for ${ticker} in stock_list.`);
    const fetchFromFinnhub = async (endpoint) => {
        const url = `https://finnhub.io/api/v1${endpoint}&token=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Finnhub API error for ${url}: ${res.statusText}`);
        return res.json();
    };
    const [profile, quote] = await Promise.all([
        fetchFromFinnhub(`/stock/profile2?symbol=${ticker}`),
        fetchFromFinnhub(`/quote?symbol=${ticker}`)
    ]);
    const name_zh_final = stockInfo?.name_zh || profile.name || ticker;
    const sector_zh_final = stockInfo?.sector_zh || profile.finnhubIndustry || 'N/A';
    const description = `${name_zh_final} (${profile.name || ''}) 是一家总部位于 ${profile.country || '未知'} 的公司，属于 ${sector_zh_final} 行业，于 ${profile.ipo || '未知日期'} 上市。`;
    return {
        profile: { ...profile, description, name_zh: name_zh_final, sector_zh: sector_zh_final },
        quote
    };
}