// 测试环境变量和数据库连接
import { Pool } from 'pg';

export default async function handler(request, response) {
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