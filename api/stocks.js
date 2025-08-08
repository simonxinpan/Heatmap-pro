// /api/stocks.js (最终高性能版 - 完全依赖 Polygon)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// --- 辅助函数：从 Polygon 获取前一日市场快照 ---
async function getPreviousDaySnapshot(apiKey) {
    let date = new Date();
    let polygonData = null;
    
    // 尝试回溯最多5天，以找到最近的一个有数据的交易日
    for (let i = 0; i < 5; i++) {
        // 避开周末
        if (date.getDay() === 0) date.setDate(date.getDate() - 2); // 周日 -> 周五
        else if (date.getDay() === 1) date.setDate(date.getDate() - 3); // 周一 -> 周五
        else date.setDate(date.getDate() - 1); // 其他情况 -> 前一天

        const tradeDate = date.toISOString().split('T')[0];
        const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${tradeDate}?adjusted=true&apiKey=${apiKey}`;
        
        try {
            console.log(`[Polygon] Attempting to fetch snapshot for date: ${tradeDate}`);
            const response = await fetch(url);
            if (response.ok) {
                polygonData = await response.json();
                if (polygonData && polygonData.resultsCount > 0) {
                    console.log(`[Polygon] Successfully found snapshot for date: ${tradeDate}`);
                    break; // 找到数据，成功跳出循环
                }
            }
        } catch (error) { console.error(`[Polygon] Failed to fetch for date ${tradeDate}:`, error.message); }
    }

    // 将返回的数组转换为一个易于查询的 Map 对象
    const quotesMap = new Map();
    if (polygonData && polygonData.results) {
        polygonData.results.forEach(quote => {
            // 我们需要 'c' (收盘价) 和 'o' (开盘价) 来计算涨跌幅
            quotesMap.set(quote.T, { c: quote.c, o: quote.o });
        });
    }
    console.log(`[Polygon] Built snapshot map with ${quotesMap.size} tickers.`);
    return quotesMap;
}

// --- API 主处理函数 ---
export default async function handler(request, response) {
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!POLYGON_API_KEY) {
        return response.status(500).json({ error: 'Polygon API key is not configured.' });
    }

    try {
        // 1. 从数据库获取我们需要的 502 个股票 ticker
        const { rows: companies } = await pool.query('SELECT ticker, name_zh, sector_zh FROM stocks;');
        
        // 2. **一次网络请求**从 Polygon 获取全市场快照
        const polygonSnapshot = await getPreviousDaySnapshot(POLYGON_API_KEY);
        
        // 3. 在后端进行数据整合
        const heatmapData = companies.map(company => {
            const ticker = company.ticker;
            const quote = polygonSnapshot.get(ticker);
            
            let change_percent = 0;
            // 使用前一日的开盘价和收盘价来计算涨跌幅
            if (quote && quote.o > 0) {
                change_percent = ((quote.c - quote.o) / quote.o) * 100;
            }

            return {
                ticker: ticker,
                name_zh: company.name_zh,
                sector_zh: company.sector_zh,
                change_percent: change_percent,
            };
        });
        
        console.log(`Returning ${heatmapData.length} stocks to the frontend.`);

        response.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800'); // 缓存15分钟
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    }
}