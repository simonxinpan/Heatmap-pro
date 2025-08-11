// /api/tags.js - 标签管理API
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// 核心修复：确保导出了一个默认的 handler 函数
export default async function handler(req, res) {
    const { symbol, tag_name, action } = req.query;
    const client = await pool.connect();
    
    try {
        let data;
        if (symbol) { // 场景1: 查询某只股票的所有标签
            const { rows } = await client.query(
                `SELECT t.name, t.color FROM tags t
                 JOIN stock_tags st ON t.id = st.tag_id
                 JOIN stocks s ON st.stock_id = s.id
                 WHERE s.ticker = $1`, [symbol.toUpperCase()]
            );
            data = rows;
        } else if (tag_name) { // 场景2: 查询拥有某个标签的所有股票
            const { rows } = await client.query(
                `SELECT s.ticker, s.name_zh, s.change_percent FROM stocks s
                 JOIN stock_tags st ON s.id = st.stock_id
                 JOIN tags t ON st.tag_id = t.id
                 WHERE t.name = $1`, [tag_name]
            );
            data = rows;
        } else { // 场景3: (默认) 获取所有标签及其股票数量
            const { rows } = await client.query(
                `SELECT t.name, t.color, COUNT(st.stock_id)::int as stock_count FROM tags t
                 LEFT JOIN stock_tags st ON t.id = st.tag_id
                 GROUP BY t.id, t.name, t.color
                 ORDER BY stock_count DESC, t.name`
            );
            data = rows;
        }
        
        // 设置缓存头
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(data);
    } catch (error) {
        console.error(`API /tags Error:`, error);
        res.status(500).json({ error: 'Database query failed.' });
    } finally {
        if (client) client.release();
    }
}