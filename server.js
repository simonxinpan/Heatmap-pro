import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import stocksHandler from './api/stocks.js';
import testEnvHandler from './api/test-env.js';
import authHandler from './api/auth.js';

// 加载环境变量
dotenv.config();

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = process.env.PORT || 8000;

// 认证配置
const AUTH_SECRET = process.env.AUTH_SECRET || 'heatmap-dashboard-secret-2024';
const API_KEY = process.env.API_KEY || 'heatmap-api-key-secure';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';
const CORS_ENABLED = process.env.CORS_ENABLED === 'true' || true;

// 简单的认证中间件
function authenticateRequest(req, res) {
    // 对于开发环境，跳过认证
    if (process.env.NODE_ENV === 'development') {
        return true;
    }
    
    // 检查API密钥
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (apiKey && (apiKey === API_KEY || apiKey === `Bearer ${API_KEY}`)) {
        return true;
    }
    
    // 检查会话令牌
    const sessionToken = req.headers['x-session-token'];
    if (sessionToken) {
        try {
            const expectedToken = crypto.createHmac('sha256', AUTH_SECRET)
                .update('heatmap-session')
                .digest('hex');
            if (sessionToken === expectedToken) {
                return true;
            }
        } catch (error) {
            console.error('Token validation error:', error);
        }
    }
    
    return false;
}

// CORS配置函数
function setCORSHeaders(res, origin = '*') {
    if (!CORS_ENABLED) return;
    
    const allowedOrigins = ALLOWED_ORIGINS === '*' ? '*' : ALLOWED_ORIGINS.split(',');
    const allowOrigin = allowedOrigins === '*' || allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Session-Token, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // 安全头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
}

// 生成访问令牌
function generateAccessToken() {
    const payload = {
        timestamp: Date.now(),
        random: crypto.randomBytes(16).toString('hex')
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // 处理API请求
    if (pathname.startsWith('/api/')) {
        try {
            // 设置CORS头
            const origin = req.headers.origin || req.headers.referer || '*';
            setCORSHeaders(res, origin);
            
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            
            // 认证检查（仅对生产环境）
            if (process.env.NODE_ENV === 'production' && !authenticateRequest(req, res)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Unauthorized', 
                    message: 'Valid API key or session token required',
                    hint: 'Add X-API-Key header or X-Session-Token header'
                }));
                return;
            }
            
            // 处理股票API请求
            if (pathname === '/api/stocks') {
                await stocksHandler(req, res);
                return;
            }
            
            // 处理测试环境API请求
            if (pathname === '/api/test-env') {
                console.log('Handling test-env API request');
                await testEnvHandler(req, res);
                return;
            }
            
            // 处理认证API请求
            if (pathname.startsWith('/api/auth')) {
                console.log('Handling auth API request:', pathname);
                await authHandler(req, res);
                return;
            }
            
            // API路由不存在
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
            return;
        } catch (error) {
            console.error('API Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
            return;
        }
    }
    
    // 根路径重定向到index.html
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // 构建文件路径
    const filePath = path.join(__dirname, pathname);
    
    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // 文件不存在，返回404
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
            return;
        }
        
        // 获取文件扩展名
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        // 读取并返回文件
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 Internal Server Error</h1>');
                return;
            }
            
            // 为静态文件添加CORS头，支持iframe嵌入
            const origin = req.headers.origin || req.headers.referer || '*';
            const headers = {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Allow-Credentials': 'true',
                'X-Frame-Options': 'ALLOWALL',
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'public, max-age=3600',
                'Vary': 'Origin'
            };
            
            res.writeHead(200, headers);
            res.end(data);
        });
    });
});

server.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log('按 Ctrl+C 停止服务器');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});