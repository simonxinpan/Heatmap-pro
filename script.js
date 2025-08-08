// script.js - 自定义SVG热力图实现
document.addEventListener('DOMContentLoaded', main);

async function main() {
    console.log('🚀 数据自动刷新已启动（每5分钟）');
    await loadAndRenderHeatmap();
    setInterval(() => {
        console.log('🔄 自动刷新股票数据...');
        loadAndRenderHeatmap(false);
    }, 300000); // 5分钟刷新
}

async function loadAndRenderHeatmap(isInitialLoad = true) {
    try {
        console.log('📊 开始获取股票数据...');
        const response = await fetch('/api/stocks');
        
        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }
        
        const stocks = await response.json();
        console.log(`✅ 成功获取 ${stocks.length} 只股票数据`);
        
        // 更新时间戳
        const timestamp = document.getElementById('last-updated');
        if (timestamp) {
            timestamp.textContent = `最后更新: ${new Date().toLocaleTimeString()}`;
        }
        
        // 渲染热力图
        renderHeatmap(stocks);
        
    } catch (error) {
        console.error('❌ 获取股票数据失败:', error);
        // 使用模拟数据作为回退
        const mockData = generateMockData();
        console.log('🔄 使用模拟数据进行演示');
        renderHeatmap(mockData);
    }
}

function generateMockData() {
    const sectors = ['科技', '金融', '医疗健康', '消费', '工业', '能源', '材料', '公用事业', '房地产', '通信'];
    const mockStocks = [];
    
    for (let i = 0; i < 502; i++) {
        const changePercent = (Math.random() - 0.5) * 10; // -5% 到 +5%
        mockStocks.push({
            ticker: `STOCK${i.toString().padStart(3, '0')}`,
            name_zh: `股票${i + 1}`,
            sector_zh: sectors[i % sectors.length],
            market_cap: Math.random() * 1000000000000,
            quote: {
                dp: changePercent,
                c: 100 + Math.random() * 400
            }
        });
    }
    
    return mockStocks;
}

function renderHeatmap(stocks) {
    console.log('🎨 开始渲染热力图...');
    
    const container = document.getElementById('app-container');
    if (!container) {
        console.error('❌ 找不到容器元素 #app-container');
        return;
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建标题
    const title = document.createElement('h1');
    title.textContent = `股票热力图 (${stocks.length}只股票)`;
    title.style.cssText = 'text-align: center; color: white; margin: 20px 0;';
    container.appendChild(title);
    
    // 创建SVG容器
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '600');
    svg.setAttribute('viewBox', '0 0 1200 600');
    svg.style.cssText = 'background: #1a1a1a; border-radius: 8px;';
    
    // 计算网格布局
    const cols = Math.ceil(Math.sqrt(stocks.length * 2)); // 宽高比约2:1
    const rows = Math.ceil(stocks.length / cols);
    const cellWidth = 1200 / cols;
    const cellHeight = 600 / rows;
    
    console.log(`📐 网格布局: ${cols}列 x ${rows}行, 单元格: ${cellWidth.toFixed(1)} x ${cellHeight.toFixed(1)}`);
    
    // 渲染每只股票
    stocks.forEach((stock, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = col * cellWidth;
        const y = row * cellHeight;
        
        const changePercent = stock.quote?.dp || 0;
        const color = getStockColor(changePercent);
        
        // 创建矩形
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x + 1);
        rect.setAttribute('y', y + 1);
        rect.setAttribute('width', cellWidth - 2);
        rect.setAttribute('height', cellHeight - 2);
        rect.setAttribute('fill', color);
        rect.setAttribute('stroke', '#333');
        rect.setAttribute('stroke-width', '0.5');
        rect.style.cursor = 'pointer';
        
        // 添加点击事件
        rect.addEventListener('click', () => {
            window.open(`https://stock-details-final.vercel.app/?symbol=${stock.ticker}`, '_blank');
        });
        
        // 添加悬停效果
        rect.addEventListener('mouseenter', (e) => {
            showTooltip(e, stock);
            rect.setAttribute('stroke', '#fff');
            rect.setAttribute('stroke-width', '2');
        });
        
        rect.addEventListener('mouseleave', () => {
            hideTooltip();
            rect.setAttribute('stroke', '#333');
            rect.setAttribute('stroke-width', '0.5');
        });
        
        svg.appendChild(rect);
        
        // 添加股票代码文本（如果单元格足够大）
        if (cellWidth > 40 && cellHeight > 20) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + cellWidth / 2);
            text.setAttribute('y', y + cellHeight / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', Math.min(cellWidth / 6, cellHeight / 3, 10));
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.setAttribute('font-weight', 'bold');
            text.textContent = stock.ticker;
            text.style.pointerEvents = 'none';
            svg.appendChild(text);
        }
    });
    
    container.appendChild(svg);
    
    // 创建图例
    createLegend(container);
    
    console.log(`✅ 热力图渲染完成，显示 ${stocks.length} 只股票`);
}

function getStockColor(changePercent) {
    if (changePercent > 0) {
        // 红色系（上涨）
        const intensity = Math.min(Math.abs(changePercent) / 5, 1); // 5%为最大强度
        return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`; // 红色，透明度0.3-1.0
    } else if (changePercent < 0) {
        // 绿色系（下跌）
        const intensity = Math.min(Math.abs(changePercent) / 5, 1);
        return `rgba(34, 197, 94, ${0.3 + intensity * 0.7})`; // 绿色，透明度0.3-1.0
    } else {
        // 灰色（无变化）
        return 'rgba(107, 114, 128, 0.5)';
    }
}

function createLegend(container) {
    const legend = document.createElement('div');
    legend.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 20px;
        gap: 20px;
        color: white;
        font-family: Arial, sans-serif;
    `;
    
    const legendItems = [
        { color: 'rgba(34, 197, 94, 0.8)', label: '下跌 > -2%' },
        { color: 'rgba(34, 197, 94, 0.5)', label: '下跌 -2% ~ 0%' },
        { color: 'rgba(107, 114, 128, 0.5)', label: '无变化' },
        { color: 'rgba(239, 68, 68, 0.5)', label: '上涨 0% ~ +2%' },
        { color: 'rgba(239, 68, 68, 0.8)', label: '上涨 > +2%' }
    ];
    
    legendItems.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        
        const colorBox = document.createElement('div');
        colorBox.style.cssText = `
            width: 20px;
            height: 20px;
            background-color: ${item.color};
            border: 1px solid #333;
            border-radius: 3px;
        `;
        
        const label = document.createElement('span');
        label.textContent = item.label;
        label.style.fontSize = '14px';
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
        legend.appendChild(legendItem);
    });
    
    container.appendChild(legend);
}

function showTooltip(event, stock) {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;
    
    const changePercent = stock.quote?.dp || 0;
    const currentPrice = stock.quote?.c || 0;
    
    tooltip.innerHTML = `
        <strong>${stock.name_zh || stock.ticker}</strong><br>
        代码: ${stock.ticker}<br>
        行业: ${stock.sector_zh || 'N/A'}<br>
        当前价格: $${currentPrice.toFixed(2)}<br>
        涨跌幅: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%
    `;
    
    tooltip.style.display = 'block';
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY + 10) + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}