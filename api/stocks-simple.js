// /api/stocks-simple.js (最终修复版 - 适应真实DB结构)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// --- 辅助函数：从 Polygon 获取前一日市场快照 ---
async function getPreviousDaySnapshot(apiKey) {
    let date = new Date();
    let polygonData = null;
    for (let i = 0; i < 7; i++) {
        const tradeDate = date.toISOString().split('T')[0];
        const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${tradeDate}?adjusted=true&apiKey=${apiKey}`;
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (response.ok) {
                polygonData = await response.json();
                if (polygonData && polygonData.resultsCount > 0) {
                    console.log(`[Polygon] Successfully found snapshot for date: ${tradeDate}`);
                    break;
                }
            }
        } catch (error) { console.error(`[Polygon] Failed for date ${tradeDate}:`, error.message); }
        date.setDate(date.getDate() - 1);
    }
    const quotesMap = new Map();
    if (polygonData && polygonData.results) {
        polygonData.results.forEach(quote => {
            if (quote.T && typeof quote.c === 'number' && typeof quote.o === 'number') {
                 quotesMap.set(quote.T, { c: quote.c, o: quote.o });
            }
        });
    }
    return quotesMap;
}

// --- API 主处理函数 ---
export default async function handler(request, response) {
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!POLYGON_API_KEY) {
        return response.status(500).json({ error: 'Polygon API key is not configured.' });
    }

    const client = await pool.connect();
    try {
        // 1. **核心修复：只查询数据库中确定存在的列！**
        console.log("Fetching company list from Neon DB...");
        const { rows: companies } = await client.query('SELECT ticker, name_zh, sector_zh, market_cap FROM stocks;');
         
        // 2. 从 Polygon 获取全市场快照
        const polygonSnapshot = await getPreviousDaySnapshot(POLYGON_API_KEY);
         
        // 3. 在后端进行数据整合
        const heatmapData = companies.map(company => {
            const ticker = company.ticker;
            const quote = polygonSnapshot.get(ticker);
            let change_percent = 0;
            if (quote && quote.o > 0) {
                change_percent = ((quote.c - quote.o) / quote.o) * 100;
            }
            return {
                ticker: ticker,
                name_zh: company.name_zh,
                sector_zh: company.sector_zh,
                market_cap: company.market_cap,
                change_percent: change_percent,
            };
        });
         
        console.log(`Returning ${heatmapData.length} stocks to the frontend.`);
        response.setHeader('Cache-control', 's-maxage=900, stale-while-revalidate=1800');
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks-simple.js CRITICAL ERROR:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    } finally {
        if (client) client.release();
    }
}