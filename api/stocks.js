// /api/stocks.js (最终的、最健壮的高性能版)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// --- 辅助函数：从 Polygon 获取前一日市场快照 ---
async function getPreviousDaySnapshot(apiKey) {
    let date = new Date();
    let polygonData = null;
    
    // 尝试回溯最多7天，以确保能找到最近的一个交易日数据
    for (let i = 0; i < 7; i++) {
        const tradeDate = date.toISOString().split('T')[0];
        const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${tradeDate}?adjusted=true&apiKey=${apiKey}`;
        
        try {
            console.log(`[Polygon] Attempting to fetch snapshot for date: ${tradeDate}`);
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) }); // 8秒超时
            if (response.ok) {
                polygonData = await response.json();
                if (polygonData && polygonData.resultsCount > 0) {
                    console.log(`[Polygon] Successfully found snapshot for date: ${tradeDate} with ${polygonData.resultsCount} results.`);
                    break; // 找到数据，成功跳出循环
                }
            }
        } catch (error) { 
            console.error(`[Polygon] Failed to fetch for date ${tradeDate}:`, error.message); 
        }
        
        // 如果没找到，回退一天
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
    console.log(`[Polygon] Built snapshot map with ${quotesMap.size} tickers.`);
    return quotesMap;
}

// --- API 主处理函数 ---
export default async function handler(request, response) {
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!POLYGON_API_KEY) {
        return response.status(500).json({ error: 'Polygon API key is not configured.' });
    }

    const client = await pool.connect(); // 获取一个数据库连接
    try {
        // 1. 从数据库获取我们需要的 502 个股票 ticker
        console.log("Step 1: Fetching company list from Neon DB...");
        const { rows: companies } = await client.query('SELECT ticker, name_zh, sector_zh, market_cap FROM stocks;');
        console.log(`Step 1 Complete: Found ${companies.length} companies.`);
        
        // 2. 一次网络请求从 Polygon 获取全市场快照
        console.log("Step 2: Fetching market snapshot from Polygon.io...");
        const polygonSnapshot = await getPreviousDaySnapshot(POLYGON_API_KEY);
        console.log("Step 2 Complete: Snapshot received.");
        
        // 3. 在后端进行数据整合
        console.log("Step 3: Merging database info with snapshot data...");
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
                market_cap: company.market_cap, // 传递市值给前端
                change_percent: change_percent,  // 直接返回扁平化的字段
            };
        });
        
        console.log(`Step 3 Complete: Processed ${heatmapData.length} stocks for frontend.`);

        response.setHeader('Cache-control', 's-maxage=900, stale-while-revalidate=1800'); // 缓存15分钟
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks.js CRITICAL ERROR:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    } finally {
        if (client) {
            client.release(); // ** 关键：确保数据库连接被释放 **
        }
    }
}