// /api/stocks.js (最终优化版 - 智能回退 + 高效 Polygon)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// --- 辅助函数 1: 从 Polygon 高效获取前一日市场快照 ---
async function getQuotesFromPolygon(apiKey) {
    let date = new Date();
    // 尝试回溯最多7天，以确保能找到最近的一个有数据的交易日
    for (let i = 0; i < 7; i++) {
        const tradeDate = date.toISOString().split('T')[0];
        const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${tradeDate}?adjusted=true&apiKey=${apiKey}`;
        try {
            console.log(`[Polygon] Attempting to fetch snapshot for date: ${tradeDate}`);
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (response.ok) {
                const data = await response.json();
                if (data && data.resultsCount > 0) {
                    console.log(`[Polygon] Successfully found snapshot for date: ${tradeDate}`);
                    const quotes = {};
                    data.results.forEach(q => {
                        if (q.T && q.o > 0) {
                            quotes[q.T] = { dp: ((q.c - q.o) / q.o) * 100 };
                        }
                    });
                    return quotes; // ** 成功，直接返回结果 **
                }
            }
        } catch (error) { console.error(`[Polygon] Failed for date ${tradeDate}:`, error.message); }
        date.setDate(date.getDate() - 1);
    }
    console.warn("[Polygon] Could not fetch any snapshot data after 7 attempts.");
    return {}; // 7天都失败，返回空对象
}

// --- 辅助函数 2: 从 Finnhub 批量获取实时报价 (作为备用) ---
async function getQuotesFromFinnhub(symbols, apiKey) {
    const quotes = {};
    const batchSize = 25;
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`[Finnhub Fallback] Fetching batch ${Math.floor(i / batchSize) + 1}...`);
        const promises = batch.map(symbol =>
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data && typeof data.dp === 'number') { quotes[symbol] = { dp: data.dp }; } })
        );
        await Promise.allSettled(promises);
        if (i + batchSize < symbols.length) await new Promise(res => setTimeout(res, 1500));
    }
    return quotes;
}

// --- API 主处理函数 ---
export default async function handler(request, response) {
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

    try {
        const { rows: companies } = await pool.query(
            'SELECT ticker, name_zh, sector_zh, market_cap FROM stocks ORDER BY ticker;'
        );
        if (companies.length === 0) return response.status(404).json({ error: "No companies found in db." });
        
        const symbols = companies.map(r => r.ticker);
        let quotes = {};

        // ** 智能 API 调度 **
        if (POLYGON_API_KEY) {
            console.log('Using primary source: Polygon.io');
            quotes = await getQuotesFromPolygon(POLYGON_API_KEY);
        } else if (FINNHUB_API_KEY) {
            console.log('Using fallback source: Finnhub');
            quotes = await getQuotesFromFinnhub(symbols, FINNHUB_API_KEY);
        } else {
            console.error('No API keys configured.');
        }

        // ** 数据整合 **
        const heatmapData = companies.map(company => ({
            ticker: company.ticker,
            name_zh: company.name_zh,
            sector_zh: company.sector_zh,
            market_cap: company.market_cap || 0,
            change_percent: quotes[company.ticker]?.dp || 0, // 统一使用 dp 字段
        }));

        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    }
}