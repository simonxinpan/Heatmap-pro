/**
 * 全景热力图主逻辑文件
 * 负责数据加载、行业筛选和热力图交互功能
 */

// 全局变量
let allStocks = []; // 缓存全市场数据
let heatmapInstance = null; // 热力图实例
let isLoading = false; // 加载状态

// DOM 元素引用
let sectorFilter, heatmapContainer, heatmapTitle;
let totalStocksEl, avgChangeEl, upStocksEl, downStocksEl;

/**
 * 页面初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 获取DOM元素引用
        initializeElements();
        
        // 从URL参数中获取sector筛选条件
        const urlParams = new URLSearchParams(window.location.search);
        const sector = urlParams.get('sector');
        
        // 显示加载状态
        showLoadingState();
        
        // 根据URL参数加载对应数据
        await loadMarketData(false, sector);
        
        // 初始化热力图
        initializeHeatmap();
        
        // 填充行业筛选下拉菜单（如果是全市场视图）
        if (!sector) {
            populateSectorFilter();
        }
        
        // 绑定事件监听器
        bindEventListeners();
        
        // 渲染热力图
        const title = sector ? `${sector} 板块热力图` : '全市场 (S&P 500)';
        renderHeatmap(allStocks, title);
        
        // 更新页面标题
        if (heatmapTitle) {
            heatmapTitle.textContent = title;
        }
        
        console.log(`✅ ${title}初始化完成`);
        
    } catch (error) {
        console.error('❌ 初始化失败:', error);
        showErrorState('数据加载失败，请刷新重试');
    }
});

/**
 * 初始化DOM元素引用
 */
function initializeElements() {
    sectorFilter = document.getElementById('sector-filter');
    heatmapContainer = document.getElementById('heatmap-container');
    heatmapTitle = document.querySelector('.heatmap-title');
    
    // 统计信息元素
    totalStocksEl = document.getElementById('total-stocks');
    avgChangeEl = document.getElementById('avg-change');
    upStocksEl = document.getElementById('up-stocks');
    downStocksEl = document.getElementById('down-stocks');
    
    if (!sectorFilter || !heatmapContainer) {
        throw new Error('关键DOM元素未找到');
    }
}

/**
 * 加载股票数据（支持本地缓存和sector筛选）
 */
async function loadMarketData(forceRefresh = false, sector = null) {
    if (isLoading) return;
    
    isLoading = true;
    
    try {
        const dataType = sector ? `${sector}板块` : '全市场';
        console.log(`🔄 开始加载${dataType}数据...`);
        
        // 构建API URL
        let apiUrl = '/api/stocks-simple';
        if (sector) {
            apiUrl += `?sector=${encodeURIComponent(sector)}`;
        }
        
        // 检查本地缓存（sector特定的缓存key）
        const cacheKey = sector ? `stocks_${sector}` : 'stocks_all';
        if (!forceRefresh) {
            const cachedData = getCachedData(false, cacheKey);
            if (cachedData) {
                allStocks = cachedData.data;
                console.log(`✅ 从本地缓存加载 ${allStocks.length} 只${dataType}股票数据`);
                return;
            }
        }
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=300' // 强制刷新时不使用缓存
            }
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        
        // 处理新的API响应格式
        let stocksData;
        if (responseData.data && Array.isArray(responseData.data)) {
            // 新格式：包含data、timestamp等字段
            stocksData = responseData.data;
            console.log(`📊 数据来源: ${responseData.source}, 时间戳: ${responseData.timestamp}`);
            if (responseData.error) {
                console.warn(`⚠️ API警告: ${responseData.error}`);
            }
            
            // 缓存完整响应数据
            setCachedData(responseData, cacheKey);
        } else if (Array.isArray(responseData)) {
            // 旧格式：直接返回数组
            stocksData = responseData;
            // 为旧格式创建缓存结构
            setCachedData({
                data: stocksData,
                timestamp: new Date().toISOString(),
                source: 'api'
            }, cacheKey);
        } else {
            throw new Error('API返回数据格式错误');
        }
        
        if (!stocksData || stocksData.length === 0) {
            throw new Error('API返回数据为空');
        }
        
        allStocks = stocksData;
        console.log(`✅ 成功加载 ${allStocks.length} 只股票数据`);
        
    } catch (error) {
        console.error('❌ 数据加载失败:', error);
        
        // 尝试使用过期的缓存数据
        const expiredCache = getCachedData(true, cacheKey);
        if (expiredCache) {
            allStocks = expiredCache.data;
            console.log('⚠️ 使用过期缓存数据作为回退');
        } else {
            // 使用模拟数据作为最后回退
            allStocks = generateMockData();
            console.log('⚠️ 使用模拟数据作为回退');
        }
    } finally {
        isLoading = false;
    }
}

