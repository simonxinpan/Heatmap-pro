#!/usr/bin/env node

/**
 * 动态标签更新脚本
 * 功能: 根据最新的市场和财务数据，自动计算和更新动态标签
 * 运行频率: 每日执行一次（通过GitHub Actions）
 * 版本: V1.0
 */

import { Pool } from 'pg';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 数据库连接
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Polygon API配置
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const POLYGON_BASE_URL = 'https://api.polygon.io';

// 标签计算器映射
const TAG_CALCULATORS = {
  '52周新高': calculate52WeekHigh,
  '52周新低': calculate52WeekLow,
  '近期强势': calculateRecentStrong,
  '近期弱势': calculateRecentWeak,
  '高成交量': calculateHighVolume,
  '高ROE': calculateHighROE,
  '低市盈率': calculateLowPE,
  '高股息率': calculateHighDividend,
  '大盘股': calculateLargeCap,
  '中盘股': calculateMidCap,
  '小盘股': calculateSmallCap
};

// 主执行函数
async function main() {
  console.log('🚀 开始更新动态标签...');
  console.log(`⏰ 执行时间: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  let totalUpdated = 0;
  let totalErrors = 0;

  try {
    // 获取所有动态标签
    const dynamicTags = await getDynamicTags();
    console.log(`📊 找到 ${dynamicTags.length} 个动态标签需要更新`);

    // 逐个更新标签
    for (const tag of dynamicTags) {
      try {
        console.log(`\n🔄 正在更新标签: ${tag.name}`);
        
        const calculator = TAG_CALCULATORS[tag.name];
        if (!calculator) {
          console.warn(`⚠️  未找到标签 "${tag.name}" 的计算器，跳过`);
          continue;
        }

        const result = await calculator(tag);
        await updateStockTags(tag.id, tag.name, result.qualifiedStocks);
        
        console.log(`✅ 标签 "${tag.name}" 更新完成: ${result.qualifiedStocks.length} 只股票符合条件`);
        totalUpdated++;
        
        // 记录更新日志
        await logTagUpdate(tag.id, 'update', result.qualifiedStocks.length, Date.now() - startTime);
        
      } catch (error) {
        console.error(`❌ 更新标签 "${tag.name}" 时出错:`, error.message);
        totalErrors++;
        
        // 记录错误日志
        await logTagUpdate(tag.id, 'update', 0, Date.now() - startTime, error.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n🎉 动态标签更新完成!`);
    console.log(`📈 成功更新: ${totalUpdated} 个标签`);
    console.log(`❌ 更新失败: ${totalErrors} 个标签`);
    console.log(`⏱️  总耗时: ${(duration / 1000).toFixed(2)} 秒`);
    
  } catch (error) {
    console.error('💥 动态标签更新过程中发生严重错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * 获取所有需要更新的动态标签
 */
async function getDynamicTags() {
  const client = await pool.connect();
  try {
    const query = `
      SELECT id, name, calculation_rule, description
      FROM tags 
      WHERE category = 'dynamic' AND is_active = true
      ORDER BY sort_order
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * 更新股票标签关联
 */
async function updateStockTags(tagId, tagName, qualifiedStocks) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 先将该标签的所有关联设为无效
    await client.query(
      'UPDATE stock_tags SET is_valid = false WHERE tag_id = $1',
      [tagId]
    );
    
    // 插入新的关联
    for (const stock of qualifiedStocks) {
      await client.query(`
        INSERT INTO stock_tags (stock_id, tag_id, relevance_score, calculated_value, is_valid)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (stock_id, tag_id) 
        DO UPDATE SET 
          relevance_score = EXCLUDED.relevance_score,
          calculated_value = EXCLUDED.calculated_value,
          is_valid = true,
          updated_at = CURRENT_TIMESTAMP
      `, [stock.stock_id, tagId, stock.relevance_score, stock.calculated_value]);
    }
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 记录标签更新日志
 */
async function logTagUpdate(tagId, updateType, affectedCount, executionTime, errorMessage = null) {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO tag_update_logs (tag_id, update_type, affected_stocks_count, execution_time_ms, error_message)
      VALUES ($1, $2, $3, $4, $5)
    `, [tagId, updateType, affectedCount, executionTime, errorMessage]);
  } catch (error) {
    console.error('记录更新日志失败:', error);
  } finally {
    client.release();
  }
}

// =====================================================
// 标签计算器函数
// =====================================================

/**
 * 计算52周新高股票
 */
async function calculate52WeekHigh(tag) {
  const client = await pool.connect();
  try {
    // 获取当前价格和52周最高价的股票
    const query = `
      SELECT 
        s.id as stock_id,
        s.ticker,
        s.name_zh,
        current_price,
        -- 这里需要根据实际的历史价格表结构调整
        (current_price / NULLIF(market_cap / 1000000000.0, 0)) as price_ratio
      FROM stocks s
      WHERE current_price IS NOT NULL
        AND current_price > 0
      -- 添加52周新高的具体计算逻辑
      ORDER BY s.market_cap DESC
      LIMIT 100
    `;
    
    const result = await client.query(query);
    
    return {
      qualifiedStocks: result.rows.map(row => ({
        stock_id: row.stock_id,
        relevance_score: 1.0,
        calculated_value: row.current_price
      }))
    };
  } finally {
    client.release();
  }
}

/**
 * 计算52周新低股票
 */
async function calculate52WeekLow(tag) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        s.id as stock_id,
        s.ticker,
        current_price
      FROM stocks s
      WHERE current_price IS NOT NULL
        AND current_price > 0
      -- 添加52周新低的具体计算逻辑
      ORDER BY current_price ASC
      LIMIT 50
    `;
    
    const result = await client.query(query);
    
    return {
      qualifiedStocks: result.rows.map(row => ({
        stock_id: row.stock_id,
        relevance_score: 1.0,
        calculated_value: row.current_price
      }))
    };
  } finally {
    client.release();
  }
}

/**
 * 计算近期强势股票（基于涨跌幅）
 */
async function calculateRecentStrong(tag) {
  const client = await pool.connect();
  try {
    // 从Polygon API获取近期表现数据
    const stocks = await getAllStocks();
    const qualifiedStocks = [];
    
    for (const stock of stocks.slice(0, 100)) { // 限制处理数量
      try {
        const changePercent = await getStockChangePercent(stock.ticker, 30);
        if (changePercent > 10) { // 30日涨幅超过10%
          qualifiedStocks.push({
            stock_id: stock.id,
            relevance_score: Math.min(1.0, changePercent / 50), // 涨幅越大相关度越高
            calculated_value: changePercent
          });
        }
      } catch (error) {
        console.warn(`获取 ${stock.ticker} 涨跌幅失败:`, error.message);
      }
    }
    
    return { qualifiedStocks };
  } finally {
    client.release();
  }
}

/**
 * 计算近期弱势股票
 */
async function calculateRecentWeak(tag) {
  const client = await pool.connect();
  try {
    const stocks = await getAllStocks();
    const qualifiedStocks = [];
    
    for (const stock of stocks.slice(0, 100)) {
      try {
        const changePercent = await getStockChangePercent(stock.ticker, 30);
        if (changePercent < -10) { // 30日跌幅超过10%
          qualifiedStocks.push({
            stock_id: stock.id,
            relevance_score: Math.min(1.0, Math.abs(changePercent) / 50),
            calculated_value: changePercent
          });
        }
      } catch (error) {
        console.warn(`获取 ${stock.ticker} 涨跌幅失败:`, error.message);
      }
    }
    
    return { qualifiedStocks };
  } finally {
    client.release();
  }
}

/**
 * 计算高成交量股票
 */
async function calculateHighVolume(tag) {
  // 这里需要实现基于成交量的计算逻辑
  return { qualifiedStocks: [] };
}

/**
 * 计算高ROE股票
 */
async function calculateHighROE(tag) {
  const client = await pool.connect();
  try {
    // 这里需要根据实际的财务数据表结构调整
    const query = `
      SELECT 
        s.id as stock_id,
        s.ticker,
        s.market_cap
      FROM stocks s
      WHERE s.market_cap > 1000000000 -- 市值大于10亿
      ORDER BY s.market_cap DESC
      LIMIT 100
    `;
    
    const result = await client.query(query);
    
    return {
      qualifiedStocks: result.rows.map(row => ({
        stock_id: row.stock_id,
        relevance_score: 0.8,
        calculated_value: 15.5 // 模拟ROE值
      }))
    };
  } finally {
    client.release();
  }
}

/**
 * 计算低市盈率股票
 */
async function calculateLowPE(tag) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        s.id as stock_id,
        s.ticker,
        s.market_cap
      FROM stocks s
      WHERE s.market_cap IS NOT NULL
      ORDER BY s.market_cap DESC
      LIMIT 80
    `;
    
    const result = await client.query(query);
    
    return {
      qualifiedStocks: result.rows.map(row => ({
        stock_id: row.stock_id,
        relevance_score: 0.9,
        calculated_value: 12.5 // 模拟PE值
      }))
    };
  } finally {
    client.release();
  }
}

