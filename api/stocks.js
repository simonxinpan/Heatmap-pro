// /api/stocks.js (最终完整版)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// --- 辅助函数 1: 从 Finnhub 批量获取实时报价 ---
async function getQuotesFromFinnhub(symbols, apiKey) {
    const quotes = {};
    const batchSize = 25;
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const promises = batch.map(symbol =>
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data) quotes[symbol] = data; })
                .catch(e => console.error(`Finnhub fetch failed for ${symbol}:`, e.message))
        );
        await Promise.allSettled(promises);
        if (i + batchSize < symbols.length) await new Promise(res => setTimeout(res, 1500));
    }
    console.log(`[Finnhub] Fetched quotes for ${Object.keys(quotes).length} symbols.`);
    return quotes;
}

// --- 辅助函数 2: 从 Polygon 获取前一日收盘价快照 ---
async function getPreviousDayCloseFromPolygon(apiKey) {
    let date = new Date();
    let polygonData = null;
    for (let i = 0; i < 5; i++) {
        date.setDate(date.getDate() - 1);
        if ([0, 6].includes(date.getDay())) continue;
        const tradeDate = date.toISOString().split('T')[0];
        const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${tradeDate}?adjusted=true&apiKey=${apiKey}`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                polygonData = await response.json();
                if (polygonData.resultsCount > 0) break;
            }
        } catch (error) { console.error(`[Polygon] Failed for date ${tradeDate}:`, error.message); }
    }
    const quotesMap = new Map();
    if (polygonData && polygonData.results) {
        polygonData.results.forEach(quote => quotesMap.set(quote.T, quote.c));
    }
    console.log(`[Polygon] Fetched previous day close for ${quotesMap.size} tickers.`);
    return quotesMap;
}

// --- API 主处理函数 ---
export default async function handler(request, response) {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!FINNHUB_API_KEY || !POLYGON_API_KEY) {
        return response.status(500).json({ error: 'API keys are not fully configured.' });
    }

    try {
        const { rows: companies } = await pool.query('SELECT ticker, name_zh, sector_zh FROM stocks;');
        const [finnhubQuotes, polygonPrevDayCloses] = await Promise.all([
            getQuotesFromFinnhub(companies.map(c => c.ticker), FINNHUB_API_KEY),
            getPreviousDayCloseFromPolygon(POLYGON_API_KEY)
        ]);
        
        const heatmapData = companies.map(company => {
            const ticker = company.ticker;
            const finnhubQuote = finnhubQuotes[ticker];
            let change_percent = 0;
            if (finnhubQuote && typeof finnhubQuote.dp === 'number') {
                change_percent = finnhubQuote.dp;
            } 
            else if (finnhubQuote && typeof finnhubQuote.c === 'number' && polygonPrevDayCloses.has(ticker)) {
                const prevClose = polygonPrevDayCloses.get(ticker);
                if (prevClose > 0) change_percent = ((finnhubQuote.c - prevClose) / prevClose) * 100;
            }
            return { ticker, name_zh: company.name_zh, sector_zh: company.sector_zh, change_percent };
        });

        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        response.status(200).json(heatmapData);
    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    }
}