/**
 * 初始化热力图实例
 */
function initializeHeatmap() {
    try {
        heatmapInstance = new StockHeatmap('heatmap-container');
        console.log('✅ 热力图实例创建成功');
    } catch (error) {
        console.error('❌ 热力图实例创建失败:', error);
        throw error;
    }
}

/**
 * 填充行业筛选下拉菜单
 */
function populateSectorFilter() {
    if (!allStocks || allStocks.length === 0) {
        console.warn('⚠️ 无股票数据，跳过行业筛选菜单填充');
        return;
    }
    
    try {
        // 获取所有唯一的行业名称
        const sectors = [...new Set(allStocks
            .map(stock => stock.sector_zh)
            .filter(sector => sector && sector.trim() !== '')
        )];
        
        sectors.sort(); // 按字母排序
        
        // 清除现有选项（保留"全市场"选项）
        const defaultOption = sectorFilter.querySelector('option[value="all"]');
        sectorFilter.innerHTML = '';
        sectorFilter.appendChild(defaultOption);
        
        // 添加行业选项
        sectors.forEach(sector => {
            const option = document.createElement('option');
            option.value = sector;
            option.textContent = `${sector} (${getStockCountBySector(sector)}只)`;
            sectorFilter.appendChild(option);
        });
        
        console.log(`✅ 成功填充 ${sectors.length} 个行业选项`);
        
    } catch (error) {
        console.error('❌ 填充行业筛选菜单失败:', error);
    }
}

/**
 * 获取指定行业的股票数量
 */
function getStockCountBySector(sector) {
    return allStocks.filter(stock => stock.sector_zh === sector).length;
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 行业筛选下拉菜单变化事件
    sectorFilter.addEventListener('change', handleSectorChange);
    
    // 刷新按钮事件
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }
    
    // 全屏按钮事件
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', handleFullscreen);
    }
}

/**
 * 处理行业筛选变化
 */
function handleSectorChange() {
    const selectedSector = sectorFilter.value;
    
    try {
        let dataToRender;
        let title;
        
        if (selectedSector === 'all') {
            dataToRender = allStocks;
            title = '全市场 (S&P 500)';
        } else {
            // 筛选指定行业的股票
            dataToRender = allStocks.filter(stock => stock.sector_zh === selectedSector);
            title = `${selectedSector} 板块热力图`;
            
            if (dataToRender.length === 0) {
                showErrorState(`${selectedSector} 行业暂无数据`);
                return;
            }
        }
        
        // 渲染热力图
        renderHeatmap(dataToRender, title);
        
        console.log(`✅ 切换到 ${selectedSector === 'all' ? '全市场' : selectedSector} 视图`);
        
    } catch (error) {
        console.error('❌ 行业切换失败:', error);
        showErrorState('行业切换失败，请重试');
    }
}

/**
 * 渲染热力图
 */
function renderHeatmap(stockData, title) {
    if (!heatmapInstance || !stockData || stockData.length === 0) {
        showErrorState('无数据可显示');
        return;
    }
    
    try {
        // 更新标题
        if (heatmapTitle) {
            heatmapTitle.textContent = `📊 ${title}`;
        }
        
        // 渲染热力图
        heatmapInstance.render(stockData, title);
        
        // 更新统计信息
        updateStatistics(stockData);
        
        console.log(`✅ 成功渲染 ${stockData.length} 只股票的热力图`);
        
    } catch (error) {
        console.error('❌ 热力图渲染失败:', error);
        showErrorState('热力图渲染失败');
    }
}

/**
 * 更新统计信息
 */
