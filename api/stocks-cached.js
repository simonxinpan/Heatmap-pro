// /api/stocks-cached.js
// 智能缓存版本的股票数据API - 优先从Neon数据库缓存获取数据
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// 缓存配置
const CACHE_CONFIG = {
    // 市场开盘时间缓存5分钟，闭市时间缓存30分钟
    MARKET_HOURS_CACHE_MINUTES: 5,
    AFTER_HOURS_CACHE_MINUTES: 30,
    // 东部时间市场开盘时间 (9:30 AM - 4:00 PM ET)
    MARKET_OPEN_HOUR: 9,
    MARKET_OPEN_MINUTE: 30,
    MARKET_CLOSE_HOUR: 16,
    MARKET_CLOSE_MINUTE: 0
};

// 判断当前是否为市场交易时间
function isMarketHours() {
    const now = new Date();
    // 转换为东部时间
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = etTime.getHours();
    const minute = etTime.getMinutes();
    const dayOfWeek = etTime.getDay(); // 0=Sunday, 6=Saturday
    
    // 周末不开市
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }
    
    // 检查是否在交易时间内
    const currentMinutes = hour * 60 + minute;
    const openMinutes = CACHE_CONFIG.MARKET_OPEN_HOUR * 60 + CACHE_CONFIG.MARKET_OPEN_MINUTE;
    const closeMinutes = CACHE_CONFIG.MARKET_CLOSE_HOUR * 60 + CACHE_CONFIG.MARKET_CLOSE_MINUTE;
    
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

// 获取缓存过期时间
function getCacheExpiryMinutes() {
    return isMarketHours() 
        ? CACHE_CONFIG.MARKET_HOURS_CACHE_MINUTES 
        : CACHE_CONFIG.AFTER_HOURS_CACHE_MINUTES;
}

