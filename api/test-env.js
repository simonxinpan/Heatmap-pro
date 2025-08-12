// 测试环境变量和数据库连接
import { Pool } from 'pg';

export default async function handler(request, response) {
    const { action } = request.query;
    
    // 如果是初始化标签表的请求
    if (action === 'init-tags' && request.method === 'POST') {
        return await initTagsTables(request, response);
    }
    
    try {
        // 检查环境变量
        const envCheck = {
            DATABASE_URL: process.env.DATABASE_URL ? '已配置' : '未配置',
            NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? '已配置' : '未配置',
            POLYGON_API_KEY: process.env.POLYGON_API_KEY ? '已配置' : '未配置',
            FINNHUB_API_KEY: process.env.FINNHUB_API_KEY ? '已配置' : '未配置',
            NODE_ENV: process.env.NODE_ENV || '未设置'
        };

        // 尝试连接数据库
        let dbStatus = '未连接';
        let tableInfo = null;
        
        if (process.env.NEON_DATABASE_URL) {
            try {
                const pool = new Pool({
                    connectionString: process.env.NEON_DATABASE_URL,
                    ssl: { rejectUnauthorized: false },
                });
                
                // 测试连接
                const client = await pool.connect();
                
                // 检查 stocks 表结构
                const tableResult = await client.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'stocks'
                    ORDER BY ordinal_position;
                `);
                
                // 检查数据量
                const countResult = await client.query('SELECT COUNT(*) as count FROM stocks');
                
                client.release();
                await pool.end();
                
                dbStatus = '连接成功';
                tableInfo = {
                    columns: tableResult.rows,
                    rowCount: countResult.rows[0].count
                };
                
            } catch (dbError) {
                dbStatus = `连接失败: ${dbError.message}`;
            }
        }

        response.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            environment: envCheck,
            database: {
                status: dbStatus,
                tableInfo: tableInfo
            }
        });
        
    } catch (error) {
        response.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// 初始化标签表的函数
async function initTagsTables(request, response) {
    const pool = new Pool({
        connectionString: process.env.NEON_DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    
    const client = await pool.connect();
    
    try {
        console.log('开始初始化标签表结构...');
        
        // 创建标签表
        await client.query(`
            CREATE TABLE IF NOT EXISTS tags (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                type VARCHAR(50) DEFAULT '静态',
                category VARCHAR(100),
                description TEXT,
                criteria TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // 创建索引
        await client.query('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);');
        
        console.log('✅ 标签表结构创建成功');
        
        // 插入标签数据
        await client.query(`
            INSERT INTO tags (name, type) VALUES
            ('大盘股', '静态'),
            ('科技股', '静态'),
            ('金融股', '静态'),
            ('医疗股', '静态'),
            ('消费股', '静态'),
            ('工业股', '静态'),
            ('能源股', '静态'),
            ('公用事业', '静态'),
            ('房地产', '静态'),
            ('原材料', '静态'),
            ('通讯服务', '静态'),
            ('半导体', '静态')
            ON CONFLICT (name) DO NOTHING;
        `);
        
        console.log('✅ 标签数据插入成功');
        
        console.log('✅ 标签表结构创建成功');
        
        // 简单测试：检查表是否创建成功
        const tablesResult = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'tags'
        `);
        console.log('创建的表:', tablesResult.rows);
        
        console.log('✅ 标签表初始化完成');
        
        // 检查结果
        const tagsCount = await client.query('SELECT COUNT(*) as count FROM tags');
        
        response.status(200).json({
            success: true,
            message: '标签系统初始化成功',
            data: {
                tagsCount: parseInt(tagsCount.rows[0].count)
            }
        });
        
    } catch (error) {
        console.error('初始化标签表失败:', error);
        response.status(500).json({ 
            success: false,
            error: '初始化标签表失败', 
            details: error.message 
        });
    } finally {
        if (client) client.release();
        await pool.end();
    }
}