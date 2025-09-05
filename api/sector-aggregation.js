// /api/sector-aggregation.js - 行业聚合数据API
// 提供行业级别的股票数据聚合，包括涨跌幅、成交量、活跃股票数量

import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// 缓存配置
const cache = new Map();
const CACHE_TTL = 30000; // 30秒缓存时间
const MAX_CACHE_SIZE = 100; // 最大缓存条目数

/**
 * 缓存管理函数
 */
function getCacheKey(type, params = {}) {
    return `${type}:${JSON.stringify(params)}`;
}

function getFromCache(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    // 清理过期缓存
    if (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
    
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
}

function clearCache() {
    cache.clear();
}

/**
 * 格式化成交量为中文习惯显示
 * @param {number} volume - 成交量（股数）
 * @returns {string} 格式化后的成交量字符串
 */
function formatVolumeInChinese(volume) {
    if (!volume || volume === 0) return '0笔';
    
    if (volume >= 100000000) { // 1亿以上
        return (volume / 100000000).toFixed(1) + '亿笔';
    } else if (volume >= 10000) { // 1万以上
        return (volume / 10000).toFixed(1) + '万笔';
    } else {
        return Math.round(volume) + '笔';
    }
}

/**
 * 计算行业聚合数据
 * @param {string} sectorZh - 行业中文名称
 * @returns {Object} 行业聚合数据
 */
async function calculateSectorAggregation(sectorZh) {
    const cacheKey = getCacheKey('sector', { sectorZh });
    
    // 尝试从缓存获取
    const cached = getFromCache(cacheKey);
    if (cached) {
        console.log(`📦 从缓存获取${sectorZh}数据`);
        return cached;
    }
    
    try {
        const client = await pool.connect();
        
        // 查询该行业的所有股票数据
        const query = `
            SELECT 
                ticker,
                name_zh,
                market_cap,
                change_percent,
                volume,
                price,
                updated_at
            FROM stocks 
            WHERE sector_zh = $1 
                AND market_cap IS NOT NULL 
                AND change_percent IS NOT NULL
                AND volume IS NOT NULL
            ORDER BY market_cap DESC
        `;
        
        const startTime = Date.now();
        const result = await client.query(query, [sectorZh]);
        const queryTime = Date.now() - startTime;
        
        console.log(`🔍 查询${sectorZh}数据耗时: ${queryTime}ms`);
        
        const stocks = result.rows;
        
        client.release();
        
        let data;
        if (stocks.length === 0) {
            data = {
                sector: sectorZh,
                change_percent: 0,
                volume_formatted: '0笔',
                active_stocks: 0,
                total_market_cap: 0,
                stocks: [],
                last_updated: null
            };
        } else {
            // 计算市值加权平均涨跌幅
            let totalMarketCap = 0;
            let weightedChangeSum = 0;
            let totalVolume = 0;
            
            stocks.forEach(stock => {
                const marketCap = parseFloat(stock.market_cap) || 0;
                const changePercent = parseFloat(stock.change_percent) || 0;
                const volume = parseFloat(stock.volume) || 0;
                
                totalMarketCap += marketCap;
                weightedChangeSum += marketCap * changePercent;
                totalVolume += volume;
            });
            
            // 市值加权平均涨跌幅
            const avgChangePercent = totalMarketCap > 0 ? 
                (weightedChangeSum / totalMarketCap) : 0;
            
            data = {
                sector: sectorZh,
                change_percent: parseFloat(avgChangePercent.toFixed(2)),
                volume_formatted: formatVolumeInChinese(totalVolume),
                active_stocks: stocks.length,
                total_market_cap: totalMarketCap,
                stocks: stocks.map(stock => ({
                    ticker: stock.ticker,
                    name_zh: stock.name_zh,
                    market_cap: stock.market_cap,
                    change_percent: stock.change_percent,
                    volume: stock.volume,
                    price: stock.price
                })),
                last_updated: stocks[0]?.updated_at || null
            };
        }
        
        // 缓存结果
        setCache(cacheKey, data);
        
        return data;
        
    } catch (error) {
        console.error(`Error calculating sector aggregation for ${sectorZh}:`, error);
        throw error;
    }
}

/**
 * 获取所有行业的聚合数据
 */
async function getAllSectorsAggregation() {
    const cacheKey = getCacheKey('all_sectors');
    
    // 尝试从缓存获取
    const cached = getFromCache(cacheKey);
    if (cached) {
        console.log('📦 从缓存获取所有行业数据');
        return cached;
    }
    
    try {
        const client = await pool.connect();
        
        // 获取所有行业列表
        const sectorsQuery = `
            SELECT DISTINCT sector_zh 
            FROM stocks 
            WHERE sector_zh IS NOT NULL 
                AND sector_zh != ''
            ORDER BY sector_zh
        `;
        
        const startTime = Date.now();
        const sectorsResult = await client.query(sectorsQuery);
        const sectors = sectorsResult.rows.map(row => row.sector_zh);
        
        client.release();
        
        // 并行计算所有行业的聚合数据
        const aggregationPromises = sectors.map(sector => 
            calculateSectorAggregation(sector)
        );
        
        const aggregations = await Promise.all(aggregationPromises);
        const queryTime = Date.now() - startTime;
        
        console.log(`🔍 查询所有行业数据耗时: ${queryTime}ms`);
        
        // 计算总体统计数据
        const totalMarketCap = aggregations.reduce((sum, agg) => sum + agg.total_market_cap, 0);
        const totalActiveStocks = aggregations.reduce((sum, agg) => sum + agg.active_stocks, 0);
        
        // 计算市值加权平均涨跌幅
        const weightedChangeSum = aggregations.reduce((sum, agg) => {
            return sum + (agg.total_market_cap * agg.change_percent);
        }, 0);
        const overallChange = totalMarketCap > 0 ? (weightedChangeSum / totalMarketCap) : 0;
        
        const data = {
            success: true,
            data: aggregations,
            total_sectors: aggregations.length,
            overall_change: parseFloat(overallChange.toFixed(2)),
            total_active_stocks: totalActiveStocks,
            total_market_cap: totalMarketCap,
            timestamp: new Date().toISOString()
        };
        
        // 缓存结果
        setCache(cacheKey, data);
        
        return data;
        
    } catch (error) {
        console.error('Error getting all sectors aggregation:', error);
        throw error;
    }
}

// API 主处理函数
export default async function handler(request, response) {
    try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const sector = url.searchParams.get('sector');
        
        // 设置CORS头
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (request.method === 'OPTIONS') {
            response.writeHead(200);
            response.end();
            return;
        }
        
        if (request.method !== 'GET') {
            response.writeHead(405, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }
        
        console.log(`🔍 Fetching sector aggregation data${sector ? ` for: ${sector}` : ' for all sectors'}`);
        
        let result;
        
        if (sector) {
            // 获取单个行业的聚合数据
            const aggregation = await calculateSectorAggregation(sector);
            result = {
                success: true,
                data: aggregation,
                timestamp: new Date().toISOString()
            };
        } else {
            // 获取所有行业的聚合数据
            result = await getAllSectorsAggregation();
        }
        
        // 设置缓存头（5分钟缓存）
        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(result));
        
        console.log(`✅ Successfully returned sector aggregation data`);
        
    } catch (error) {
        console.error('❌ API /sector-aggregation.js Error:', error);
        
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
            success: false,
            error: 'Failed to fetch sector aggregation data',
            details: error.message,
            timestamp: new Date().toISOString()
        }));
    }
}