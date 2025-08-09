// /api/upgrade-database-cache.js
// 数据库升级脚本 - 为缓存功能优化stocks表结构
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const client = await pool.connect();
        
        console.log('🔧 开始数据库升级...');
        
        // 1. 检查并添加缺失的列
        const upgrades = [
            {
                name: 'current_price',
                sql: 'ALTER TABLE stocks ADD COLUMN IF NOT EXISTS current_price DECIMAL(10,2);',
                description: '添加当前价格字段'
            },
            {
                name: 'change_amount', 
                sql: 'ALTER TABLE stocks ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2);',
                description: '添加涨跌额字段'
            },
            {
                name: 'last_updated',
                sql: 'ALTER TABLE stocks ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;',
                description: '添加最后更新时间字段'
            },
            {
                name: 'volume',
                sql: 'ALTER TABLE stocks ADD COLUMN IF NOT EXISTS volume BIGINT;',
                description: '添加成交量字段'
            },
            {
                name: 'high_price',
                sql: 'ALTER TABLE stocks ADD COLUMN IF NOT EXISTS high_price DECIMAL(10,2);',
                description: '添加最高价字段'
            },
            {
                name: 'low_price',
                sql: 'ALTER TABLE stocks ADD COLUMN IF NOT EXISTS low_price DECIMAL(10,2);',
                description: '添加最低价字段'
            },
            {
                name: 'open_price',
                sql: 'ALTER TABLE stocks ADD COLUMN IF NOT EXISTS open_price DECIMAL(10,2);',
                description: '添加开盘价字段'
            }
        ];
        
        const results = [];
        
        for (const upgrade of upgrades) {
            try {
                await client.query(upgrade.sql);
                console.log(`✅ ${upgrade.description}`);
                results.push({ name: upgrade.name, status: 'success', description: upgrade.description });
            } catch (error) {
                console.log(`⚠️ ${upgrade.description} - ${error.message}`);
                results.push({ name: upgrade.name, status: 'skipped', description: upgrade.description, error: error.message });
            }
        }
        
        // 2. 创建或更新索引
        const indexes = [
            {
                name: 'idx_stocks_last_updated',
                sql: 'CREATE INDEX IF NOT EXISTS idx_stocks_last_updated ON stocks(last_updated DESC);',
                description: '创建last_updated索引'
            },
            {
                name: 'idx_stocks_ticker_updated',
                sql: 'CREATE INDEX IF NOT EXISTS idx_stocks_ticker_updated ON stocks(ticker, last_updated);',
                description: '创建复合索引(ticker, last_updated)'
            }
        ];
        
        for (const index of indexes) {
            try {
                await client.query(index.sql);
                console.log(`✅ ${index.description}`);
                results.push({ name: index.name, status: 'success', description: index.description });
            } catch (error) {
                console.log(`⚠️ ${index.description} - ${error.message}`);
                results.push({ name: index.name, status: 'error', description: index.description, error: error.message });
            }
        }
        
        // 3. 检查表结构
        const tableInfo = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'stocks' 
            ORDER BY ordinal_position;
        `);
        
        // 4. 统计当前数据
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total_stocks,
                COUNT(current_price) as stocks_with_price,
                COUNT(last_updated) as stocks_with_update_time,
                MAX(last_updated) as latest_update,
                MIN(last_updated) as earliest_update
            FROM stocks;
        `);
        
        client.release();
        
        console.log('🎉 数据库升级完成!');
        
        response.status(200).json({
            success: true,
            message: '数据库升级完成',
            upgrades: results,
            tableStructure: tableInfo.rows,
            statistics: stats.rows[0],
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ 数据库升级失败:', error);
        response.status(500).json({ 
            success: false,
            error: '数据库升级失败', 
            details: error.message 
        });
    }
}