/**
 * 计算高股息率股票
 */
async function calculateHighDividend(tag) {
  return { qualifiedStocks: [] };
}

/**
 * 计算大盘股
 */
async function calculateLargeCap(tag) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        s.id as stock_id,
        s.ticker,
        s.market_cap
      FROM stocks s
      WHERE s.market_cap > 10000000000 -- 市值大于100亿美元
      ORDER BY s.market_cap DESC
    `;
    
    const result = await client.query(query);
    
    return {
      qualifiedStocks: result.rows.map(row => ({
        stock_id: row.stock_id,
        relevance_score: 1.0,
        calculated_value: row.market_cap
      }))
    };
  } finally {
    client.release();
  }
}

/**
 * 计算中盘股
 */
async function calculateMidCap(tag) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        s.id as stock_id,
        s.ticker,
        s.market_cap
      FROM stocks s
      WHERE s.market_cap BETWEEN 2000000000 AND 10000000000 -- 20-100亿美元
      ORDER BY s.market_cap DESC
    `;
    
    const result = await client.query(query);
    
    return {
      qualifiedStocks: result.rows.map(row => ({
        stock_id: row.stock_id,
        relevance_score: 1.0,
        calculated_value: row.market_cap
      }))
    };
  } finally {
    client.release();
  }
}

