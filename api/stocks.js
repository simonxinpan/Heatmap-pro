// /api/stocks.js (最终修复版 - 解决数据库连接问题)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// 使用Polygon API获取股票报价的辅助函数
async function getQuotesFromPolygon(symbols, apiKey) {
    const quotes = {};
    const batchSize = 50; // Polygon支持更大的批次
    
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`Fetching Polygon quote batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}...`);
        
        // 使用Polygon的grouped daily API获取前一交易日数据
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
                                c: result.c, // 收盘价
                                o: result.o, // 开盘价
                                h: result.h, // 最高价
                                l: result.l, // 最低价
                                v: result.v, // 成交量
                                dp: changePercent, // 涨跌幅百分比
                                d: result.c - result.o // 涨跌额
                            };
                        }
                    });
                }
            }
        } catch (error) {
            console.error(`Polygon API batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
        }
        
        // 批次间延迟，避免API限制
        if (i + batchSize < symbols.length) {
            await new Promise(res => setTimeout(res, 200)); // Polygon限制较宽松
        }
    }
    
    console.log(`Polygon API返回了 ${Object.keys(quotes).length} 只股票的数据`);
    return quotes;
}

// Finnhub API回退函数（保持原有逻辑）
async function getQuotesFromFinnhub(symbols, apiKey) {
    const quotes = {};
    const batchSize = 25; // 每批25个
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`Fetching Finnhub quote batch ${Math.floor(i / batchSize) + 1}...`);
        
        const promises = batch.map(symbol =>
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data && data.c !== 0) { quotes[symbol] = data; } })
                .catch(e => console.error(`Failed to fetch quote for ${symbol}:`, e.message))
        );
        
        await Promise.all(promises);
        if (i + batchSize < symbols.length) await new Promise(res => setTimeout(res, 1500)); // 每批间隔1.5秒
    }
    return quotes;
}

export default async function handler(request, response) {
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    
    // 优先使用Polygon API，如果没有配置则回退到Finnhub
    if (!POLYGON_API_KEY && !FINNHUB_API_KEY) {
        return response.status(500).json({ error: 'Neither Polygon nor Finnhub API key is configured.' });
    }

    try {
        // 1. 从 Neon 数据库获取列表
        console.log("Fetching full company list from Neon DB...");
        
        // *** 核心修复：只查询数据库中确定存在的列！ ***
        const { rows: companies } = await pool.query(
            'SELECT ticker, name_zh, sector_zh, market_cap FROM stocks ORDER BY ticker;'
        );
        
        if (companies.length === 0) {
            return response.status(404).json({ error: "No companies found in the database." });
        }
        
        const symbols = companies.map(r => r.ticker);
        
        // 2. 批量获取这些公司的实时报价
        let quotes = {};
        if (POLYGON_API_KEY) {
            console.log('使用Polygon API获取股票数据...');
            quotes = await getQuotesFromPolygon(symbols, POLYGON_API_KEY);
        } else {
            console.log('回退到Finnhub API获取股票数据...');
            quotes = await getQuotesFromFinnhub(symbols, FINNHUB_API_KEY);
        }

        // 3. 优雅地整合数据
        const heatmapData = companies.map(company => {
            const quote = quotes[company.ticker];
            const changePercent = quote?.dp || 0;
            
            // 调试日志：检查前几个股票的数据
            if (companies.indexOf(company) < 5) {
                console.log(`Debug ${company.ticker}: quote=${JSON.stringify(quote)}, dp=${quote?.dp}`);
            }
            
            return {
                ticker: company.ticker,
                name_zh: company.name_zh,
                sector_zh: company.sector_zh,
                market_cap: company.market_cap || 0,
                change_percent: changePercent,
            };
        });

        console.log(`Returning ${heatmapData.length} stocks to the frontend.`);
        
        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        response.status(200).json(heatmapData);

    } catch (error) {
        console.error("API /stocks.js Error:", error);
        response.status(500).json({ error: 'Failed to generate heatmap data.' });
    }
}