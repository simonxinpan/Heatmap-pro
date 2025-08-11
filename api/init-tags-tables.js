// /api/init-tags-tables.js - 初始化标签表结构
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const client = await pool.connect();
    
    try {
        console.log('开始初始化标签表结构...');
        
        // 直接定义表创建 SQL
        const createTablesSql = `
            -- 创建标签表
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
            
            -- 创建股票标签关联表
            CREATE TABLE IF NOT EXISTS stock_tags (
                id SERIAL PRIMARY KEY,
                stock_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                UNIQUE(stock_id, tag_id)
            );
            
            -- 创建索引
            CREATE INDEX IF NOT EXISTS idx_stock_tags_stock_id ON stock_tags(stock_id);
            CREATE INDEX IF NOT EXISTS idx_stock_tags_tag_id ON stock_tags(tag_id);
            CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
            CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);
        `;
        
        // 执行表创建脚本
        await client.query(createTablesSql);
        console.log('✅ 标签表结构创建成功');
        
        // 检查表是否存在
        const tablesCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('tags', 'stock_tags')
            ORDER BY table_name
        `);
        
        const existingTables = tablesCheck.rows.map(row => row.table_name);
        console.log('已创建的表:', existingTables);
        
        // 检查表结构
        const tagsColumns = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'tags' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const stockTagsColumns = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'stock_tags' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        res.status(200).json({
            success: true,
            message: '标签表结构初始化成功',
            data: {
                existingTables,
                tagsColumns: tagsColumns.rows,
                stockTagsColumns: stockTagsColumns.rows
            }
        });
        
    } catch (error) {
        console.error('初始化标签表失败:', error);
        res.status(500).json({ 
            success: false,
            error: '初始化标签表失败', 
            details: error.message 
        });
    } finally {
        if (client) client.release();
    }
}