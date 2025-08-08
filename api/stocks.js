// /api/stocks.js (Finnhub + Polygon 协作版)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// *** 新的辅助函数：从 Polygon 批量获取前一日收盘价快照 ***
// Polygon 的 /v2/aggs/grouped/locale/us/market/stocks/{date} 接口非常适合这个场景
async function getPreviousDayQuotesFromPolygon(apiKey) {
    // 1. 获取最近的一个交易日 (处理周末和节假日)
    let date = new Date();
    date.setDate(date.getDate() - 1); // 先回退一天
    while ([0, 6].includes(date.getDay())) { // 如果是周日(0)或周六(6)
        date.setDate(date.getDate() - 1);
    }
    const prevTradeDate = date.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`[Polygon] Fetching previous day (${prevTradeDate}) snapshot...`);
    
    // 2. 调用 Polygon 的 Grouped Daily Aggregates API
    const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${prevTradeDate}?adjusted=true&apiKey=${apiKey}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Polygon API returned status ${response.status}`);
        }
        const data = await response.json();
        
        // 3. 将返回的数组转换为一个易于查询的 Map 对象
        const quotesMap = new Map();
        if (data.results) {
            data.results.forEach(quote => {
                // 我们需要 'c' (收盘价) 和 'op' (当天开盘价) 来计算涨跌幅
                quotesMap.set(quote.T, { c: quote.c, o: quote.o });
            });
        }
        console.log(`[Polygon] Successfully fetched snapshot for ${quotesMap.size} tickers.`);
        return quotesMap;
    } catch (error) {
        console.error("[Polygon] Failed to fetch grouped daily data:", error);
        return new Map(); // 失败则返回一个空的 Map
    }
}


export default async function handler(request, response) {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!FINNHUB_API_KEY || !POLYGON_API_KEY) {
        return response.status(500).json({ error: 'API keys are not fully configured.' });
    }

    try {
        // 1. 从数据库获取完整的公司列表 (我们的“底单”)
        console.log("Fetching full company list from Neon DB...");
        const { rows: companies } = await pool.query('SELECT ticker, name_zh, sector_zh FROM stocks;');
        
        // 2. **并行**地从 Finnhub 和 Polygon 获取数据
        console.log("Fetching data from Finnhub and Polygon in parallel...");
        const [finnhubQuotes, polygonPrevDayQuotes] = await Promise.all([
            // Finnhub 我们只用它来获取“当前”价格，因为它的免费版更实时
            getQuotesFromFinnhub(companies.map(c => c.ticker), FINNHUB_API_KEY),
            // Polygon 我们用它来获取一个稳定的“前一日收盘价”基准
            getPreviousDayQuotesFromPolygon(POLYGON_API_KEY)
        ]);
        
        // 3. 终极数据整合
        const heatmapData = companies.map(company => {
            const ticker = company.ticker;
            const finnhubQuote = finnhubQuotes[ticker];
            const polygonQuote = polygonPrevDayQuotes.get(ticker);
            
            let change_percent = 0;
            
            // 优先使用 Finnhub 的实时涨跌幅
            if (finnhubQuote && typeof finnhubQuote.dp === 'number') {
                change_percent = finnhubQuote.dp;
            } 
            // 如果 Finnhub 失败，我们用 Polygon 的数据自己计算
            else if (polygonQuote && finnhubQuote) {
                const prevClose = polygonQuote.c; // Polygon 的前日收盘价
                const currentPrice = finnhubQuote.c; // Finnhub 的当前价
                if (prevClose > 0) {
                    change_percent = ((currentPrice - prevClose) / prevClose) * 100;
                }
            }

            return {
                ticker: ticker,
                name_zh: company.name_zh,
                sector_zh: company.sector_zh,
                change_percent: change_percent, // 最终计算出的涨跌幅
            };
        });

        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    }
}

// 辅助函数：从 Finnhub 获取实时报价 (和之前一样，但可以简化)
async function getQuotesFromFinnhub(symbols, apiKey) {
    const quotes = {};
    const batchSize = 25;
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const promises = batch.map(symbol =>
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data) quotes[symbol] = data; })
        );
        await Promise.allSettled(promises);
        if (i + batchSize < symbols.length) await new Promise(res => setTimeout(res, 1500));
    }
    return quotes;
}