// 使用Polygon API获取股票报价的辅助函数
async function getQuotesFromPolygon(symbols, apiKey) {
    const quotes = {};
    const batchSize = 50;
    
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`🔄 Polygon API批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}...`);
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        
        try {
            const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?adjusted=true&apikey=${apiKey}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    data.results.forEach(result => {
                        if (batch.includes(result.T)) {
                            const changePercent = ((result.c - result.o) / result.o) * 100;
                            quotes[result.T] = {
                                c: result.c,
                                o: result.o,
                                h: result.h,
                                l: result.l,
                                v: result.v,
                                dp: changePercent,
                                d: result.c - result.o
                            };
                        }
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Polygon API批次失败:`, error.message);
        }
        
        if (i + batchSize < symbols.length) {
            await new Promise(res => setTimeout(res, 200));
        }
    }
    
    return quotes;
}

// Finnhub API回退函数
async function getQuotesFromFinnhub(symbols, apiKey) {
    const quotes = {};
    const batchSize = 25;
    
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`🔄 Finnhub API批次 ${Math.floor(i / batchSize) + 1}...`);
        
        const promises = batch.map(symbol =>
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data && data.c !== 0) { quotes[symbol] = data; } })
                .catch(e => console.error(`Failed to fetch quote for ${symbol}:`, e.message))
        );
        
        await Promise.all(promises);
        if (i + batchSize < symbols.length) await new Promise(res => setTimeout(res, 1500));
    }
    
    return quotes;
}

// 更新数据库缓存
async function updateDatabaseCache(companies, quotes) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        let updatedCount = 0;
        for (const company of companies) {
            const quote = quotes[company.ticker];
            if (quote) {
                await client.query(
                    `UPDATE stocks SET 
                        current_price = $1,
                        change_percent = $2,
                        change_amount = $3,
                        last_updated = NOW()
                    WHERE ticker = $4`,
                    [quote.c, quote.dp, quote.d, company.ticker]
                );
                updatedCount++;
            }
        }
        
        await client.query('COMMIT');
        console.log(`💾 数据库缓存已更新 ${updatedCount} 只股票`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ 数据库缓存更新失败:', error);
        throw error;
    } finally {
        client.release();
    }
}

// 从数据库获取缓存数据
async function getCachedData() {
    const cacheExpiryMinutes = getCacheExpiryMinutes();
    
    const { rows: cachedStocks } = await pool.query(
        `SELECT ticker, name_zh, sector_zh, market_cap, 
                current_price, change_percent, change_amount, last_updated
         FROM stocks 
         WHERE last_updated > NOW() - INTERVAL '${cacheExpiryMinutes} minutes'
         ORDER BY ticker`
    );
    
    console.log(`📊 从缓存获取到 ${cachedStocks.length} 只股票数据 (缓存时间: ${cacheExpiryMinutes}分钟)`);
    return cachedStocks;
}

// 获取需要更新的股票列表
async function getStocksToUpdate() {
    const cacheExpiryMinutes = getCacheExpiryMinutes();
    
    const { rows: expiredStocks } = await pool.query(
        `SELECT ticker, name_zh, sector_zh, market_cap
         FROM stocks 
         WHERE last_updated IS NULL 
            OR last_updated <= NOW() - INTERVAL '${cacheExpiryMinutes} minutes'
         ORDER BY ticker`
    );
    
    console.log(`🔄 需要更新 ${expiredStocks.length} 只股票数据`);
    return expiredStocks;
}

export default async function handler(request, response) {
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    
    if (!POLYGON_API_KEY && !FINNHUB_API_KEY) {
        return response.status(500).json({ error: 'Neither Polygon nor Finnhub API key is configured.' });
    }

    try {
        const startTime = Date.now();
        const marketStatus = isMarketHours() ? '开盘中' : '闭市中';
        const cacheMinutes = getCacheExpiryMinutes();
        
        console.log(`🏛️ 市场状态: ${marketStatus}, 缓存策略: ${cacheMinutes}分钟`);
        
        // 1. 获取缓存数据
        const cachedData = await getCachedData();
        
        // 2. 获取需要更新的股票
        const stocksToUpdate = await getStocksToUpdate();
        
        let heatmapData = [];
        
        // 3. 如果有缓存数据，先使用缓存
        if (cachedData.length > 0) {
            heatmapData = cachedData.map(stock => ({
                ticker: stock.ticker,
                name_zh: stock.name_zh,
                sector_zh: stock.sector_zh,
                market_cap: stock.market_cap || 0,
                change_percent: parseFloat(stock.change_percent) || 0,
            }));
        }
        
        // 4. 如果有需要更新的股票，进行API调用
        if (stocksToUpdate.length > 0) {
            console.log(`🚀 开始更新 ${stocksToUpdate.length} 只股票数据...`);
            
            const symbols = stocksToUpdate.map(s => s.ticker);
            let quotes = {};
            
            if (POLYGON_API_KEY) {
                console.log('📡 使用Polygon API获取数据...');
                quotes = await getQuotesFromPolygon(symbols, POLYGON_API_KEY);
            } else {
                console.log('📡 使用Finnhub API获取数据...');
                quotes = await getQuotesFromFinnhub(symbols, FINNHUB_API_KEY);
            }
            
            // 5. 更新数据库缓存
            if (Object.keys(quotes).length > 0) {
                await updateDatabaseCache(stocksToUpdate, quotes);
                
                // 6. 合并新数据到结果中
                const updatedData = stocksToUpdate.map(company => {
                    const quote = quotes[company.ticker];
                    const changePercent = quote?.dp || 0;
                    
                    return {
                        ticker: company.ticker,
                        name_zh: company.name_zh,
                        sector_zh: company.sector_zh,
                        market_cap: company.market_cap || 0,
                        change_percent: changePercent,
                    };
                });
                
                // 合并缓存数据和新数据，去重
                const allData = [...heatmapData];
                updatedData.forEach(newStock => {
                    const existingIndex = allData.findIndex(stock => stock.ticker === newStock.ticker);
                    if (existingIndex >= 0) {
                        allData[existingIndex] = newStock; // 更新现有数据
                    } else {
                        allData.push(newStock); // 添加新数据
                    }
                });
                
                heatmapData = allData;
            }
        }
        
        // 7. 如果仍然没有数据，从数据库获取所有股票（不考虑缓存时间）
        if (heatmapData.length === 0) {
            console.log('⚠️ 缓存为空，获取所有数据库数据...');
            const { rows: allStocks } = await pool.query(
                'SELECT ticker, name_zh, sector_zh, market_cap, change_percent FROM stocks ORDER BY ticker'
            );
            
            heatmapData = allStocks.map(stock => ({
                ticker: stock.ticker,
                name_zh: stock.name_zh,
                sector_zh: stock.sector_zh,
                market_cap: stock.market_cap || 0,
                change_percent: parseFloat(stock.change_percent) || 0,
            }));
        }
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        console.log(`✅ 返回 ${heatmapData.length} 只股票数据 (处理时间: ${processingTime}ms)`);
        console.log(`📈 缓存命中: ${cachedData.length}, API更新: ${stocksToUpdate.length}`);
        
        // 设置缓存头
        const cacheSeconds = cacheMinutes * 60;
        response.setHeader('Cache-Control', `s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`);
        response.status(200).json({
            data: heatmapData,
            meta: {
                total: heatmapData.length,
                cached: cachedData.length,
                updated: stocksToUpdate.length,
                marketStatus: marketStatus,
                cacheMinutes: cacheMinutes,
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error("❌ API /stocks-cached.js Error:", error);
        response.status(500).json({ error: 'Failed to generate cached heatmap data.' });
    }
}