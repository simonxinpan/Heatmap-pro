import crypto from 'crypto';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const AUTH_SECRET = process.env.AUTH_SECRET || 'heatmap-dashboard-secret-2024';
const API_KEY = process.env.API_KEY || 'heatmap-api-key-secure';

/**
 * 生成会话令牌
 * @param {string} sessionId - 会话标识符
 * @returns {string} 生成的令牌
 */
export function generateSessionToken(sessionId = 'heatmap-session') {
    return crypto.createHmac('sha256', AUTH_SECRET)
        .update(sessionId)
        .digest('hex');
}

/**
 * 验证会话令牌
 * @param {string} token - 要验证的令牌
 * @param {string} sessionId - 会话标识符
 * @returns {boolean} 验证结果
 */
export function validateSessionToken(token, sessionId = 'heatmap-session') {
    const expectedToken = generateSessionToken(sessionId);
    return token === expectedToken;
}

/**
 * 获取API密钥
 * @returns {string} API密钥
 */
export function getApiKey() {
    return API_KEY;
}

/**
 * 生成认证头
 * @param {string} type - 认证类型 ('api-key' | 'session-token')
 * @returns {object} 认证头对象
 */
export function generateAuthHeaders(type = 'api-key') {
    if (type === 'session-token') {
        return {
            'X-Session-Token': generateSessionToken()
        };
    }
    
    return {
        'X-API-Key': API_KEY
    };
}

/**
 * 命令行工具 - 生成令牌
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('=== Heatmap 认证工具 ===');
    console.log('API Key:', getApiKey());
    console.log('Session Token:', generateSessionToken());
    console.log('\n=== 使用示例 ===');
    console.log('curl -H "X-API-Key: ' + getApiKey() + '" http://localhost:8000/api/stocks');
    console.log('curl -H "X-Session-Token: ' + generateSessionToken() + '" http://localhost:8000/api/stocks');
    console.log('\n=== 环境变量 ===');
    console.log('AUTH_SECRET:', AUTH_SECRET);
    console.log('API_KEY:', API_KEY);
}