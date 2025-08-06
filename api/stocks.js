// /api/stocks.js (最终修复版 - 解决数据库连接问题)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// 这是一个健壮的、带分批和延迟的 getQuotes 辅助函数
async function getQuotes(symbols, apiKey) {
    const quotes = {};
    const batchSize = 25; // 每批25个
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`Fetching quote batch ${Math.floor(i / batchSize) + 1}...`);
        
        const promises = batch.map(symbol =>
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data && data.c !== 0) { quotes[symbol] = data; } })
                .catch(e => console.error(`Failed to fetch quote for ${symbol}:`, e.message))
        );
        
        await Promise.all(promises);
        if (i + batchSize < symbols.length) await new Promise(res => setTimeout(res, 1500)); // 每批间隔1.5秒
    }
    return quotes;
}

export default async function handler(request, response) {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    if (!FINNHUB_API_KEY) {
        return response.status(500).json({ error: 'Finnhub API key is not configured.' });
    }

    try {
        // 1. 从 Neon 数据库获取列表
        console.log("Fetching full company list from Neon DB...");
        
        // *** 核心修复：只查询数据库中确定存在的列！ ***
        const { rows: companies } = await pool.query(
            'SELECT ticker, name_zh, sector_zh FROM stocks ORDER BY ticker;'
        );
        
        if (companies.length === 0) {
            return response.status(404).json({ error: "No companies found in the database." });
        }
        
        const symbols = companies.map(r => r.ticker);
        
        // 2. 批量获取这些公司的实时报价
        const quotes = await getQuotes(symbols, FINNHUB_API_KEY);

        // 3. 优雅地整合数据
        const heatmapData = companies.map(company => ({
            ticker: company.ticker,
            name_zh: company.name_zh,
            sector_zh: company.sector_zh,
            // 从实时获取的 quotes 对象中提取涨跌幅
            change_percent: quotes[company.ticker]?.dp || 0,
        }));

        console.log(`Returning ${heatmapData.length} stocks to the frontend.`);
        
        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    }
}