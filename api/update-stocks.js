// /api/update-stocks.js
// 数据更新器API - 从Finnhub获取最新报价并更新到Neon数据库
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// 使用Polygon API获取股票报价
async function getQuotesFromPolygon(symbols, apiKey) {
    const quotes = {};
    const batchSize = 5; // Polygon API限制更严格
    
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const promises = batch.map(async symbol => {
            try {
                const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${apiKey}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    const currentPrice = result.c;
                    const previousClose = result.o;
                    const change = currentPrice - previousClose;
                    const changePercent = (change / previousClose) * 100;
                    
                    quotes[symbol] = {
                        c: currentPrice,
                        d: change,
                        dp: changePercent
                    };
                }
            } catch (err) {
                console.warn(`Polygon API failed for ${symbol}:`, err.message);
            }
        });
        
        await Promise.allSettled(promises);
        
        // 批次间延迟，避免API限制
        if (i + batchSize < symbols.length) {
            await new Promise(res => setTimeout(res, 12000)); // Polygon免费版每分钟5次请求
        }
    }
    
    return quotes;
}

// 使用Finnhub API获取股票报价（备用）
async function getQuotesFromFinnhub(symbols, apiKey) {
    const quotes = {};
    const batchSize = 25;
    
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const promises = batch.map(symbol =>
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
                .then(res => res.ok ? res.json() : Promise.reject(`Failed for ${symbol}`))
                .then(data => {
                    if (data && data.c !== 0) {
                        quotes[symbol] = data;
                    }
                })
                .catch(err => console.warn(`Finnhub API failed for ${symbol}:`, err))
        );
        
        await Promise.allSettled(promises);
        
        // 批次间延迟，避免API限制
        if (i + batchSize < symbols.length) {
            await new Promise(res => setTimeout(res, 2000));
        }
    }
    
    return quotes;
}

// 智能选择API获取报价
async function getQuotes(symbols) {
    const polygonKey = process.env.POLYGON_API_KEY;
    const finnhubKey = process.env.FINNHUB_API_KEY;
    
    // 优先使用Polygon API
    if (polygonKey) {
        console.log('🔥 Using Polygon API for stock quotes...');
        const quotes = await getQuotesFromPolygon(symbols, polygonKey);
        if (Object.keys(quotes).length > 0) {
            return quotes;
        }
        console.warn('⚠️ Polygon API returned no data, falling back to Finnhub...');
    }
    
    // 备用Finnhub API
    if (finnhubKey) {
        console.log('📊 Using Finnhub API for stock quotes...');
        return await getQuotesFromFinnhub(symbols, finnhubKey);
    }
    
    throw new Error('No valid API keys configured (POLYGON_API_KEY or FINNHUB_API_KEY)');
}

export default async function handler(req, res) {
    // 安全校验，确保只有GitHub Action可以触发
    const authHeader = req.headers['authorization'];
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
        console.warn('Unauthorized update attempt:', authHeader);
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        console.log("🚀 Starting stock data update job...");
        
        // 1. 从数据库获取所有股票代码
        const { rows } = await pool.query('SELECT ticker FROM stocks;');
        const symbols = rows.map(r => r.ticker);
        console.log(`📊 Found ${symbols.length} stocks to update`);
        
        // 2. 批量获取最新报价（优先使用Polygon API）
        const quotes = await getQuotes(symbols);
        console.log(`💰 Retrieved quotes for ${Object.keys(quotes).length} stocks`);
        
        // 3. 将最新报价更新回Neon数据库
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let updatedCount = 0;
            
            for (const symbol in quotes) {
                const quote = quotes[symbol];
                const result = await client.query(
                    `UPDATE stocks 
                     SET last_price = $1, change_amount = $2, change_percent = $3, last_updated = NOW()
                     WHERE ticker = $4`,
                    [quote.c, quote.d, quote.dp, symbol]
                );
                
                if (result.rowCount > 0) {
                    updatedCount++;
                }
            }
            
            await client.query('COMMIT');
            console.log(`✅ Successfully updated ${updatedCount} stocks in the database.`);
            
            res.status(200).json({ 
                success: true, 
                updated: updatedCount,
                total: symbols.length,
                timestamp: new Date().toISOString()
            });
            
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error("❌ Stock data update job failed:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}