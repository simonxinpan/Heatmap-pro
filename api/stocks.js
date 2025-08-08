// /api/stocks.js (最终的、最健壮的版本)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// *** 1. 增强的 getQuotes 函数，带重试和超时 ***
async function getQuotes(symbols, apiKey) {
    const quotes = {};
    const batchSize = 20;
    const maxRetries = 2;

    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`[getQuotes] Fetching batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(symbols.length/batchSize)}...`);
        
        const promises = batch.map(async (symbol) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
                    const response = await fetch(url, { signal: AbortSignal.timeout(5000) }); // 5秒超时
                    
                    if (response.status === 429) {
                        console.warn(`[getQuotes] Rate limit hit. Pausing for 60 seconds...`);
                        await new Promise(res => setTimeout(res, 60000));
                        continue; // 继续外层循环，重试当前 symbol
                    }
                    if (!response.ok) {
                        throw new Error(`API returned status ${response.status}`);
                    }
                    
                    const data = await response.json();
                    if (data && typeof data.c === 'number') {
                        quotes[symbol] = data;
                        return; // ** 成功，跳出重试循环 **
                    }
                } catch (e) {
                    console.error(`[getQuotes] Attempt ${attempt} failed for ${symbol}:`, e.message);
                    if (attempt < maxRetries) {
                        await new Promise(res => setTimeout(res, 1000)); // 等待1秒再重试
                    }
                }
            }
        });
        
        await Promise.all(promises);
        
        if (i + batchSize < symbols.length) {
            await new Promise(res => setTimeout(res, 1000)); // 每批次之间常规延迟
        }
    }
    console.log(`[getQuotes] Finished fetching. Got quotes for ${Object.keys(quotes).length} of ${symbols.length} symbols.`);
    return quotes;
}

export default async function handler(request, response) {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    if (!FINNHUB_API_KEY) {
        return response.status(500).json({ error: 'Finnhub API key is not configured.' });
    }

    try {
        console.log("Fetching full company list from Neon DB...");
        
        // *** 2. 修正的 SQL 查询，只选择确定存在的列 ***
        const { rows: companies } = await pool.query(
            'SELECT ticker, name_zh, sector_zh, market_cap, logo FROM stocks ORDER BY ticker;'
        );
        
        if (companies.length === 0) {
            return response.status(404).json({ error: "No companies found in the database." });
        }
        
        const symbols = companies.map(r => r.ticker);
        const quotes = await getQuotes(symbols, FINNHUB_API_KEY);

        // *** 3. 统一的数据结构，将 quote 对象完整地嵌套进去 ***
        const heatmapData = companies.map(company => ({
            ticker: company.ticker,
            name_zh: company.name_zh,
            sector_zh: company.sector_zh,
            market_cap: company.market_cap,
            logo: company.logo,
            // 嵌套 quote 对象，提供默认值
            quote: quotes[company.ticker] || { c: 0, d: 0, dp: 0, o: 0, h: 0, l: 0, pc: 0, v: 0 },
        }));
        
        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    }
}