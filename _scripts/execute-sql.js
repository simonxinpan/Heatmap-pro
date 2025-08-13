// /_scripts/execute-sql.js - 执行SQL文件的脚本
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function executeSqlFile(sqlFilePath) {
    console.log("===== Starting SQL Execution =====");
    
    // 直接从进程环境变量process.env读取密钥
    const { NEON_DATABASE_URL } = process.env;
    
    if (!NEON_DATABASE_URL) {
        console.error("\nFATAL: Missing NEON_DATABASE_URL environment variable.");
        console.error("Hint: This script is designed to run in a secure environment (like GitHub Actions or via Vercel CLI).");
        console.error("For local testing, please use the command: 'vercel env run -- node _scripts/execute-sql.js'\n");
        process.exit(1);
    }
    
    const pool = new Pool({ 
        connectionString: NEON_DATABASE_URL, 
        ssl: { rejectUnauthorized: false } 
    });
    const client = await pool.connect();
    
    try {
        // 读取SQL文件
        const sqlContent = readFileSync(sqlFilePath, 'utf8');
        console.log(`Reading SQL file: ${sqlFilePath}`);
        console.log(`SQL file size: ${sqlContent.length} characters`);
        
        // 分割SQL语句（按分号分割，但要处理字符串中的分号）
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`Found ${statements.length} SQL statements to execute`);
        
        await client.query('BEGIN');
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                console.log(`Executing statement ${i + 1}/${statements.length}...`);
                try {
                    const result = await client.query(statement);
                    if (result.rowCount !== undefined) {
                        console.log(`  ✓ Affected ${result.rowCount} rows`);
                    } else {
                        console.log(`  ✓ Statement executed successfully`);
                    }
                } catch (error) {
                    console.error(`  ✗ Error in statement ${i + 1}:`, error.message);
                    throw error;
                }
            }
        }
        
        await client.query('COMMIT');
        
        console.log("\n===== SQL Execution Summary =====");
        console.log(`Successfully executed ${statements.length} SQL statements`);
        console.log("===== SQL Execution completed successfully. =====");
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("!!!!! SQL Execution FAILED !!!!!", error);
        process.exit(1);
    } finally {
        if (client) client.release();
        if (pool) pool.end();
    }
}

// 获取命令行参数中的SQL文件路径，默认为insert_sp500_final.sql
const sqlFileName = process.argv[2] || 'insert_sp500_final.sql';
const sqlFilePath = join(__dirname, sqlFileName);

executeSqlFile(sqlFilePath);