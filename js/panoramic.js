// public/js/panoramic.js (最终静态图片版)

document.addEventListener('DOMContentLoaded', async () => {
    const gridContainer = document.getElementById('dashboard-grid');
    if (!gridContainer) {
        console.error('错误：在HTML中未找到仪表盘容器 #dashboard-grid');
        return;
    }

    gridContainer.innerHTML = '<p class="loading-message">正在加载行业仪表盘...</p>';

    try {
        // --- 1. 获取所有行业的聚合数据 ---
        // 这个 API 只返回文字统计信息，加载速度非常快
        const dashboardResponse = await fetch('/api/sector-dashboard');
        if (!dashboardResponse.ok) {
            throw new Error(`API 请求失败，状态码: ${dashboardResponse.status}`);
        }
        const dashboardResult = await dashboardResponse.json();

        if (!dashboardResult.success || !Array.isArray(dashboardResult.data)) {
            throw new Error('API 返回的数据格式不正确');
        }
        
        const sectors = dashboardResult.data;
        gridContainer.innerHTML = ''; // 清空加载提示

        // --- 2. 创建一个从行业中文名到【静态图片】文件名的映射 ---
        // 确保这些文件名与你 `public/images/heatmap-previews/` 目录下的文件名完全一致
        const sectorImageMap = {
            '信息技术': '信息技术.png',
            '工业': '工业.png',
            '金融': '金融.png',
            '医疗保健': '医疗保健.png',
            '非必需消费品': '非必需消费品.png',
            '日常消费品': '日常消费品.png',
            '公用事业': '公用事业.png',
            '房地产': '房地产.png',
            '原材料': '原材料.png',
            '能源': '能源.png',
            '半导体': '半导体.png',
            '媒体娱乐': '媒体娱乐.png',
            '通讯服务': '通讯服务.png',
            '金融服务': '金融服务.png'
        };

        // --- 3. 循环创建卡片，并直接嵌入 <img> 标签 ---
        sectors.forEach(sector => {
            if (!sector || !sector.sector_zh) return; // 跳过无效数据

            const card = document.createElement('div');
            card.className = 'industry-card';
            
            // 构建指向【全功能、独立】分行业热力图页面的链接
            const detailLink = `/panoramic-heatmap.html?sector=${encodeURIComponent(sector.sector_zh)}`;
            
            // 从映射中获取对应的图片文件名，如果找不到则使用一个默认的占位图
            const previewImageFile = sectorImageMap[sector.sector_zh] || 'default_placeholder.png';

            card.innerHTML = `
                <div class="card-header">
                    <div class="industry-title">
                        <!-- 这里可以加上行业图标，如果需要的话 -->
                        <h3>${sector.sector_zh}</h3>
                    </div>
                    <a href="${detailLink}" class="details-button" title="查看实时交互热力图" target="_blank">🔍</a>
                </div>
                <div class="card-stats">
                    <span class="industry-change ${sector.weighted_avg_change >= 0 ? 'positive' : 'negative'}">
                        ${(sector.weighted_avg_change || 0).toFixed(2)}%
                    </span>
                    <span class="industry-count">${sector.stock_count} 只股票</span>
                </div>

                <div class="mini-heatmap-container">
                    <a href="${detailLink}" target="_blank">
                        <img 
                            src="/images/heatmap-previews/${previewImageFile}" 
                            alt="${sector.sector_zh} 热力图预览" 
                            class="heatmap-preview-image"
                            loading="lazy"> 
                            <!-- loading="lazy" 是一个简单的性能优化，让图片在快要滚动到时再加载 -->
                    </a>
                </div>
                
                <div class="card-footer">
                    <div class="stat-item">
                        <span class="stat-label">总市值</span>
                        <span class="stat-value">${formatLargeNumber(sector.total_market_cap * 1000000, true)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">领涨/跌股</span>
                        <span class="stat-value">${sector.leading_ticker}</span>
                    </div>
                </div>
            `;
            gridContainer.appendChild(card);
        });

    } catch (error) {
        console.error("加载仪表盘失败:", error);
        gridContainer.innerHTML = '<p class="error-message">仪表盘数据加载失败，请刷新重试。</p>';
    }
});


/**
 * 辅助函数：用于格式化大数字为易读的单位 (T, B, M)
 * @param {number | string} value - 原始数值 (单位: 美元)
 * @param {boolean} isCurrency - 是否显示美元符号
 * @returns {string} - 格式化后的字符串
 */
function formatLargeNumber(value, isCurrency = false) {
    if (value === null || value === undefined || isNaN(parseFloat(value))) return 'N/A';
    
    const num = parseFloat(value);
    const prefix = isCurrency ? '$' : '';

    if (Math.abs(num) >= 1e12) {
        return `${prefix}${(num / 1e12).toFixed(2)}T`; // 万亿
    }
    if (Math.abs(num) >= 1e9) {
        return `${prefix}${(num / 1e9).toFixed(2)}B`;  // 十亿
    }
    if (Math.abs(num) >= 1e6) {
        return `${prefix}${(num / 1e6).toFixed(1)}M`;  // 百万
    }
    
    return `${prefix}${num.toLocaleString()}`;
}