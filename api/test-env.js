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
        
        // 创建股票标签关联表
        await client.query(`
            CREATE TABLE IF NOT EXISTS stock_tags (
                id SERIAL PRIMARY KEY,
                ticker VARCHAR(10) NOT NULL,
                tag_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                UNIQUE(ticker, tag_id)
            );
        `);
        
        // 创建索引
        await client.query('CREATE INDEX IF NOT EXISTS idx_stock_tags_ticker ON stock_tags(ticker);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_stock_tags_tag_id ON stock_tags(tag_id);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);');
        
        console.log('✅ 标签表结构创建成功');
        
        // 插入标签数据
        await client.query(`
            INSERT INTO tags (name) VALUES
            ('大盘股'),
            ('科技股'),
            ('金融股'),
            ('医疗股'),
            ('消费股'),
            ('工业股'),
            ('能源股'),
            ('公用事业'),
            ('房地产'),
            ('原材料'),
            ('通讯服务'),
            ('半导体')
            ON CONFLICT (name) DO NOTHING;
        `);
        
        console.log('✅ 标签数据插入成功');
        
        // 为股票分配标签（基于行业分类）
        await client.query(`
            INSERT INTO stock_tags (ticker, tag_id)
            SELECT s.ticker, t.id
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
            ON CONFLICT (ticker, tag_id) DO NOTHING;
        `);
        
        // 为所有股票添加大盘股标签
        await client.query(`
            INSERT INTO stock_tags (ticker, tag_id)
            SELECT s.ticker, t.id
            FROM stocks s
            CROSS JOIN tags t
            WHERE t.name = '大盘股'
            AND NOT EXISTS (
                SELECT 1 FROM stock_tags st 
                WHERE st.ticker = s.ticker AND st.tag_id = t.id
            );
        `);
        
        console.log('✅ 股票标签关联数据插入成功');
        
        // 检查结果
        const tagsCount = await client.query('SELECT COUNT(*) as count FROM tags');
        const stockTagsCount = await client.query('SELECT COUNT(*) as count FROM stock_tags');
        
        response.status(200).json({
            success: true,
            message: '标签系统初始化成功',
            data: {
                tagsCount: parseInt(tagsCount.rows[0].count),
                stockTagsCount: parseInt(stockTagsCount.rows[0].count)
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