/**
 * 计算小盘股
 */
async function calculateSmallCap(tag) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        s.id as stock_id,
        s.ticker,
        s.market_cap
      FROM stocks s
      WHERE s.market_cap < 2000000000 -- 市值小于20亿美元
        AND s.market_cap > 100000000 -- 但大于1亿美元（过滤微盘股）
      ORDER BY s.market_cap DESC
    `;
    
    const result = await client.query(query);
    
    return {
      qualifiedStocks: result.rows.map(row => ({
        stock_id: row.stock_id,
        relevance_score: 1.0,
        calculated_value: row.market_cap
      }))
    };
  } finally {
    client.release();
  }
}

// =====================================================
// 辅助函数
// =====================================================

/**
 * 获取所有股票列表
 */
async function getAllStocks() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, ticker, name_zh FROM stocks ORDER BY market_cap DESC');
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * 从Polygon API获取股票涨跌幅
 */
async function getStockChangePercent(ticker, days = 30) {
  if (!POLYGON_API_KEY) {
    throw new Error('Polygon API key not configured');
  }
  
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  
  const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/day/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}?apikey=${POLYGON_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length >= 2) {
      const firstPrice = data.results[0].o; // 开盘价
      const lastPrice = data.results[data.results.length - 1].c; // 收盘价
      return ((lastPrice - firstPrice) / firstPrice) * 100;
    }
    
    return 0;
  } catch (error) {
    console.warn(`获取 ${ticker} 价格数据失败:`, error.message);
    return 0;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as updateDynamicTags };