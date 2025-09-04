/**
 * 独立的热力图浏览器脚本
 * 职责：URL参数解析、数据获取、热力图渲染
 * 支持embed=true瘦身模式
 */

// embed=true 瘦身逻辑 - 隐藏页头页脚
function handleEmbedMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const isEmbed = urlParams.get('embed') === 'true';
    
    if (isEmbed) {
        // 隐藏页头页脚元素
        const elementsToHide = [
            'header', 'nav', 'footer', '.header', '.nav', '.footer',
            '.page-header', '.page-footer', '.navigation', '.breadcrumb'
        ];
        
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        });
        
        // 调整body样式以适应嵌入模式
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden';
        
        // 调整热力图容器样式
        const container = document.getElementById('heatmap-container');
        if (container) {
            container.style.height = '100vh';
            container.style.width = '100vw';
        }
    }
}

// URL参数解析函数
function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        sector: urlParams.get('sector'),
        embed: urlParams.get('embed') === 'true'
    };
}

// 获取股票数据
async function fetchStockData(sector = null) {
    try {
        let apiUrl = '/api/stocks-simple';
        if (sector) {
            apiUrl += `?sector=${encodeURIComponent(sector)}`;
        }
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取股票数据失败:', error);
        throw error;
    }
}

// 渲染热力图
function renderHeatmap(stockData, containerId = 'heatmap-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`找不到容器元素: ${containerId}`);
        return;
    }
    
    try {
        // 清空容器
        container.innerHTML = '';
        
        // 实例化StockHeatmap组件
        const heatmap = new StockHeatmap(container, {
            width: container.clientWidth || 800,
            height: container.clientHeight || 600,
            responsive: true
        });
        
        // 渲染热力图
        heatmap.render(stockData);
        
        console.log('热力图渲染成功');
    } catch (error) {
        console.error('热力图渲染失败:', error);
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
                <div style="text-align: center;">
                    <h3>热力图加载失败</h3>
                    <p>错误信息: ${error.message}</p>
                    <button onclick="location.reload()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">重新加载</button>
                </div>
            </div>
        `;
    }
}

// 显示加载状态
function showLoadingState(containerId = 'heatmap-container') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
                <div style="text-align: center;">
                    <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                    <p>正在加载热力图数据...</p>
                </div>
            </div>
        `;
        
        // 添加旋转动画样式
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// 主初始化函数
async function initHeatmapViewer() {
    try {
        // 处理embed模式
        handleEmbedMode();
        
        // 解析URL参数
        const params = parseUrlParameters();
        console.log('URL参数:', params);
        
        // 显示加载状态
        showLoadingState();
        
        // 获取股票数据
        const stockData = await fetchStockData(params.sector);
        console.log('获取到股票数据:', stockData.length, '条记录');
        
        // 渲染热力图
        renderHeatmap(stockData);
        
        // 更新页面标题
        if (params.sector) {
            document.title = `${params.sector} - 股票热力图`;
        } else {
            document.title = '股票热力图浏览器';
        }
        
    } catch (error) {
        console.error('热力图浏览器初始化失败:', error);
        const container = document.getElementById('heatmap-container');
        if (container) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
                    <div style="text-align: center;">
                        <h3>初始化失败</h3>
                        <p>错误信息: ${error.message}</p>
                        <button onclick="location.reload()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">重新加载</button>
                    </div>
                </div>
            `;
        }
    }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', initHeatmapViewer);

// 窗口大小改变时重新调整热力图
window.addEventListener('resize', () => {
    // 延迟执行以避免频繁调整
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        const container = document.getElementById('heatmap-container');
        if (container && container.children.length > 0) {
            // 重新初始化热力图以适应新尺寸
            initHeatmapViewer();
        }
    }, 300);
});