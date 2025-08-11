// /api/execute-sql.js - 执行 SQL 命令的 API
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { action } = req.query;
    const client = await pool.connect();
    
    try {
        let result;
        
        if (action === 'create-tables') {
            // 创建标签表
            await client.query(`
                CREATE TABLE IF NOT EXISTS tags (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    color VARCHAR(7) NOT NULL,
                    type VARCHAR(50) DEFAULT '静态',
                    category VARCHAR(100),
                    description TEXT,
                    criteria TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            
            // 创建股票标签关联表
            await client.query(`
                CREATE TABLE IF NOT EXISTS stock_tags (
                    id SERIAL PRIMARY KEY,
                    stock_id INTEGER NOT NULL,
                    tag_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                    UNIQUE(stock_id, tag_id)
                );
            `);
            
            // 创建索引
            await client.query('CREATE INDEX IF NOT EXISTS idx_stock_tags_stock_id ON stock_tags(stock_id);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_stock_tags_tag_id ON stock_tags(tag_id);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);');
            
            result = { message: '标签表创建成功' };
            
        } else if (action === 'insert-tags') {
            // 插入标签数据
            await client.query(`
                INSERT INTO tags (name, color) VALUES
                ('大盘股', '#FF6B6B'),
                ('科技股', '#4ECDC4'),
                ('金融股', '#45B7D1'),
                ('医疗股', '#96CEB4'),
                ('消费股', '#FFEAA7'),
                ('工业股', '#DDA0DD'),
                ('能源股', '#98D8C8'),
                ('公用事业', '#F7DC6F'),
                ('房地产', '#BB8FCE'),
                ('原材料', '#85C1E9'),
                ('通讯服务', '#F8C471'),
                ('半导体', '#82E0AA')
                ON CONFLICT (name) DO NOTHING;
            `);
            
            result = { message: '标签数据插入成功' };
            
        } else if (action === 'insert-stock-tags') {
            // 为股票分配标签（基于行业分类）
            await client.query(`
                INSERT INTO stock_tags (stock_id, tag_id)
                SELECT s.id, t.id
                FROM stocks s
                JOIN tags t ON (
                    (s.sector_zh = '信息技术' AND t.name = '科技股') OR
                    (s.sector_zh = '金融' AND t.name = '金融股') OR
                    (s.sector_zh = '医疗保健' AND t.name = '医疗股') OR
                    (s.sector_zh IN ('日常消费品', '非必需消费品') AND t.name = '消费股') OR
                    (s.sector_zh = '工业' AND t.name = '工业股') OR
                    (s.sector_zh = '能源' AND t.name = '能源股') OR
                    (s.sector_zh = '公用事业' AND t.name = '公用事业') OR
                    (s.sector_zh = '房地产' AND t.name = '房地产') OR
                    (s.sector_zh = '原材料' AND t.name = '原材料') OR
                    (s.sector_zh = '通讯服务' AND t.name = '通讯服务') OR
                    (s.sector_zh = '媒体娱乐' AND t.name = '通讯服务') OR
                    (s.sector_zh = '半导体' AND t.name = '半导体')
                )
                ON CONFLICT (stock_id, tag_id) DO NOTHING;
            `);
            
            // 为所有股票添加大盘股标签
            await client.query(`
                INSERT INTO stock_tags (stock_id, tag_id)
                SELECT s.id, t.id
                FROM stocks s
                CROSS JOIN tags t
                WHERE t.name = '大盘股'
                AND NOT EXISTS (
                    SELECT 1 FROM stock_tags st 
                    WHERE st.stock_id = s.id AND st.tag_id = t.id
                );
            `);
            
            result = { message: '股票标签关联数据插入成功' };
            
        } else {
            return res.status(400).json({ error: '无效的 action 参数' });
        }
        
        // 检查表状态
        const tablesCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('tags', 'stock_tags')
            ORDER BY table_name
        `);
        
        const tagsCount = await client.query('SELECT COUNT(*) as count FROM tags');
        const stockTagsCount = await client.query('SELECT COUNT(*) as count FROM stock_tags');
        
        res.status(200).json({
            success: true,
            result,
            status: {
                existingTables: tablesCheck.rows.map(row => row.table_name),
                tagsCount: parseInt(tagsCount.rows[0].count),
                stockTagsCount: parseInt(stockTagsCount.rows[0].count)
            }
        });
        
    } catch (error) {
        console.error('SQL 执行失败:', error);
        res.status(500).json({ 
            success: false,
            error: 'SQL 执行失败', 
            details: error.message 
        });
    } finally {
        if (client) client.release();
    }
}