// API端点：刷新热力图数据
// 用于GitHub Actions定时调用，触发数据更新

import pkg from 'pg';
const { Pool } = pkg;
import https from 'https';

// 数据库连接池
let pool;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
}

// Finnhub API配置
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// 主要股票列表
const STOCK_SYMBOLS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK.B',
    'JPM', 'JNJ', 'V', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'PYPL', 'BAC',
    'NFLX', 'ADBE', 'CRM', 'CMCSA', 'XOM', 'VZ', 'KO', 'NKE', 'PFE',
    'INTC', 'T', 'MRK', 'WMT', 'CVX', 'ABBV', 'PEP', 'TMO', 'COST',
    'AVGO', 'TXN', 'LLY', 'ACN', 'DHR', 'NEE', 'BMY', 'PM', 'LIN',
    'QCOM', 'HON', 'UPS', 'LOW', 'IBM', 'SBUX', 'AMT', 'GILD', 'CVS'
];

// 获取股票实时价格
function getStockPrice(symbol) {
    return new Promise((resolve, reject) => {
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.c && result.c > 0) {
                        resolve({
                            symbol,
                            price: result.c,
                            change: result.d || 0,
                            changePercent: result.dp || 0,
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        reject(new Error(`无效的价格数据: ${symbol}`));
                    }
                } catch (error) {
                    reject(new Error(`解析数据失败: ${error.message}`));
                }
            });
        }).on('error', (error) => {
            reject(new Error(`API请求失败: ${error.message}`));
        });
    });
}

// 批量更新股票数据
async function updateAllStocks() {
    const results = {
        success: [],
        failed: [],
        total: STOCK_SYMBOLS.length
    };
    
    console.log(`开始更新 ${STOCK_SYMBOLS.length} 只股票的数据...`);
    
    // 分批处理，避免API限制
    const batchSize = 10;
    for (let i = 0; i < STOCK_SYMBOLS.length; i += batchSize) {
        const batch = STOCK_SYMBOLS.slice(i, i + batchSize);
        const promises = batch.map(symbol => 
            getStockPrice(symbol)
                .then(data => {
                    results.success.push(data);
                    return data;
                })
                .catch(error => {
                    console.error(`获取 ${symbol} 数据失败:`, error.message);
                    results.failed.push({ symbol, error: error.message });
                    return null;
                })
        );
        
        await Promise.all(promises);
        
        // 批次间延迟，避免API限制
        if (i + batchSize < STOCK_SYMBOLS.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // 如果有数据库连接，更新数据库
    if (pool && results.success.length > 0) {
        try {
            await updateDatabase(results.success);
            console.log(`数据库更新完成，成功更新 ${results.success.length} 只股票`);
        } catch (error) {
            console.error('数据库更新失败:', error.message);
        }
    }
    
    return results;
}

// 更新数据库
async function updateDatabase(stockData) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        for (const stock of stockData) {
            await client.query(
                `INSERT INTO stocks (symbol, price, change_amount, change_percent, last_updated) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (symbol) 
                 DO UPDATE SET 
                     price = EXCLUDED.price,
                     change_amount = EXCLUDED.change_amount,
                     change_percent = EXCLUDED.change_percent,
                     last_updated = EXCLUDED.last_updated`,
                [stock.symbol, stock.price, stock.change, stock.changePercent, stock.timestamp]
            );
        }
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Vercel API处理函数
export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: '只支持GET请求' });
    }
    
    try {
        console.log('🔄 开始刷新热力图数据...');
        const startTime = Date.now();
        
        // 更新股票数据
        const results = await updateAllStocks();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const response = {
            success: true,
            message: '数据刷新完成',
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            statistics: {
                total: results.total,
                success: results.success.length,
                failed: results.failed.length,
                successRate: `${((results.success.length / results.total) * 100).toFixed(1)}%`
            },
            data: {
                updated: results.success.map(s => ({
                    symbol: s.symbol,
                    price: s.price,
                    change: s.changePercent
                })),
                failed: results.failed
            }
        };
        
        console.log('✅ 数据刷新完成:', response.statistics);
        
        return res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ 数据刷新失败:', error);
        
        return res.status(500).json({
            success: false,
            error: '数据刷新失败',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// 如果直接运行此文件（用于本地测试）
if (import.meta.url === `file://${process.argv[1]}`) {
    updateAllStocks()
        .then(results => {
            console.log('✅ 本地测试完成:', results);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 本地测试失败:', error);
            process.exit(1);
        });
}