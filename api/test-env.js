// 测试环境变量和数据库连接
import { Pool } from 'pg';

export default async function handler(request, response) {
    try {
        const { action } = request.query;
        
        // 处理不同的action
        if (action === 'init-sp500') {
            return await initSP500Data(response);
        }
        
        if (action === 'init-tags') {
            return await initTags(response);
        }
        
        if (action === 'check-stocks') {
            return await checkStocks(response);
        }
        
        // 默认：检查环境变量
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

// 初始化SP500数据
async function initSP500Data(response) {
    try {
        const pool = new Pool({
            connectionString: process.env.NEON_DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        });
        
        const client = await pool.connect();
        
        // 清空现有数据
        await client.query('TRUNCATE TABLE stock_tags RESTART IDENTITY');
        await client.query('TRUNCATE TABLE tags RESTART IDENTITY CASCADE');
        await client.query('TRUNCATE TABLE stocks RESTART IDENTITY CASCADE');
        
        // 插入SP500股票数据
        const stocksData = [
            ['AAPL', '苹果公司', '信息技术'],
            ['MSFT', '微软', '信息技术'],
            ['GOOGL', '谷歌A', '信息技术'],
            ['AMZN', '亚马逊', '非必需消费品'],
            ['NVDA', '英伟达', '半导体'],
            ['META', 'Meta Platforms', '信息技术'],
            ['TSLA', '特斯拉', '非必需消费品'],
            ['BRK.B', '伯克希尔哈撒韦B', '金融'],
            ['JPM', '摩根大通', '金融'],
            ['JNJ', '强生', '医疗保健']
        ];
        
        for (const [ticker, name_zh, sector_zh] of stocksData) {
            await client.query(
                'INSERT INTO stocks (ticker, name_zh, sector_zh) VALUES ($1, $2, $3)',
                [ticker, name_zh, sector_zh]
            );
        }
        
        client.release();
        await pool.end();
        
        response.status(200).json({
            success: true,
            message: 'SP500数据初始化成功',
            data: { stocksCount: stocksData.length }
        });
        
    } catch (error) {
        response.status(500).json({
            success: false,
            error: 'SP500数据初始化失败',
            details: error.message
        });
    }
}

// 初始化标签数据
async function initTags(response) {
    try {
        const pool = new Pool({
            connectionString: process.env.NEON_DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        });
        
        const client = await pool.connect();
        
        // 插入标签数据
        const tagsData = [
            ['大盘股', '#FF6B6B', '静态'],
            ['科技股', '#4ECDC4', '静态'],
            ['金融股', '#45B7D1', '静态'],
            ['医疗股', '#96CEB4', '静态'],
            ['消费股', '#FFEAA7', '静态'],
            ['工业股', '#DDA0DD', '静态'],
            ['能源股', '#98D8C8', '静态'],
            ['公用事业', '#F7DC6F', '静态'],
            ['房地产', '#AED6F1', '静态'],
            ['原材料', '#F8C471', '静态']
        ];
        
        for (const [name, color, type] of tagsData) {
            await client.query(
                'INSERT INTO tags (name, color, type) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
                [name, color, type]
            );
        }
        
        client.release();
        await pool.end();
        
        response.status(200).json({
            success: true,
            message: '标签系统初始化成功',
            data: { tagsCount: tagsData.length }
        });
        
    } catch (error) {
        response.status(500).json({
            success: false,
            error: '初始化标签表失败',
            details: error.message
        });
    }
}

// 检查股票数据
async function checkStocks(response) {
    try {
        const pool = new Pool({
            connectionString: process.env.NEON_DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        });
        
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
        
        const envCheck = {
            DATABASE_URL: process.env.DATABASE_URL ? '已配置' : '未配置',
            NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? '已配置' : '未配置',
            POLYGON_API_KEY: process.env.POLYGON_API_KEY ? '已配置' : '未配置',
            FINNHUB_API_KEY: process.env.FINNHUB_API_KEY ? '已配置' : '未配置',
            NODE_ENV: process.env.NODE_ENV || '未设置'
        };
        
        response.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            environment: envCheck,
            database: {
                status: '连接成功',
                tableInfo: {
                    columns: tableResult.rows,
                    rowCount: countResult.rows[0].count
                }
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