// /api/sector-aggregation.js - 行业聚合数据API
// 提供行业级别的股票数据聚合，包括涨跌幅、成交量、活跃股票数量

import { Client } from 'pg';

// 检查数据库配置
const isDatabaseConfigured = process.env.DATABASE_URL && 
    !process.env.DATABASE_URL.includes('username:password') &&
    !process.env.DATABASE_URL.includes('ep-xxx-xxx');

let client = null;

if (isDatabaseConfigured) {
    // Neon数据库连接配置
    client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    // 连接数据库
    client.connect().catch(err => {
        console.error('数据库连接失败:', err);
        client = null;
    });
} else {
    console.log('⚠️ 数据库未配置，将使用模拟数据');
}

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
 * 生成模拟行业数据
 * @returns {Array} 模拟的行业聚合数据
 */
function generateMockSectorData() {
    const sectors = [
        '信息技术', '医疗保健', '金融', '非必需消费品', '工业',
        '必需消费品', '能源', '公用事业', '材料', '房地产', '通信服务'
    ];
    
    return sectors.map(sector => {
        const changePercent = (Math.random() - 0.5) * 10; // -5% 到 +5%
        const volume = Math.floor(Math.random() * 1000000000); // 随机成交量
        const activeStocks = Math.floor(Math.random() * 50) + 10; // 10-60只活跃股票
        const totalMarketCap = Math.floor(Math.random() * 1000000000000); // 随机市值
        
        return {
            sector: sector,
            change_percent: Math.round(changePercent * 100) / 100,
            volume_formatted: formatVolumeInChinese(volume),
            active_stocks: activeStocks,
            total_market_cap: totalMarketCap,
            stocks: [],
            last_updated: new Date().toISOString()
        };
    });
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
    
    // 如果数据库未配置，返回模拟数据
    if (!client) {
        console.log(`🎭 使用模拟数据 for ${sectorZh}`);
        const mockData = generateMockSectorData();
        const sectorData = mockData.find(s => s.sector === sectorZh);
        if (sectorData) {
            setCache(cacheKey, sectorData);
            return sectorData;
        } else {
            // 如果找不到对应行业，生成一个默认的
            const changePercent = (Math.random() - 0.5) * 10;
            const defaultData = {
                sector: sectorZh,
                change_percent: Math.round(changePercent * 100) / 100,
                volume_formatted: formatVolumeInChinese(Math.floor(Math.random() * 1000000000)),
                active_stocks: Math.floor(Math.random() * 50) + 10,
                total_market_cap: Math.floor(Math.random() * 1000000000000),
                stocks: [],
                last_updated: new Date().toISOString()
            };
            setCache(cacheKey, defaultData);
            return defaultData;
        }
    }
    
    try {
        // 使用已连接的client
        
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
        
        // client保持连接
        
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
                change_percent: Math.round(avgChangePercent * 100) / 100,
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
    
    // 如果数据库未配置，返回模拟数据
    if (!client) {
        console.log('🎭 使用模拟数据获取所有行业');
        const mockData = generateMockSectorData();
        
        // 计算总体统计数据
        const totalMarketCap = mockData.reduce((sum, agg) => sum + agg.total_market_cap, 0);
        const totalActiveStocks = mockData.reduce((sum, agg) => sum + agg.active_stocks, 0);
        
        // 计算市值加权平均涨跌幅
        const weightedChangeSum = mockData.reduce((sum, agg) => {
            return sum + (agg.total_market_cap * agg.change_percent);
        }, 0);
        const overallChange = totalMarketCap > 0 ? Math.round((weightedChangeSum / totalMarketCap) * 100) / 100 : 0;
        
        const data = {
            success: true,
            data: mockData,
            total_sectors: mockData.length,
            overall_change: overallChange,
            total_active_stocks: totalActiveStocks,
            total_market_cap: totalMarketCap,
            timestamp: new Date().toISOString()
        };
        
        // 缓存结果
        setCache(cacheKey, data);
        return data;
    }
    
    try {
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
        const overallChange = totalMarketCap > 0 ? Math.round((weightedChangeSum / totalMarketCap) * 100) / 100 : 0;
        
        const data = {
            success: true,
            data: aggregations,
            total_sectors: aggregations.length,
            overall_change: overallChange,
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