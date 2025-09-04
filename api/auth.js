import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// 认证配置
const AUTH_CONFIG = {
    apiKey: process.env.API_KEY || 'heatmap-api-key-secure',
    authSecret: process.env.AUTH_SECRET || 'heatmap-dashboard-secret-2024',
    jwtSecret: process.env.JWT_SECRET || 'heatmap-jwt-secret-key-2024',
    tokenExpiry: 24 * 60 * 60 * 1000 // 24小时
};

// 生成访问令牌
function generateAccessToken(domain = 'localhost') {
    const payload = {
        domain,
        timestamp: Date.now(),
        expires: Date.now() + AUTH_CONFIG.tokenExpiry,
        random: crypto.randomBytes(16).toString('hex')
    };
    
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
        .createHmac('sha256', AUTH_CONFIG.jwtSecret)
        .update(token)
        .digest('hex');
    
    return `${token}.${signature}`;
}

// 验证访问令牌
function verifyAccessToken(token) {
    try {
        if (!token || !token.includes('.')) {
            return { valid: false, error: 'Invalid token format' };
        }
        
        const [tokenPart, signature] = token.split('.');
        
        // 验证签名
        const expectedSignature = crypto
            .createHmac('sha256', AUTH_CONFIG.jwtSecret)
            .update(tokenPart)
            .digest('hex');
        
        if (signature !== expectedSignature) {
            return { valid: false, error: 'Invalid token signature' };
        }
        
        // 解析payload
        const payload = JSON.parse(Buffer.from(tokenPart, 'base64').toString());
        
        // 检查过期时间
        if (Date.now() > payload.expires) {
            return { valid: false, error: 'Token expired' };
        }
        
        return { valid: true, payload };
    } catch (error) {
        return { valid: false, error: 'Token parsing failed' };
    }
}

// 认证API处理器
export default async function authHandler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    try {
        // 生成访问令牌
        if (pathname === '/api/auth/token' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const { apiKey, domain } = JSON.parse(body || '{}');
                    
                    // 验证API密钥
                    if (apiKey !== AUTH_CONFIG.apiKey) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            error: 'Invalid API key',
                            timestamp: new Date().toISOString()
                        }));
                        return;
                    }
                    
                    const token = generateAccessToken(domain);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        token,
                        expires: new Date(Date.now() + AUTH_CONFIG.tokenExpiry).toISOString(),
                        domain: domain || 'localhost'
                    }));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid request body' }));
                }
            });
            return;
        }
        
        // 验证访问令牌
        if (pathname === '/api/auth/verify' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const { token } = JSON.parse(body || '{}');
                    const result = verifyAccessToken(token);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid request body' }));
                }
            });
            return;
        }
        
        // 获取公开配置信息
        if (pathname === '/api/auth/config' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                corsEnabled: true,
                allowedOrigins: ['*'],
                authRequired: false, // 开发环境暂时关闭
                tokenExpiry: AUTH_CONFIG.tokenExpiry,
                serverTime: new Date().toISOString()
            }));
            return;
        }
        
        // 路由不存在
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Auth endpoint not found' }));
        
    } catch (error) {
        console.error('Auth API Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Internal server error',
            message: error.message
        }));
    }
}

// 导出认证工具函数
export { generateAccessToken, verifyAccessToken, AUTH_CONFIG };