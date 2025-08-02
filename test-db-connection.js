// 数据库连接测试脚本
import { Pool } from 'pg';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

console.log('🔍 开始测试数据库连接...');
console.log('📍 数据库URL:', process.env.DATABASE_URL ? '已配置' : '未配置');

// 数据库连接配置
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testConnection() {
    try {
        console.log('\n🔗 正在连接数据库...');
        
        // 测试基本连接
        const client = await pool.connect();
        console.log('✅ 数据库连接成功！');
        
        // 测试查询
        console.log('\n📊 测试查询数据库...');
        const result = await client.query('SELECT NOW() as current_time');
        console.log('⏰ 数据库时间:', result.rows[0].current_time);
        
        // 检查stocks表是否存在
        console.log('\n🔍 检查stocks表...');
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'stocks'
            );
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('✅ stocks表存在');
            
            // 查询股票数据
            const stocksResult = await client.query(`
                SELECT ticker, name_zh, sector_zh, market_cap 
                FROM stocks 
                ORDER BY market_cap DESC 
                LIMIT 10
            `);
            
            console.log('\n📈 前10只股票数据:');
            stocksResult.rows.forEach((stock, index) => {
                console.log(`${index + 1}. ${stock.ticker} - ${stock.name_zh} (${stock.sector_zh}) - 市值: ${(stock.market_cap / 1000000000).toFixed(1)}B`);
            });
        } else {
            console.log('❌ stocks表不存在，需要运行数据库初始化脚本');
            console.log('💡 请在Neon控制台执行 database-setup.sql 文件中的SQL语句');
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        
        if (error.message.includes('password authentication failed')) {
            console.log('\n💡 解决方案:');
            console.log('1. 检查 .env 文件中的 DATABASE_URL 是否正确');
            console.log('2. 确认Neon数据库密码是否正确');
            console.log('3. 检查数据库连接字符串格式');
        } else if (error.message.includes('does not exist')) {
            console.log('\n💡 解决方案:');
            console.log('1. 确认数据库名称是否正确');
            console.log('2. 检查Neon项目是否已创建');
        } else {
            console.log('\n💡 请检查:');
            console.log('1. 网络连接是否正常');
            console.log('2. Neon数据库是否正在运行');
            console.log('3. 环境变量配置是否正确');
        }
    } finally {
        await pool.end();
        console.log('\n🔚 数据库连接测试完成');
    }
}

// 运行测试
testConnection();