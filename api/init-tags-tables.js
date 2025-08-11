// /api/init-tags-tables.js - 初始化标签表结构
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

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
        
        // 读取表创建脚本
        const sqlPath = path.join(process.cwd(), 'create_tags_tables.sql');
        const createTablesSql = fs.readFileSync(sqlPath, 'utf8');
        
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