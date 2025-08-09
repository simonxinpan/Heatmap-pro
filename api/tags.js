// 标签系统核心API
// 功能: 获取标签信息、股票标签关联、标签统计等
// 版本: V1.0

import { Pool } from 'pg';

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 缓存配置
const CACHE_DURATION = 15 * 60; // 15分钟

export default async function handler(req, res) {
  // 设置CORS和缓存头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', `s-maxage=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ticker, tagName, category, type, page = 1, limit = 50, sort = 'relevance' } = req.query;

    switch (action) {
      case 'stock-tags':
        return await getStockTags(req, res, ticker);
      
      case 'tag-stocks':
        return await getTagStocks(req, res, tagName, page, limit, sort);
      
      case 'all-tags':
        return await getAllTags(req, res, category, type);
      
      case 'tag-stats':
        return await getTagStatistics(req, res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action', 
          validActions: ['stock-tags', 'tag-stocks', 'all-tags', 'tag-stats']
        });
    }
  } catch (error) {
    console.error('Tags API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

/**
 * 获取指定股票的所有标签
 * GET /api/tags?action=stock-tags&ticker=AAPL
 */
async function getStockTags(req, res, ticker) {
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker parameter is required' });
  }

  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        t.id,
        t.name,
        t.name_en,
        t.category,
        t.type,
        t.description,
        t.color,
        st.relevance_score,
        st.calculated_value,
        st.updated_at as tag_updated_at
      FROM stocks s
      JOIN stock_tags st ON s.id = st.stock_id
      JOIN tags t ON st.tag_id = t.id
      WHERE s.ticker = $1 
        AND st.is_valid = true 
        AND t.is_active = true
      ORDER BY t.sort_order, st.relevance_score DESC
    `;
    
    const result = await client.query(query, [ticker.toUpperCase()]);
    
    if (result.rows.length === 0) {
      // 检查股票是否存在
      const stockCheck = await client.query('SELECT ticker FROM stocks WHERE ticker = $1', [ticker.toUpperCase()]);
      if (stockCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Stock not found' });
      }
    }

    // 按类型分组标签
    const tagsByType = result.rows.reduce((acc, tag) => {
      if (!acc[tag.type]) {
        acc[tag.type] = [];
      }
      acc[tag.type].push({
        id: tag.id,
        name: tag.name,
        name_en: tag.name_en,
        category: tag.category,
        description: tag.description,
        color: tag.color,
        relevance_score: parseFloat(tag.relevance_score),
        calculated_value: tag.calculated_value ? parseFloat(tag.calculated_value) : null,
        updated_at: tag.tag_updated_at
      });
      return acc;
    }, {});

    return res.status(200).json({
      ticker: ticker.toUpperCase(),
      total_tags: result.rows.length,
      tags_by_type: tagsByType,
      tags: result.rows.map(tag => ({
        id: tag.id,
        name: tag.name,
        name_en: tag.name_en,
        category: tag.category,
        type: tag.type,
        description: tag.description,
        color: tag.color,
        relevance_score: parseFloat(tag.relevance_score),
        calculated_value: tag.calculated_value ? parseFloat(tag.calculated_value) : null,
        updated_at: tag.tag_updated_at
      }))
    });
    
  } finally {
    client.release();
  }
}

/**
 * 获取拥有指定标签的所有股票
 * GET /api/tags?action=tag-stocks&tagName=高ROE&page=1&limit=50&sort=relevance
 */
async function getTagStocks(req, res, tagName, page, limit, sort) {
  if (!tagName) {
    return res.status(400).json({ error: 'tagName parameter is required' });
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  // 排序选项
  const sortOptions = {
    'relevance': 'st.relevance_score DESC, s.market_cap DESC',
    'market_cap': 's.market_cap DESC',
    'change_percent': 'COALESCE(st.calculated_value, 0) DESC',
    'name': 's.name_zh ASC',
    'ticker': 's.ticker ASC'
  };
  
  const orderBy = sortOptions[sort] || sortOptions['relevance'];

  const client = await pool.connect();
  
  try {
    // 首先检查标签是否存在
    const tagCheck = await client.query(
      'SELECT id, name, description, type, category FROM tags WHERE name = $1 AND is_active = true',
      [tagName]
    );
    
    if (tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    const tagInfo = tagCheck.rows[0];

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tags t
      JOIN stock_tags st ON t.id = st.tag_id
      JOIN stocks s ON st.stock_id = s.id
      WHERE t.name = $1 AND st.is_valid = true AND t.is_active = true
    `;
    
    const countResult = await client.query(countQuery, [tagName]);
    const totalCount = parseInt(countResult.rows[0].total);

    // 获取股票数据
    const stocksQuery = `
      SELECT 
        s.ticker,
        s.name_zh,
        s.sector_zh,
        s.market_cap,
        st.relevance_score,
        st.calculated_value,
        st.updated_at as tag_updated_at
      FROM tags t
      JOIN stock_tags st ON t.id = st.tag_id
      JOIN stocks s ON st.stock_id = s.id
      WHERE t.name = $1 AND st.is_valid = true AND t.is_active = true
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `;
    
    const stocksResult = await client.query(stocksQuery, [tagName, limitNum, offset]);

    return res.status(200).json({
      tag: {
        name: tagInfo.name,
        description: tagInfo.description,
        type: tagInfo.type,
        category: tagInfo.category
      },
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limitNum)
      },
      sort_by: sort,
      stocks: stocksResult.rows.map(stock => ({
        ticker: stock.ticker,
        name_zh: stock.name_zh,
        sector_zh: stock.sector_zh,
        market_cap: stock.market_cap ? parseInt(stock.market_cap) : null,
        relevance_score: parseFloat(stock.relevance_score),
        calculated_value: stock.calculated_value ? parseFloat(stock.calculated_value) : null,
        tag_updated_at: stock.tag_updated_at
      }))
    });
    
  } finally {
    client.release();
  }
}

