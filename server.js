import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import stocksHandler from './api/stocks.js';
import stocksSimpleHandler from './api/stocks-simple.js';
import testEnvHandler from './api/test-env.js';

// 加载环境变量
dotenv.config();

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = process.env.PORT || 8000;

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
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            
            // 处理股票API请求
            if (pathname === '/api/stocks') {
                await stocksHandler(req, res);
                return;
            }
            
            // 处理简化股票API请求
            if (pathname === '/api/stocks-simple') {
                await stocksSimpleHandler(req, res);
                return;
            }
            
            // 处理测试环境API请求
            if (pathname === '/api/test-env') {
                console.log('Handling test-env API request');
                await testEnvHandler(req, res);
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
            
            res.writeHead(200, { 'Content-Type': contentType });
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