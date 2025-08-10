// /api/update-tags.js
// 后台"贴标签工人" - 定时更新动态标签

import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 获取Finnhub财务指标数据
async function getFinnhubMetrics(symbol, apiKey) {
    try {
        const response = await fetch(
            `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.metric;
    } catch (error) {
        console.error(`Error fetching metrics for ${symbol}:`, error);
        return null;
    }
}

// 获取股票价格数据
async function getStockPrice(symbol, apiKey) {
    try {
        const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        return null;
    }
}

// 更新动态标签
async function updateDynamicTags(client) {
    console.log('开始更新动态标签...');
    
    // 1. 清理所有旧的动态标签关联
    await client.query(`
        DELETE FROM stock_tags 
        WHERE tag_id IN (SELECT id FROM tags WHERE type = '动态');
    `);
    console.log('已清理旧的动态标签关联');
    
    // 2. 获取所有股票数据
    const { rows: stocks } = await client.query(`
        SELECT ticker, name_zh, sector_zh, market_cap, change_percent, current_price 
        FROM stocks 
        WHERE market_cap IS NOT NULL AND current_price IS NOT NULL
        ORDER BY market_cap DESC
    `);
    
    console.log(`获取到 ${stocks.length} 只股票数据`);
    
    // 3. 更新市值排行标签
    await updateMarketCapTags(client, stocks);
    
    // 4. 更新涨跌幅标签
    await updatePerformanceTags(client, stocks);
    
    // 5. 更新价格区间标签
    await updatePriceTags(client, stocks);
    
    // 6. 如果有Finnhub API密钥，更新财务指标标签
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (finnhubKey) {
        await updateFinancialTags(client, stocks, finnhubKey);
    }
    
    console.log('动态标签更新完成');
}

// 更新市值排行标签
async function updateMarketCapTags(client, stocks) {
    const sortedByMarketCap = stocks.sort((a, b) => b.market_cap - a.market_cap);
    
    // 高市值 (前25名)
    const highCapTag = await client.query('SELECT id FROM tags WHERE name = \'高市值\'');
    if (highCapTag.rows.length > 0) {
        const topStocks = sortedByMarketCap.slice(0, 25);
        for (const stock of topStocks) {
            await client.query(
                'INSERT INTO stock_tags (stock_ticker, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [stock.ticker, highCapTag.rows[0].id]
            );
        }
        console.log(`已标记 ${topStocks.length} 只高市值股票`);
    }
    
    // 中等市值 (26-100名)
    const midCapTag = await client.query('SELECT id FROM tags WHERE name = \'中等市值\'');
    if (midCapTag.rows.length > 0) {
        const midStocks = sortedByMarketCap.slice(25, 100);
        for (const stock of midStocks) {
            await client.query(
                'INSERT INTO stock_tags (stock_ticker, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [stock.ticker, midCapTag.rows[0].id]
            );
        }
        console.log(`已标记 ${midStocks.length} 只中等市值股票`);
    }
    
    // 小市值 (101-200名)
    const smallCapTag = await client.query('SELECT id FROM tags WHERE name = \'小市值\'');
    if (smallCapTag.rows.length > 0) {
        const smallStocks = sortedByMarketCap.slice(100, 200);
        for (const stock of smallStocks) {
            await client.query(
                'INSERT INTO stock_tags (stock_ticker, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [stock.ticker, smallCapTag.rows[0].id]
            );
        }
        console.log(`已标记 ${smallStocks.length} 只小市值股票`);
    }
}

// 更新涨跌幅标签
async function updatePerformanceTags(client, stocks) {
    const validStocks = stocks.filter(s => s.change_percent !== null);
    
    // 涨幅榜 (前25名)
    const gainersTag = await client.query('SELECT id FROM tags WHERE name = \'涨幅榜\'');
    if (gainersTag.rows.length > 0) {
        const topGainers = validStocks
            .sort((a, b) => b.change_percent - a.change_percent)
            .slice(0, 25);
        
        for (const stock of topGainers) {
            await client.query(
                'INSERT INTO stock_tags (stock_ticker, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [stock.ticker, gainersTag.rows[0].id]
            );
        }
        console.log(`已标记 ${topGainers.length} 只涨幅榜股票`);
    }
    
    // 跌幅榜 (前25名)
    const losersTag = await client.query('SELECT id FROM tags WHERE name = \'跌幅榜\'');
    if (losersTag.rows.length > 0) {
        const topLosers = validStocks
            .sort((a, b) => a.change_percent - b.change_percent)
            .slice(0, 25);
        
        for (const stock of topLosers) {
            await client.query(
                'INSERT INTO stock_tags (stock_ticker, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [stock.ticker, losersTag.rows[0].id]
            );
        }
        console.log(`已标记 ${topLosers.length} 只跌幅榜股票`);
    }
}

// 更新价格区间标签
async function updatePriceTags(client, stocks) {
    const validStocks = stocks.filter(s => s.current_price !== null && s.current_price > 0);
    
    // 高价股 (前25名)
    const highPriceTag = await client.query('SELECT id FROM tags WHERE name = \'高价股\'');
    if (highPriceTag.rows.length > 0) {
        const highPriceStocks = validStocks
            .sort((a, b) => b.current_price - a.current_price)
            .slice(0, 25);
        
        for (const stock of highPriceStocks) {
            await client.query(
                'INSERT INTO stock_tags (stock_ticker, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [stock.ticker, highPriceTag.rows[0].id]
            );
        }
        console.log(`已标记 ${highPriceStocks.length} 只高价股`);
    }
    
    // 低价股 (前25名)
    const lowPriceTag = await client.query('SELECT id FROM tags WHERE name = \'低价股\'');
    if (lowPriceTag.rows.length > 0) {
        const lowPriceStocks = validStocks
            .sort((a, b) => a.current_price - b.current_price)
            .slice(0, 25);
        
        for (const stock of lowPriceStocks) {
            await client.query(
                'INSERT INTO stock_tags (stock_ticker, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [stock.ticker, lowPriceTag.rows[0].id]
            );
        }
        console.log(`已标记 ${lowPriceStocks.length} 只低价股`);
    }
}

// 更新财务指标标签
async function updateFinancialTags(client, stocks, apiKey) {
    console.log('开始更新财务指标标签...');
    
    // 限制API调用数量，只处理前100只股票
    const limitedStocks = stocks.slice(0, 100);
    const metricsData = [];
    
    // 批量获取财务数据
    for (let i = 0; i < limitedStocks.length; i += 5) {
        const batch = limitedStocks.slice(i, i + 5);
        const promises = batch.map(stock => 
            getFinnhubMetrics(stock.ticker, apiKey)
                .then(metrics => ({ ticker: stock.ticker, metrics }))
        );
        
        const results = await Promise.allSettled(promises);
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.metrics) {
                metricsData.push(result.value);
            }
        });
        
        // API限流
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`获取到 ${metricsData.length} 只股票的财务数据`);
    
    // 高ROE标签 (ROE > 15%)
    const highRoeStocks = metricsData
        .filter(item => item.metrics.roeTTM && item.metrics.roeTTM > 0.15)
        .sort((a, b) => b.metrics.roeTTM - a.metrics.roeTTM)
        .slice(0, 25);
    
    if (highRoeStocks.length > 0) {
        // 确保高ROE标签存在
        await client.query(`
            INSERT INTO tags (name, type, category, description, criteria) 
            VALUES ('高ROE', '动态', '财务表现', '净资产收益率超过15%的股票', 'roeTTM > 0.15')
            ON CONFLICT (name) DO UPDATE SET type = '动态'
        `);
        
        const highRoeTag = await client.query('SELECT id FROM tags WHERE name = \'高ROE\'');
        if (highRoeTag.rows.length > 0) {
            for (const stock of highRoeStocks) {
                await client.query(
                    'INSERT INTO stock_tags (stock_ticker, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [stock.ticker, highRoeTag.rows[0].id]
                );
            }
            console.log(`已标记 ${highRoeStocks.length} 只高ROE股票`);
        }
    }
    
    // 高毛利率标签 (毛利率 > 50%)
    const highMarginStocks = metricsData
        .filter(item => item.metrics.grossMarginTTM && item.metrics.grossMarginTTM > 0.5)
        .sort((a, b) => b.metrics.grossMarginTTM - a.metrics.grossMarginTTM)
        .slice(0, 25);
    
    if (highMarginStocks.length > 0) {
        await client.query(`
            INSERT INTO tags (name, type, category, description, criteria) 
            VALUES ('高毛利率', '动态', '财务表现', '毛利率超过50%的股票', 'grossMarginTTM > 0.5')
            ON CONFLICT (name) DO UPDATE SET type = '动态'
        `);
        
        const highMarginTag = await client.query('SELECT id FROM tags WHERE name = \'高毛利率\'');
        if (highMarginTag.rows.length > 0) {
            for (const stock of highMarginStocks) {
                await client.query(
                    'INSERT INTO stock_tags (stock_ticker, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [stock.ticker, highMarginTag.rows[0].id]
                );
            }
            console.log(`已标记 ${highMarginStocks.length} 只高毛利率股票`);
        }
    }
}

// 主处理函数
export default async function handler(req, res) {
    // 验证授权
    if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const client = await pool.connect();
    
    try {
        console.log('开始标签更新任务...');
        await client.query('BEGIN');
        
        // 更新动态标签
        await updateDynamicTags(client);
        
        await client.query('COMMIT');
        
        const result = {
            success: true,
            message: '标签更新成功',
            timestamp: new Date().toISOString()
        };
        
        console.log('标签更新任务完成:', result);
        res.status(200).json(result);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('标签更新任务失败:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        client.release();
    }
}

// 手动触发更新（开发环境使用）
if (process.env.NODE_ENV === 'development' && process.argv[2] === 'update') {
    handler({ headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }, {
        status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data) }),
        json: (data) => console.log('Response:', data)
    });
}