/**
 * 获取所有标签列表
 * GET /api/tags?action=all-tags&category=dynamic&type=performance
 */
async function getAllTags(req, res, category, type) {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        t.id,
        t.name,
        t.name_en,
        t.category,
        t.type,
        t.description,
        t.color,
        t.sort_order,
        COUNT(st.stock_id) as stock_count,
        AVG(st.relevance_score) as avg_relevance,
        MAX(st.updated_at) as last_updated
      FROM tags t
      LEFT JOIN stock_tags st ON t.id = st.tag_id AND st.is_valid = true
      WHERE t.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND t.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    query += `
      GROUP BY t.id, t.name, t.name_en, t.category, t.type, t.description, t.color, t.sort_order
      ORDER BY t.sort_order, t.name
    `;
    
    const result = await client.query(query, params);

    // 按类型分组
    const tagsByType = result.rows.reduce((acc, tag) => {
      if (!acc[tag.type]) {
        acc[tag.type] = [];
      }
      acc[tag.type].push({
        id: tag.id,
        name: tag.name,
        name_en: tag.name_en,
        category: tag.category,
        description: tag.description,
        color: tag.color,
        stock_count: parseInt(tag.stock_count),
        avg_relevance: tag.avg_relevance ? parseFloat(tag.avg_relevance) : null,
        last_updated: tag.last_updated
      });
      return acc;
    }, {});

    return res.status(200).json({
      total_tags: result.rows.length,
      filters: {
        category: category || 'all',
        type: type || 'all'
      },
      tags_by_type: tagsByType,
      tags: result.rows.map(tag => ({
        id: tag.id,
        name: tag.name,
        name_en: tag.name_en,
        category: tag.category,
        type: tag.type,
        description: tag.description,
        color: tag.color,
        stock_count: parseInt(tag.stock_count),
        avg_relevance: tag.avg_relevance ? parseFloat(tag.avg_relevance) : null,
        last_updated: tag.last_updated
      }))
    });
    
  } finally {
    client.release();
  }
}

/**
 * 获取标签统计信息
 * GET /api/tags?action=tag-stats
 */
async function getTagStatistics(req, res) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        category,
        type,
        COUNT(*) as tag_count,
        SUM(CASE WHEN stock_count > 0 THEN 1 ELSE 0 END) as active_tag_count,
        SUM(stock_count) as total_associations,
        AVG(stock_count) as avg_stocks_per_tag,
        MAX(stock_count) as max_stocks_per_tag
      FROM (
        SELECT 
          t.category,
          t.type,
          COUNT(st.stock_id) as stock_count
        FROM tags t
        LEFT JOIN stock_tags st ON t.id = st.tag_id AND st.is_valid = true
        WHERE t.is_active = true
        GROUP BY t.id, t.category, t.type
      ) tag_stats
      GROUP BY category, type
      ORDER BY category, type
    `;
    
    const result = await client.query(query);

    // 总体统计
    const overallQuery = `
      SELECT 
        COUNT(DISTINCT t.id) as total_tags,
        COUNT(DISTINCT CASE WHEN t.category = 'static' THEN t.id END) as static_tags,
        COUNT(DISTINCT CASE WHEN t.category = 'dynamic' THEN t.id END) as dynamic_tags,
        COUNT(DISTINCT s.id) as total_stocks,
        COUNT(st.id) as total_associations,
        AVG(tags_per_stock.tag_count) as avg_tags_per_stock
      FROM tags t
      LEFT JOIN stock_tags st ON t.id = st.tag_id AND st.is_valid = true
      LEFT JOIN stocks s ON st.stock_id = s.id
      LEFT JOIN (
        SELECT stock_id, COUNT(*) as tag_count
        FROM stock_tags
        WHERE is_valid = true
        GROUP BY stock_id
      ) tags_per_stock ON s.id = tags_per_stock.stock_id
      WHERE t.is_active = true
    `;
    
    const overallResult = await client.query(overallQuery);
    const overall = overallResult.rows[0];

    return res.status(200).json({
      overall: {
        total_tags: parseInt(overall.total_tags),
        static_tags: parseInt(overall.static_tags),
        dynamic_tags: parseInt(overall.dynamic_tags),
        total_stocks: parseInt(overall.total_stocks),
        total_associations: parseInt(overall.total_associations),
        avg_tags_per_stock: overall.avg_tags_per_stock ? parseFloat(overall.avg_tags_per_stock) : 0
      },
      by_category_type: result.rows.map(row => ({
        category: row.category,
        type: row.type,
        tag_count: parseInt(row.tag_count),
        active_tag_count: parseInt(row.active_tag_count),
        total_associations: parseInt(row.total_associations),
        avg_stocks_per_tag: row.avg_stocks_per_tag ? parseFloat(row.avg_stocks_per_tag) : 0,
        max_stocks_per_tag: parseInt(row.max_stocks_per_tag)
      }))
    });
    
  } finally {
    client.release();
  }
}