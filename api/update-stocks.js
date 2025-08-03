// /api/update-stocks.js (最终调试版)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// 这是一个带强力调试的 getQuotes 函数
async function getQuotes(symbols, apiKey) {
    const quotes = {};
    const batchSize = 20; // 减小批次，增加成功率
    
    console.log(`[getQuotes] Starting to fetch quotes for ${symbols.length} symbols...`);

    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`[getQuotes] Fetching batch ${i / batchSize + 1}... Symbols: ${batch.join(', ')}`);
        
        const promises = batch.map(async (symbol) => {
            const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
            try {
                const response = await fetch(url);
                const responseBody = await response.text(); // 先获取原始文本
                
                if (!response.ok) {
                    console.error(`[getQuotes] Finnhub API Error for ${symbol}. Status: ${response.status}. Body: ${responseBody}`);
                    return; // 这个 symbol 失败，继续下一个
                }
                
                const data = JSON.parse(responseBody);
                if (data && data.c !== 0) {
                    quotes[symbol] = data;
                } else {
                    console.warn(`[getQuotes] No valid quote data for ${symbol}. Response:`, data);
                }
            } catch (e) {
                console.error(`[getQuotes] Network or parsing error for ${symbol}:`, e.message);
            }
        });
        
        await Promise.all(promises);
        
        if (i + batchSize < symbols.length) {
            console.log(`[getQuotes] Waiting for 2 seconds before next batch...`);
            await new Promise(res => setTimeout(res, 2000));
        }
    }
    
    console.log(`[getQuotes] Finished fetching. Got quotes for ${Object.keys(quotes).length} symbols.`);
    return quotes;
}

export default async function handler(req, res) {
    // 安全校验
    if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        console.log("===== Starting stock data update job =====");
        
        // 1. 获取股票代码
        const { rows } = await pool.query('SELECT ticker FROM stocks;');
        const symbols = rows.map(r => r.ticker);
        console.log(`Found ${symbols.length} symbols in DB.`);

        // 2. 批量获取最新报价
        const quotes = await getQuotes(symbols, process.env.FINNHUB_API_KEY);

        // ** 关键检查 **
        if (Object.keys(quotes).length === 0) {
            console.error("!!! CRITICAL: getQuotes returned zero successful quotes. Aborting DB update.");
            throw new Error("Failed to fetch any quotes from Finnhub. Check API key and rate limits.");
        }

        // 3. 将最新报价更新回数据库
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let updatedCount = 0;
            for (const symbol in quotes) {
                const quote = quotes[symbol];
                const result = await client.query(
                    `UPDATE stocks SET last_price = $1, change_amount = $2, change_percent = $3, last_updated = NOW() WHERE ticker = $4`,
                    [quote.c, quote.d, quote.dp, symbol]
                );
                if (result.rowCount > 0) updatedCount++;
            }
            await client.query('COMMIT');
            console.log(`Successfully updated ${updatedCount} stocks in the database.`);
            res.status(200).json({ success: true, updated: updatedCount, total_fetched: Object.keys(quotes).length });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("!!!!! Stock data update job FAILED !!!!!", error);
        res.status(500).json({ success: false, error: error.message });
    }
}