function updateStatistics(stockData) {
    if (!stockData || stockData.length === 0) return;
    
    try {
        const totalStocks = stockData.length;
        const upStocks = stockData.filter(stock => (stock.change_percent || 0) > 0).length;
        const downStocks = stockData.filter(stock => (stock.change_percent || 0) < 0).length;
        const avgChange = stockData.reduce((sum, stock) => sum + (stock.change_percent || 0), 0) / totalStocks;
        
        // 更新DOM元素
        if (totalStocksEl) totalStocksEl.textContent = totalStocks;
        if (avgChangeEl) {
            avgChangeEl.textContent = `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
            avgChangeEl.style.color = avgChange >= 0 ? '#28a745' : '#dc3545';
        }
        if (upStocksEl) upStocksEl.textContent = upStocks;
        if (downStocksEl) downStocksEl.textContent = downStocks;
        
    } catch (error) {
        console.error('❌ 统计信息更新失败:', error);
    }
}

/**
 * 处理刷新按钮点击
 */
async function handleRefresh() {
    try {
        showLoadingState();
        
        // 强制重新加载数据（跳过缓存）
        await loadMarketData(true);
        
        // 重新填充行业筛选
        populateSectorFilter();
        
        // 重新渲染当前视图
        const selectedSector = sectorFilter.value;
        handleSectorChange();
        
        console.log('✅ 数据刷新完成');
        
    } catch (error) {
        console.error('❌ 数据刷新失败:', error);
        showErrorState('数据刷新失败，请重试');
    }
}

/**
 * 获取本地缓存数据
 * @param {boolean} allowExpired - 是否允许返回过期数据
 * @param {string} cacheKey - 缓存键名，默认为全市场数据
 * @returns {object|null} 缓存的数据或null
 */
function getCachedData(allowExpired = false, cacheKey = 'heatmap_stocks_data') {
    try {
        const cachedItem = localStorage.getItem(cacheKey);
        
        if (!cachedItem) {
            return null;
        }
        
        const cached = JSON.parse(cachedItem);
        const now = new Date().getTime();
        const cacheTime = new Date(cached.cacheTimestamp).getTime();
        const cacheAge = now - cacheTime;
        
        // 缓存有效期：5分钟（300000毫秒）
        const cacheValidDuration = 5 * 60 * 1000;
        
        if (cacheAge < cacheValidDuration || allowExpired) {
            console.log(`📦 本地缓存${cacheAge > cacheValidDuration ? '(已过期)' : ''}可用，年龄: ${Math.round(cacheAge / 1000)}秒`);
            return cached;
        }
        
        // 缓存过期，清除
        localStorage.removeItem(cacheKey);
        console.log('🗑️ 本地缓存已过期并清除');
        return null;
        
    } catch (error) {
        console.error('❌ 读取本地缓存失败:', error);
        return null;
    }
}

/**
 * 设置本地缓存数据
 * @param {object} data - 要缓存的数据
 * @param {string} cacheKey - 缓存键名，默认为全市场数据
 */
function setCachedData(data, cacheKey = 'heatmap_stocks_data') {
    try {
        const cacheItem = {
            ...data,
            cacheTimestamp: new Date().toISOString()
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
        console.log(`💾 数据已缓存到本地存储，包含 ${data.data ? data.data.length : 0} 只股票`);
        
    } catch (error) {
        console.error('❌ 设置本地缓存失败:', error);
        // 可能是存储空间不足，尝试清理旧缓存
        try {
            localStorage.removeItem('heatmap_stocks_data');
            console.log('🧹 已清理旧缓存数据');
        } catch (cleanupError) {
            console.error('❌ 清理缓存失败:', cleanupError);
        }
    }
}

/**
 * 处理全屏按钮点击
 */
function handleFullscreen() {
    try {
        const heatmapSection = document.getElementById('panoramic-heatmap');
        
        if (!document.fullscreenElement) {
            heatmapSection.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    } catch (error) {
        console.error('❌ 全屏切换失败:', error);
    }
}

/**
 * 显示加载状态
 */
function showLoadingState() {
    if (heatmapContainer) {
        heatmapContainer.innerHTML = `
            <div class="heatmap-placeholder">
                <div class="placeholder-icon">🔄</div>
                <p>正在加载数据...</p>
            </div>
        `;
    }
    
    // 重置统计信息
    if (totalStocksEl) totalStocksEl.textContent = '-';
    if (avgChangeEl) avgChangeEl.textContent = '-';
    if (upStocksEl) upStocksEl.textContent = '-';
    if (downStocksEl) downStocksEl.textContent = '-';
}

/**
 * 显示错误状态
 */
function showErrorState(message) {
    if (heatmapContainer) {
        heatmapContainer.innerHTML = `
            <div class="heatmap-placeholder">
                <div class="placeholder-icon">❌</div>
                <p>${message}</p>
                <button onclick="handleRefresh()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">重新加载</button>
            </div>
        `;
    }
}

/**
 * 生成模拟数据（作为API失败时的回退）
 */
function generateMockData() {
    const sectors = ['科技', '医疗保健', '金融服务', '消费品', '工业', '能源'];
    const mockStocks = [];
    
    for (let i = 0; i < 100; i++) {
        mockStocks.push({
            ticker: `MOCK${i.toString().padStart(3, '0')}`,
            name_zh: `模拟股票${i + 1}`,
            sector_zh: sectors[i % sectors.length],
            market_cap: Math.random() * 1000000000000, // 随机市值
            change_percent: (Math.random() - 0.5) * 10 // -5% 到 +5% 的随机涨跌幅
        });
    }
    
    return mockStocks;
}

/**
 * 全局函数：刷新热力图（供HTML按钮调用）
 */
window.refreshHeatmap = handleRefresh;

/**
 * 全局函数：切换全屏（供HTML按钮调用）
 */
window.toggleFullscreen = handleFullscreen;

// 导出主要函数（如果需要模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadMarketData,
        renderHeatmap,
        updateStatistics
    };
}