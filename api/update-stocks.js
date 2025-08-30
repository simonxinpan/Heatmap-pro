// /api/update-stocks.js - 用于GitHub Actions自动更新股票数据
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(request, response) {
    // 验证请求方法
    if (request.method !== 'POST') {
        response.writeHead(405, { 'Content-Type': 'application/json' });
        return response.end(JSON.stringify({ error: 'Method not allowed' }));
    }

    // 验证授权（可选，如果设置了CRON_SECRET）
    const authHeader = request.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        response.writeHead(401, { 'Content-Type': 'application/json' });
        return response.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    try {
        console.log('🚀 Starting automated stock data update...');
        
        // 检查必要的环境变量
        const { NEON_DATABASE_URL, POLYGON_API_KEY, FINNHUB_API_KEY } = process.env;
        
        if (!NEON_DATABASE_URL || !POLYGON_API_KEY || !FINNHUB_API_KEY) {
            throw new Error('Missing required environment variables');
        }

        // 执行数据更新脚本
        const { stdout, stderr } = await execAsync('node _scripts/update-database.js', {
            env: {
                ...process.env,
                NEON_DATABASE_URL,
                POLYGON_API_KEY,
                FINNHUB_API_KEY
            },
            timeout: 300000 // 5分钟超时
        });

        console.log('✅ Stock data update completed successfully');
        console.log('Script output:', stdout);
        
        if (stderr) {
            console.warn('Script warnings:', stderr);
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
            success: true,
            message: 'Stock data updated successfully',
            timestamp: new Date().toISOString(),
            output: stdout
        }));

    } catch (error) {
        console.error('❌ Stock data update failed:', error);
        
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
            success: false,
            error: 'Stock data update failed',
            message: error.message,
            timestamp: new Date().toISOString()
        }));
    }
}