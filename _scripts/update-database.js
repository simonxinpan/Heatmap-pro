// /_scripts/update-database.js (最终安全版)
import { Pool } from 'pg';

// 辅助函数：获取Polygon快照数据
async function getPolygonSnapshot(ticker, apiKey) {
    try {
        const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apikey=${apiKey}`);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                price: result.c,
                change: result.c - result.o,
                change_percent: ((result.c - result.o) / result.o) * 100,
                volume: result.v,
                market_cap: null // 需要从其他源获取
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching Polygon data for ${ticker}:`, error.message);
        return null;
    }
}

// 辅助函数：获取Finnhub指标数据
async function getFinnhubMetrics(ticker, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`);
        const data = await response.json();
        
        if (data.metric) {
            return {
                market_cap: data.metric.marketCapitalization || null,
                pe_ratio: data.metric.peBasicExclExtraTTM || null,
                dividend_yield: data.metric.dividendYieldIndicatedAnnual || null
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching Finnhub data for ${ticker}:`, error.message);
        return null;
    }
}

// 辅助函数：应用标签逻辑
function applyTags(stock, tags) {
    const appliedTags = [];
    
    // 大盘股标签 (市值 > 100亿美元)
    if (stock.market_cap && stock.market_cap > 10000) {
        const largeCapTag = tags.find(tag => tag.name === '大盘股');
        if (largeCapTag) appliedTags.push(largeCapTag.id);
    }
    
    // 行业标签
    const sectorTagMap = {
        '信息技术': '科技股',
        '金融': '金融股',
        '医疗保健': '医疗股',
        '非必需消费品': '消费股',
        '日常消费品': '消费股',
        '工业': '工业股',
        '能源': '能源股',
        '公用事业': '公用事业',
        '房地产': '房地产',
        '原材料': '原材料',
        '半导体': '科技股'
    };
    
    const tagName = sectorTagMap[stock.sector_zh];
    if (tagName) {
        const sectorTag = tags.find(tag => tag.name === tagName);
        if (sectorTag) appliedTags.push(sectorTag.id);
    }
    
    return appliedTags;
}

async function main() {
    console.log("===== Starting Database Update Job =====");
    
    // 直接从进程环境变量process.env读取密钥
    const { NEON_DATABASE_URL, POLYGON_API_KEY, FINNHUB_API_KEY } = process.env;
    
    if (!NEON_DATABASE_URL || !POLYGON_API_KEY || !FINNHUB_API_KEY) {
        console.error("\nFATAL: Missing required environment variables.");
        console.error("Hint: This script is designed to run in a secure environment (like GitHub Actions or via Vercel CLI).");
        console.error("For local testing, please use the command: 'vercel env run -- node _scripts/update-database.js'\n");
        process.exit(1);
    }
    
    const pool = new Pool({ 
        connectionString: NEON_DATABASE_URL, 
        ssl: { rejectUnauthorized: false } 
    });
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log("Fetching stocks from database...");
        const stocksResult = await client.query('SELECT ticker, name_zh, sector_zh FROM stocks ORDER BY ticker');
        const stocks = stocksResult.rows;
        console.log(`Found ${stocks.length} stocks to update`);
        
        console.log("Fetching tags from database...");
        const tagsResult = await client.query('SELECT id, name FROM tags');
        const tags = tagsResult.rows;
        console.log(`Found ${tags.length} tags`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < stocks.length; i++) {
            const stock = stocks[i];
            console.log(`Processing ${i + 1}/${stocks.length}: ${stock.ticker} (${stock.name_zh})`);
            
            try {
                // 获取价格数据
                const polygonData = await getPolygonSnapshot(stock.ticker, POLYGON_API_KEY);
                if (!polygonData) {
                    console.warn(`  Warning: No Polygon data for ${stock.ticker}`);
                    errorCount++;
                    continue;
                }
                
                // 获取市值等指标
                const finnhubData = await getFinnhubMetrics(stock.ticker, FINNHUB_API_KEY);
                const marketCap = finnhubData?.market_cap || null;
                
                // 更新股票数据
                await client.query(`
                    UPDATE stocks SET 
                        price = $1,
                        change_amount = $2,
                        change_percent = $3,
                        volume = $4,
                        market_cap = $5,
                        pe_ratio = $6,
                        dividend_yield = $7,
                        updated_at = NOW()
                    WHERE ticker = $8
                `, [
                    polygonData.price,
                    polygonData.change,
                    polygonData.change_percent,
                    polygonData.volume,
                    marketCap,
                    finnhubData?.pe_ratio || null,
                    finnhubData?.dividend_yield || null,
                    stock.ticker
                ]);
                
                // 应用标签
                const stockWithMarketCap = { ...stock, market_cap: marketCap };
                const tagIds = applyTags(stockWithMarketCap, tags);
                
                // 清除现有标签关联
                await client.query('DELETE FROM stock_tags WHERE ticker = $1', [stock.ticker]);
                
                // 插入新的标签关联
                for (const tagId of tagIds) {
                    await client.query(
                        'INSERT INTO stock_tags (ticker, tag_id) VALUES ($1, $2)',
                        [stock.ticker, tagId]
                    );
                }
                
                console.log(`  ✓ Updated ${stock.ticker} with ${tagIds.length} tags`);
                successCount++;
                
                // 添加延迟以避免API限制
                if (i < stocks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                console.error(`  ✗ Error updating ${stock.ticker}:`, error.message);
                errorCount++;
            }
        }
        
        await client.query('COMMIT');
        
        console.log("\n===== Job Summary =====");
        console.log(`Successfully updated: ${successCount} stocks`);
        console.log(`Errors encountered: ${errorCount} stocks`);
        console.log(`Total processed: ${stocks.length} stocks`);
        console.log("===== Job finished successfully. =====");
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("!!!!! Job FAILED !!!!!", error);
        process.exit(1);
    } finally {
        if (client) client.release();
        if (pool) pool.end();
    }
}

main();