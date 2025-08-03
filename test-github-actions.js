// GitHub Actions 功能测试脚本
// 用于验证自动数据更新功能是否正常工作

import https from 'https';

// 测试配置
const TEST_CONFIG = {
    baseUrl: 'https://heatmap-pro.vercel.app',
    endpoints: [
        '/api/stocks',
        '/api/refresh-data',
        '/api/stocks?refresh=true'
    ],
    timeout: 10000
};

// 发送HTTP请求的辅助函数
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const req = https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        url,
                        status: res.statusCode,
                        duration: `${duration}ms`,
                        data: jsonData,
                        success: res.statusCode >= 200 && res.statusCode < 300
                    });
                } catch (error) {
                    resolve({
                        url,
                        status: res.statusCode,
                        duration: `${duration}ms`,
                        data: data.substring(0, 200) + (data.length > 200 ? '...' : ''),
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        parseError: error.message
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject({
                url,
                error: error.message,
                success: false
            });
        });
        
        req.setTimeout(TEST_CONFIG.timeout, () => {
            req.destroy();
            reject({
                url,
                error: 'Request timeout',
                success: false
            });
        });
    });
}

// 测试所有API端点
async function testAllEndpoints() {
    console.log('🚀 开始测试 GitHub Actions 相关 API 端点...');
    console.log('=' .repeat(60));
    
    const results = [];
    
    for (const endpoint of TEST_CONFIG.endpoints) {
        const url = TEST_CONFIG.baseUrl + endpoint;
        console.log(`\n🔍 测试: ${endpoint}`);
        
        try {
            const result = await makeRequest(url);
            results.push(result);
            
            if (result.success) {
                console.log(`✅ 成功 - 状态: ${result.status}, 耗时: ${result.duration}`);
                
                // 显示关键数据信息
                if (endpoint === '/api/stocks' && result.data && Array.isArray(result.data)) {
                    console.log(`📊 返回 ${result.data.length} 只股票数据`);
                    if (result.data.length > 0) {
                        const sample = result.data[0];
                        console.log(`📈 示例: ${sample.symbol || sample.name || 'N/A'} - $${sample.price || sample.current_price || 'N/A'}`);
                    }
                } else if (endpoint === '/api/refresh-data' && result.data) {
                    if (result.data.statistics) {
                        console.log(`📈 更新统计: 成功 ${result.data.statistics.success}/${result.data.statistics.total}`);
                        console.log(`⚡ 成功率: ${result.data.statistics.successRate}`);
                    }
                }
            } else {
                console.log(`❌ 失败 - 状态: ${result.status}`);
                if (result.parseError) {
                    console.log(`🔧 解析错误: ${result.parseError}`);
                }
            }
        } catch (error) {
            results.push(error);
            console.log(`❌ 请求失败: ${error.error}`);
        }
        
        // 请求间延迟，避免过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 生成测试报告
    console.log('\n' + '=' .repeat(60));
    console.log('📋 测试报告');
    console.log('=' .repeat(60));
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`\n🎯 总体结果: ${successCount}/${totalCount} 个端点测试通过`);
    console.log(`📊 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    if (successCount === totalCount) {
        console.log('\n🎉 所有测试通过！GitHub Actions 配置正确。');
        console.log('\n📝 下一步操作:');
        console.log('   1. 推送代码到 GitHub 仓库');
        console.log('   2. 在 GitHub 仓库设置中配置 Secrets:');
        console.log('      - DATABASE_URL (Neon 数据库连接字符串)');
        console.log('      - FINNHUB_API_KEY (Finnhub API 密钥)');
        console.log('   3. 在 Actions 页面查看工作流执行状态');
        console.log('   4. 验证热力图数据是否每5分钟自动更新');
    } else {
        console.log('\n⚠️  部分测试失败，请检查:');
        console.log('   1. Vercel 部署状态');
        console.log('   2. API 端点是否正确部署');
        console.log('   3. 环境变量配置');
    }
    
    console.log('\n🔗 相关链接:');
    console.log(`   • 热力图页面: ${TEST_CONFIG.baseUrl}`);
    console.log(`   • GitHub Actions 配置: .github/workflows/update_heatmap.yml`);
    console.log(`   • 配置文档: GITHUB_ACTIONS_SETUP.md`);
    
    return {
        success: successCount === totalCount,
        results,
        statistics: {
            total: totalCount,
            success: successCount,
            failed: totalCount - successCount,
            successRate: `${((successCount / totalCount) * 100).toFixed(1)}%`
        }
    };
}

// 主函数
async function main() {
    try {
        const testResults = await testAllEndpoints();
        
        if (testResults.success) {
            process.exit(0);
        } else {
            console.log('\n❌ 测试未完全通过，请查看上述错误信息');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n💥 测试过程中发生错误:', error);
        process.exit(1);
    }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { testAllEndpoints, makeRequest };