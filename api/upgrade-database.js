// /api/upgrade-database.js
// 数据库升级API：在线执行升级脚本，添加缓存字段
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
    // 安全校验
    const authHeader = req.headers['authorization'];
    const expectedAuth = `Bearer ${process.env.UPDATE_API_SECRET}`;
    
    if (!process.env.UPDATE_API_SECRET || authHeader !== expectedAuth) {
        console.warn('Unauthorized database upgrade attempt:', authHeader);
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        console.log("🚀 开始数据库升级...");
        
        // 开始事务
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // 1. 添加缓存字段
            console.log("添加缓存字段...");
            await client.query(`
                ALTER TABLE stocks 
                ADD COLUMN IF NOT EXISTS last_price DECIMAL(10,2),
                ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2),
                ADD COLUMN IF NOT EXISTS change_percent DECIMAL(5,2),
                ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            `);
            
            // 2. 创建索引
            console.log("创建性能索引...");
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_stocks_last_updated ON stocks(last_updated);
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_stocks_change_percent ON stocks(change_percent);
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_stocks_market_cap_price ON stocks(market_cap, last_price);
            `);
            
            // 3. 添加字段注释
            console.log("添加字段注释...");
            await client.query(`
                COMMENT ON COLUMN stocks.last_price IS '最新股价';
            `);
            await client.query(`
                COMMENT ON COLUMN stocks.change_amount IS '涨跌金额';
            `);
            await client.query(`
                COMMENT ON COLUMN stocks.change_percent IS '涨跌幅百分比';
            `);
            await client.query(`
                COMMENT ON COLUMN stocks.last_updated IS '数据最后更新时间';
            `);
            
            // 4. 验证升级结果
            const verifyResult = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'stocks' 
                AND column_name IN ('last_price', 'change_amount', 'change_percent', 'last_updated')
                ORDER BY column_name;
            `);
            
            await client.query('COMMIT');
            
            console.log("✅ 数据库升级完成!");
            
            res.status(200).json({
                success: true,
                message: "数据库升级成功完成",
                addedFields: verifyResult.rows,
                timestamp: new Date().toISOString(),
                nextStep: "现在可以调用 /api/update-stocks 初始化缓存数据"
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error("❌ 数据库升级失败:", error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            message: "数据库升级失败，请检查日志"
        });
    }
}