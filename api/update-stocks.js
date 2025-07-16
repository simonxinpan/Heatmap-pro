import { Pool } from 'pg';

const UPDATE_BATCH_SIZE = 50; 

// 使用pg库的连接池
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // 对于Neon，通常需要这个配置
    }
});

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }
    
    console.log('--- [PG] Starting Scheduled Stock Update ---');

    try {
        const tickersToProcess = await getTickersToUpdate(pool);
        const fetchedStockData = await fetchBatchData(tickersToProcess);
        
        if (fetchedStockData.length > 0) {
            await upsertBatchData(pool, fetchedStockData);
        }

        console.log(`--- [PG] Update finished. Processed ${fetchedStockData.length} stocks. ---`);
        response.status(200).json({ success: true, updated: fetchedStockData.length, tickers: fetchedStockData.map(s => s.ticker) });

    } catch (error) {
        console.error('[PG] Update Handler Error:', error.message, error.stack);
        response.status(500).json({ success: false, error: error.message });
    }
}


async function getTickersToUpdate(pool) {
    const { rows: allStockInfo } = await pool.query('SELECT ticker, name_zh, sector_zh FROM stock_list');
    if (!allStockInfo || allStockInfo.length === 0) {
        throw new Error('Failed to load stock list from "stock_list" table or list is empty.');
    }
    console.log(`Loaded ${allStockInfo.length} stocks from the master list.`);

    const { rows: stocksToUpdate } = await pool.query(`
        SELECT ticker FROM stocks
        ORDER BY last_updated ASC NULLS FIRST
        LIMIT ${UPDATE_BATCH_SIZE}
    `);

    if (stocksToUpdate && stocksToUpdate.length > 0) {
        const tickers = stocksToUpdate.map(s => s.ticker);
        console.log(`Found ${tickers.length} oldest stocks to update.`);
        return tickers.map(ticker => allStockInfo.find(info => info.ticker === ticker)).filter(Boolean);
    }
    
    console.log(`"stocks" table is empty. Selecting ${UPDATE_BATCH_SIZE} random stocks to initialize.`);
    return allStockInfo.sort(() => 0.5 - Math.random()).slice(0, UPDATE_BATCH_SIZE);
}

async function fetchBatchData(stockInfos) {
    const promises = stockInfos.map(info => fetchApiDataForTicker(info));
    const results = await Promise.allSettled(promises);
    
    const successfulData = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);

    console.log(`Successfully fetched data for ${successfulData.length} of ${stockInfos.length} stocks.`);
    return successfulData;
}


async function fetchApiDataForTicker(stockInfo) {
    if (!stockInfo || !stockInfo.ticker) return null;
    const { ticker, name_zh, sector_zh } = stockInfo;

    try {
        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) throw new Error('FINNHUB_API_KEY is not configured.');

        const fetchFromFinnhub = async (endpoint) => {
            const url = `https://finnhub.io/api/v1${endpoint}&token=${apiKey}`;
            const res = await fetch(url);
            if (!res.ok) {
                 if (res.status === 429) { console.warn(`[WARN] Rate limit hit for ${ticker}, skipping.`); return null; }
                throw new Error(`Finnhub API error for ${ticker}: ${res.statusText}`);
            }
            return res.json();
        };

        const [profile, quote] = await Promise.all([
            fetchFromFinnhub(`/stock/profile2?symbol=${ticker}`),
            fetchFromFinnhub(`/quote?symbol=${ticker}`)
        ]);
        
        if (!quote || typeof quote.c === 'undefined' || !profile) {
            console.warn(`[WARN] Invalid API data for ${ticker}, skipping.`);
            return null;
        }

        return {
            ticker: ticker,
            name_zh: name_zh,
            sector_zh: sector_zh,
            market_cap: profile.marketCapitalization || 0,
            change_percent: quote.dp || 0,
            logo: profile.logo || '',
            last_updated: new Date().toISOString(),
        };
    } catch (error) {
        console.error(`[PG] Error fetching data for ${ticker}:`, error.message);
        return null;
    }
}


async function upsertBatchData(pool, stockData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const stock of stockData) {
            const query = `
                INSERT INTO stocks (ticker, name_zh, sector_zh, market_cap, change_percent, logo, last_updated)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (ticker) DO UPDATE SET
                    name_zh = EXCLUDED.name_zh,
                    sector_zh = EXCLUDED.sector_zh,
                    market_cap = EXCLUDED.market_cap,
                    change_percent = EXCLUDED.change_percent,
                    logo = EXCLUDED.logo,
                    last_updated = EXCLUDED.last_updated;
            `;
            const values = [
                stock.ticker, stock.name_zh, stock.sector_zh, stock.market_cap,
                stock.change_percent, stock.logo, stock.last_updated
            ];
            await client.query(query, values);
        }

        await client.query('COMMIT');
        console.log(`Successfully upserted ${stockData.length} stocks into Neon DB.`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[PG] Database upsert transaction failed. Rolling back.', e.message);
        throw e;
    } finally {
        client.release();
    }
}