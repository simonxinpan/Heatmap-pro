// /api/check-db-structure.js
// 临时API：检查数据库表结构，确认是否需要执行升级脚本
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
    // 简单的安全检查（可选）
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader !== `Bearer ${process.env.UPDATE_API_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        console.log("检查数据库表结构...");
        
        // 查询stocks表的列信息
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'stocks' 
            ORDER BY ordinal_position;
        `);
        
        const columns = result.rows;
        console.log(`stocks表包含 ${columns.length} 个字段:`, columns);
        
        // 检查是否存在缓存字段
        const cacheFields = ['last_price', 'change_amount', 'change_percent', 'last_updated'];
        const existingCacheFields = columns.filter(col => cacheFields.includes(col.column_name));
        
        const needsUpgrade = existingCacheFields.length < cacheFields.length;
        
        // 如果需要升级，显示缺失的字段
        const missingFields = cacheFields.filter(field => 
            !columns.some(col => col.column_name === field)
        );
        
        res.status(200).json({
            success: true,
            tableExists: columns.length > 0,
            totalColumns: columns.length,
            columns: columns,
            cacheFieldsStatus: {
                existing: existingCacheFields.map(f => f.column_name),
                missing: missingFields,
                needsUpgrade: needsUpgrade
            },
            upgradeRequired: needsUpgrade,
            message: needsUpgrade ? 
                `需要执行数据库升级脚本，缺失字段: ${missingFields.join(', ')}` :
                "数据库表结构完整，无需升级"
        });
        
    } catch (error) {
        console.error("检查数据库表结构失败:", error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            message: "无法连接到数据库或查询表结构"
        });
    }
}