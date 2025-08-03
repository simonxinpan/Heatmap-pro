import { Pool } from 'pg';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 数据库连接配置
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// 缓存控制
let cachedData = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export default async function handler(request, response) {
    // 设置CORS头
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (request.method === 'OPTIONS') {
        response.writeHead(200);
        response.end();
        return;
    }
    
    if (request.method !== 'GET') {
        response.writeHead(405, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ message: 'Method Not Allowed' }));
        return;
    }
    
    // 股票详情页逻辑保持不变
    const { searchParams } = new URL(request.url, `https://${request.headers.host}`);
    const ticker = searchParams.get('ticker');
    const forceRefresh = searchParams.get('refresh') === 'true';
    const currentTime = Date.now();
    
    if (ticker) {
        try {
            const data = await fetchSingleStockData(pool, ticker);
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify(data));
            return;
        } catch(error) {
            console.error(`[PG] Error fetching single stock data for ${ticker}:`, error.message);
            response.writeHead(500, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Failed to fetch stock detail.' }));
            return;
        }
    }
    
    // 检查是否强制刷新缓存
    if (forceRefresh || (currentTime - lastCacheTime > CACHE_DURATION)) {
        cachedData = null;
        console.log('🔄 缓存已清除，将获取最新数据');
    }
    
    // 如果有缓存且未过期，直接返回缓存数据
    if (cachedData && !forceRefresh && (currentTime - lastCacheTime <= CACHE_DURATION)) {
        console.log('📦 返回缓存数据');
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(cachedData));
        return;
    }

    // ===================================================================
    // ================== 优化后的数据读取器逻辑 ==================
    // ===================================================================
    // 热力图主页逻辑 - 直接从Neon数据库读取已更新的数据
    try {
        console.log("📊 Fetching heatmap data from Neon database...");
        
        // 从数据库读取股票数据（只查询现有字段）
        const { rows } = await pool.query(`
            SELECT 
                ticker,
                name_zh,
                sector_zh,
                market_cap,
                COALESCE(change_percent, 0) as change_percent,
                logo
            FROM stocks
            ORDER BY market_cap DESC
        `);
        
        console.log(`✅ Successfully returned ${rows ? rows.length : 0} stocks for heatmap`);
        
        // 更新缓存
        cachedData = rows || [];
        lastCacheTime = currentTime;
        console.log('💾 数据已缓存，缓存时长: 5分钟');
        
        // 设置缓存头，允许浏览器缓存1分钟
        response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(rows || []));
        return;

    } catch (error) {
        console.error('❌ Stocks API Error:', error.message, error.stack);
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ 
            error: 'Failed to fetch stock data from database.',
            timestamp: new Date().toISOString()
        }));
        return;
    }
}


// fetchSingleStockData 函数保持不变
async function fetchSingleStockData(pool, ticker) {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) throw new Error('FINNHUB_API_KEY is not configured.');
    const { rows } = await pool.query('SELECT name_zh, sector_zh FROM stock_list WHERE ticker = $1', [ticker]);
    const stockInfo = rows[0];
    if (!stockInfo) console.warn(`Could not find static info for ${ticker} in stock_list.`);
    const fetchFromFinnhub = async (endpoint) => {
        const url = `https://finnhub.io/api/v1${endpoint}&token=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Finnhub API error for ${url}: ${res.statusText}`);
        return res.json();
    };
    const [profile, quote] = await Promise.all([
        fetchFromFinnhub(`/stock/profile2?symbol=${ticker}`),
        fetchFromFinnhub(`/quote?symbol=${ticker}`)
    ]);
    const name_zh_final = stockInfo?.name_zh || profile.name || ticker;
    const sector_zh_final = stockInfo?.sector_zh || profile.finnhubIndustry || 'N/A';
    const description = `${name_zh_final} (${profile.name || ''}) 是一家总部位于 ${profile.country || '未知'} 的公司，属于 ${sector_zh_final} 行业，于 ${profile.ipo || '未知日期'} 上市。`;
    return {
        profile: { ...profile, description, name_zh: name_zh_final, sector_zh: sector_zh_final },
        quote
    };
}