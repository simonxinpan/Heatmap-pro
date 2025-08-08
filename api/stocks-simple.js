// 简化版股票数据API - 直接从数据库获取数据，不使用复杂缓存逻辑
import { Pool } from 'pg';

// 尝试多种环境变量配置
function getDatabaseUrl() {
    return process.env.NEON_DATABASE_URL || 
           process.env.DATABASE_URL || 
           process.env.POSTGRES_URL ||
           process.env.POSTGRES_PRISMA_URL;
}

export default async function handler(request, response) {
    try {
        const databaseUrl = getDatabaseUrl();
        
        if (!databaseUrl) {
            console.log('❌ 未找到数据库连接字符串');
            return response.status(500).json({
                success: false,
                error: '数据库连接未配置',
                message: '请在 Vercel 环境变量中配置数据库连接字符串'
            });
        }

        console.log('🔗 尝试连接数据库...');
        
        const pool = new Pool({
            connectionString: databaseUrl,
            ssl: { rejectUnauthorized: false },
        });

        const client = await pool.connect();
        
        // 首先检查表是否存在
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'stocks'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            client.release();
            await pool.end();
            return response.status(500).json({
                success: false,
                error: 'stocks 表不存在',
                message: '请先运行数据库初始化脚本'
            });
        }

        // 获取股票数据 - 使用简单查询
        const result = await client.query(`
            SELECT 
                ticker,
                name_zh,
                market_cap,
                COALESCE(change_percent, 0) as change_percent,
                COALESCE(current_price, 100) as current_price
            FROM stocks 
            WHERE ticker IS NOT NULL 
            ORDER BY market_cap DESC NULLS LAST
            LIMIT 500
        `);
        
        client.release();
        await pool.end();
        
        console.log(`✅ 成功获取 ${result.rows.length} 只股票数据`);
        
        // 转换数据格式
        const stocks = result.rows.map(row => ({
            symbol: row.ticker,
            name: row.name_zh || row.ticker,
            price: parseFloat(row.current_price) || 100,
            change: parseFloat(row.change_percent) || 0,
            marketCap: parseFloat(row.market_cap) || 1000000000
        }));
        
        response.status(200).json({
            success: true,
            data: stocks,
            meta: {
                total: stocks.length,
                source: 'database',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ API错误:', error);
        response.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}