// api/update-stocks.js (Neon Final Version)
import postgres from 'serverless-postgres';

// Neon数据库连接配置
const db = postgres({
  connectionString: process.env.DATABASE_URL,
  ssl: 'require', // Neon 需要 SSL
});

const UPDATE_BATCH_SIZE = 50; 

export default async function handler(request, response) {
    try {
        const result = await updateStaleStocks();
        response.status(200).json({ success: true, updated: result.length });
    } catch (error) {
        console.error('[Update Handler Error]:', error.message);
        response.status(500).json({ success: false, error: error.message });
    }
}

async function updateStaleStocks() {
    console.log('--- Starting Scheduled Stock Update ---');
    
    const allStockInfo = await db.sql`SELECT ticker, name_zh, sector_zh FROM stock_list`;
    if (!allStockInfo || allStockInfo.count === 0) {
        throw new Error('Failed to load stock list from database or list is empty');
    }
    console.log(`Loaded ${allStockInfo.count} stocks from the master list.`);

    // 优先更新从未更新过的，然后更新最旧的
    const stocksToUpdate = await db.sql`
        SELECT ticker FROM stocks
        ORDER BY last_updated ASC NULLS FIRST
        LIMIT ${UPDATE_BATCH_SIZE}
    `;

    let tickersToProcess;
    if (stocksToUpdate && stocksToUpdate.count > 0) {
        tickersToProcess = stocksToUpdate.map(s => allStockInfo.find(i => i.ticker === s.ticker)).filter(Boolean);
        console.log(`Selected ${tickersToProcess.length} oldest stocks to update.`);
    } else {
        // 如果stocks表为空，则随机选一批
        tickersToProcess = allStockInfo.sort(() => 0.5 - Math.random()).slice(0, UPDATE_BATCH_SIZE);
        console.log(`Stocks table is empty, selected ${tickersToProcess.length} random stocks to update.`);
    }

    const fetchedStockData = await fetchBatchData(tickersToProcess);

    if (fetchedStockData.length > 0) {
        // 使用 postgres.js 的辅助函数来批量插入/更新
        await db.sql`
            INSERT INTO stocks (ticker, name_zh, sector_zh, market_cap, change_percent, logo, last_updated)
            VALUES ${db(fetchedStockData, 
                'ticker', 'name_zh', 'sector_zh', 'market_cap', 
                'change_percent', 'logo', 'last_updated'
            )}
            ON CONFLICT (ticker) DO UPDATE SET
                market_cap = EXCLUDED.market_cap,
                change_percent = EXCLUDED.change_percent,
                logo = EXCLUDED.logo,
                last_updated = EXCLUDED.last_updated;
        `;
        console.log(`Successfully upserted ${fetchedStockData.length} stocks into Neon database.`);
    }
    return fetchedStockData;
}

async function fetchBatchData(stockInfos) {
    const batchSize = 15;
    const delay = 4000;
    let fetchedStockData = [];
    for (let i = 0; i < stockInfos.length; i += batchSize) {
        const batch = stockInfos.slice(i, i + batchSize);
        console.log(`Fetching batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(stockInfos.length / batchSize)}...`);
        const batchPromises = batch.map(stockInfo => fetchApiDataForTicker(stockInfo));
        const results = await Promise.allSettled(batchPromises);
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                fetchedStockData.push(result.value);
            }
        });
        if (i + batchSize < stockInfos.length) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return fetchedStockData;
}

async function fetchApiDataForTicker(stockInfo) {
    const { ticker, name_zh, sector_zh } = stockInfo;
    try {
        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) throw new Error('FINNHUB_API_KEY is not configured.');
        const fetchFromFinnhub = async (endpoint) => {
            const url = `https://finnhub.io/api/v1${endpoint}&token=${apiKey}`;
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 429) { console.warn(`Rate limit hit for ${ticker}.`); return null; }
                throw new Error(`Finnhub API error for ${url}: ${res.statusText}`);
            }
            return res.json();
        };
        const [profile, quote] = await Promise.all([
            fetchFromFinnhub(`/stock/profile2?symbol=${ticker}`),
            fetchFromFinnhub(`/quote?symbol=${ticker}`)
        ]);
        if (!profile || !quote || typeof profile.marketCapitalization === 'undefined' || profile.marketCapitalization === 0) {
            return null;
        }
        return { 
            ticker, name_zh, sector_zh, 
            market_cap: profile.marketCapitalization, 
            change_percent: quote.dp,
            logo: profile.logo,
            last_updated: new Date().toISOString()
        };
    } catch (error) {
        console.error(`Error fetching data for ticker ${ticker}:`, error.message);
        return null;
    }
}