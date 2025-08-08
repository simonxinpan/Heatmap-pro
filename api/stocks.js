// /api/stocks.js (最终高性能版，带后端过滤)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// ... getQuotesFromFinnhub 和 getPreviousDayCloseFromPolygon 函数和之前一样 ...

async function getPreviousDayCloseFromPolygon(apiKey) {
    // ... 和之前一样 ...
}

export default async function handler(request, response) {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!FINNHUB_API_KEY || !POLYGON_API_KEY) {
        return response.status(500).json({ error: 'API keys are not fully configured.' });
    }

    try {
        // 1. 从数据库获取我们需要的 502 个股票 ticker
        const { rows: companies } = await pool.query('SELECT ticker, name_zh, sector_zh FROM stocks;');
        const wantedTickers = new Set(companies.map(c => c.ticker)); // 使用 Set 以获得 O(1) 的查找性能

        // 2. 并行获取 Finnhub 和 Polygon 的数据
        const [finnhubQuotes, polygonPrevDayCloses] = await Promise.all([
            getQuotesFromFinnhub(companies.map(c => c.ticker), FINNHUB_API_KEY),
            getPreviousDayCloseFromPolygon(POLYGON_API_KEY) // 这会返回一个包含 1万+ 股票的 Map
        ]);
        
        // 3. *** 核心修复：在后端进行数据过滤和整合 ***
        const heatmapData = [];
        for (const company of companies) {
            const ticker = company.ticker;
            // 只处理我们数据库里有的股票
            if (wantedTickers.has(ticker)) {
                const finnhubQuote = finnhubQuotes[ticker];
                
                let change_percent = 0;
                
                if (finnhubQuote && typeof finnhubQuote.dp === 'number') {
                    change_percent = finnhubQuote.dp;
                } 
                else if (finnhubQuote && typeof finnhubQuote.c === 'number' && polygonPrevDayCloses.has(ticker)) {
                    const prevClose = polygonPrevDayCloses.get(ticker);
                    if (prevClose > 0) {
                        change_percent = ((finnhubQuote.c - prevClose) / prevClose) * 100;
                    }
                }

                heatmapData.push({
                    ticker: ticker,
                    name_zh: company.name_zh,
                    sector_zh: company.sector_zh,
                    change_percent: change_percent,
                });
            }
        }
        
        console.log(`Returning filtered ${heatmapData.length} stocks to the frontend.`);

        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    }
}

// 辅助函数 getQuotesFromFinnhub ...