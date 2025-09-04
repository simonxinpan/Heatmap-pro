/**
 * 行业热力图仪表盘核心逻辑
 * 基于虚拟镜像映射技术的数据管理和交互处理
 */

class SectorDashboard {
    constructor() {
        this.sectors = [
            { name: '信息技术', code: '信息技术', icon: '💻' },
            { name: '工业', code: '工业', icon: '🏭' },
            { name: '金融', code: '金融', icon: '🏦' },
            { name: '医疗保健', code: '医疗保健', icon: '🏥' },
            { name: '非必需消费品', code: '非必需消费品', icon: '🛍️' },
            { name: '日常消费品', code: '日常消费品', icon: '🛒' },
            { name: '公用事业', code: '公用事业', icon: '⚡' },
            { name: '房地产', code: '房地产', icon: '🏠' },
            { name: '原材料', code: '原材料', icon: '⛏️' },
            { name: '能源', code: '能源', icon: '⛽' },
            { name: '半导体', code: '半导体', icon: '🔌' },
            { name: '媒体娱乐', code: '媒体娱乐', icon: '🎬' },
            { name: '通讯服务', code: '通讯服务', icon: '📡' }
        ];
        
        this.baseUrl = 'http://localhost:8000/heatmap-component/';
        this.loadedSectors = new Set();
        this.errorSectors = new Set();
        this.refreshInterval = null;
        this.performanceMetrics = {
            loadStartTime: Date.now(),
            sectorsLoaded: 0,
            totalLoadTime: 0
        };
        this.authHeaders = this.getAuthHeaders();
        
        this.init();
    }

    /**
     * 获取认证头
     */
    getAuthHeaders() {
        // 开发环境使用API密钥
        const apiKey = 'heatmap-api-key-secure';
        return {
            'X-API-Key': apiKey,
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    /**
     * 为iframe URL添加认证参数
     */
    addAuthToUrl(url) {
        const urlObj = new URL(url);
        urlObj.searchParams.set('auth', 'true');
        urlObj.searchParams.set('apikey', this.authHeaders['X-API-Key']);
        return urlObj.toString();
    }

    /**
     * 初始化仪表盘
     */
    init() {
        this.renderDashboard();
        this.setupEventListeners();
        this.startPerformanceMonitoring();
        this.setupAutoRefresh();
        
        // 记录初始化完成时间
        console.log(`🚀 仪表盘初始化完成，耗时: ${Date.now() - this.performanceMetrics.loadStartTime}ms`);
    }

    /**
     * 渲染仪表盘主体
     */
    renderDashboard() {
        const sectorsGrid = document.getElementById('sectorsGrid');
        if (!sectorsGrid) {
            console.error('❌ 找不到sectorsGrid容器');
            return;
        }
        
        sectorsGrid.innerHTML = this.sectors.map((sector, index) => 
            this.createSectorCard(sector, index)
        ).join('');
        
        this.setupSectorEventListeners();
    }

    /**
     * 创建行业卡片HTML
     */
    createSectorCard(sector, index) {
        const sectorUrl = this.addAuthToUrl(`${this.baseUrl}panoramic-heatmap.html?sector=${encodeURIComponent(sector.code)}&embed=true`);
        const animationDelay = (index * 0.1).toFixed(1);
        
        return `
            <div class="sector-card" 
                 data-sector="${sector.code}" 
                 style="animation-delay: ${animationDelay}s">
                <div class="sector-header">
                    <h3 class="sector-name">
                        <span class="sector-icon">${sector.icon}</span>
                        ${sector.name}
                    </h3>
                    <div class="sector-status">
                        <div class="status-indicator loading" id="status-${sector.code}"></div>
                        <span class="status-text" id="status-text-${sector.code}">加载中...</span>
                    </div>
                </div>
                <div class="sector-iframe-container">
                    <iframe 
                        class="sector-iframe" 
                        data-src="${sectorUrl}"
                        id="iframe-${sector.code}"
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                        title="${sector.name}热力图"
                    ></iframe>
                    <div class="iframe-overlay" id="overlay-${sector.code}">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <p class="loading-text">正在加载${sector.name}数据...</p>
                        </div>
                    </div>
                </div>
                <div class="sector-actions">
                    <a href="${this.addAuthToUrl(this.baseUrl + 'panoramic-heatmap.html?sector=' + encodeURIComponent(sector.code))}" 
                       target="_blank" 
                       class="action-btn view-detail-btn"
                       title="查看${sector.name}详细热力图">
                        <span>📊</span> 查看详情
                    </a>
                    <button class="action-btn refresh-btn" 
                            onclick="sectorDashboard.refreshSector('${sector.code}')"
                            title="刷新${sector.name}数据">
                        <span>🔄</span> 刷新
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 设置行业卡片事件监听器
     */
    setupSectorEventListeners() {
        this.sectors.forEach(sector => {
            const iframe = document.getElementById(`iframe-${sector.code}`);
            const overlay = document.getElementById(`overlay-${sector.code}`);
            const statusIndicator = document.getElementById(`status-${sector.code}`);
            const statusText = document.getElementById(`status-text-${sector.code}`);
            
            if (!iframe || !overlay || !statusIndicator || !statusText) {
                console.error(`❌ 找不到${sector.name}的DOM元素`);
                return;
            }
            
            // 使用Intersection Observer实现懒加载
            this.setupLazyLoading(iframe, sector);
            
            // iframe加载事件
            iframe.onload = () => this.handleIframeLoad(sector.code, overlay, statusIndicator, statusText);
            iframe.onerror = () => this.handleIframeError(sector.code, overlay, statusIndicator, statusText);
            
            // 设置加载超时
            this.setupLoadTimeout(sector.code, overlay, statusIndicator, statusText);
        });
    }

    /**
     * 设置懒加载
     */
    setupLazyLoading(iframe, sector) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !iframe.src) {
                    const dataSrc = iframe.getAttribute('data-src');
                    if (dataSrc) {
                        iframe.src = dataSrc;
                        console.log(`🔄 开始加载${sector.name}热力图`);
                    }
                    observer.unobserve(iframe);
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        observer.observe(iframe);
    }

    /**
     * 处理iframe加载成功
     */
    handleIframeLoad(sectorCode, overlay, statusIndicator, statusText) {
        setTimeout(() => {
            overlay.classList.add('hidden');
            statusIndicator.className = 'status-indicator loaded';
            statusText.textContent = '已加载';
            
            this.loadedSectors.add(sectorCode);
            this.performanceMetrics.sectorsLoaded++;
            
            console.log(`✅ ${sectorCode}加载成功`);
            this.updateGlobalStats();
        }, 800);
    }

    /**
     * 处理iframe加载错误
     */
    handleIframeError(sectorCode, overlay, statusIndicator, statusText) {
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = '加载失败';
        
        overlay.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <p class="error-text">加载失败</p>
                <button class="retry-btn" onclick="sectorDashboard.refreshSector('${sectorCode}')">
                    重试
                </button>
            </div>
        `;
        
        this.errorSectors.add(sectorCode);
        console.error(`❌ ${sectorCode}加载失败`);
    }

    /**
     * 设置加载超时
     */
    setupLoadTimeout(sectorCode, overlay, statusIndicator, statusText) {
        setTimeout(() => {
            if (!overlay.classList.contains('hidden') && !this.errorSectors.has(sectorCode)) {
                this.handleIframeError(sectorCode, overlay, statusIndicator, statusText);
                console.warn(`⏰ ${sectorCode}加载超时`);
            }
        }, 15000); // 15秒超时
    }

    /**
     * 刷新特定行业
     */
    refreshSector(sectorCode) {
        const iframe = document.getElementById(`iframe-${sectorCode}`);
        const overlay = document.getElementById(`overlay-${sectorCode}`);
        const statusIndicator = document.getElementById(`status-${sectorCode}`);
        const statusText = document.getElementById(`status-text-${sectorCode}`);
        
        if (!iframe || !overlay || !statusIndicator || !statusText) {
            console.error(`❌ 找不到${sectorCode}的DOM元素`);
            return;
        }
        
        // 重置状态
        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-text">正在刷新数据...</p>
            </div>
        `;
        statusIndicator.className = 'status-indicator loading';
        statusText.textContent = '刷新中...';
        
        // 从集合中移除
        this.loadedSectors.delete(sectorCode);
        this.errorSectors.delete(sectorCode);
        
        // 重新加载iframe
        const currentSrc = iframe.src;
        iframe.src = '';
        
        setTimeout(() => {
            iframe.src = currentSrc + '&t=' + Date.now(); // 添加时间戳防止缓存
        }, 200);
        
        console.log(`🔄 正在刷新${sectorCode}`);
    }

    /**
     * 刷新所有行业
     */
    refreshAllSectors() {
        console.log('🔄 开始刷新所有行业数据');
        this.sectors.forEach(sector => {
            setTimeout(() => {
                this.refreshSector(sector.code);
            }, Math.random() * 1000); // 随机延迟避免同时请求
        });
    }

    /**
     * 更新全局统计
     */
    updateGlobalStats() {
        const loadedCount = this.loadedSectors.size;
        const errorCount = this.errorSectors.size;
        const totalCount = this.sectors.length;
        
        // 更新统计卡片
        const statCards = document.querySelectorAll('.stat-number');
        if (statCards.length >= 4) {
            statCards[1].textContent = `${loadedCount}/${totalCount}`;
            
            // 更新加载状态
            if (loadedCount === totalCount) {
                statCards[2].textContent = '已完成';
                console.log('🎉 所有行业数据加载完成');
            } else if (errorCount > 0) {
                statCards[2].textContent = `${errorCount}个错误`;
            }
        }
    }

    /**
     * 设置全局事件监听器
     */
    setupEventListeners() {
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshAllSectors();
            }
            
            if (e.key === 'F5') {
                e.preventDefault();
                this.refreshAllSectors();
            }
        });
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('📱 页面重新可见，检查数据更新');
                setTimeout(() => {
                    this.checkAndRefreshStaleData();
                }, 2000);
            }
        });
        
        // 网络状态变化
        window.addEventListener('online', () => {
            console.log('🌐 网络连接恢复，刷新失败的数据');
            this.refreshErrorSectors();
        });
        
        window.addEventListener('offline', () => {
            console.log('📴 网络连接断开');
        });
    }

    /**
     * 检查并刷新过期数据
     */
    checkAndRefreshStaleData() {
        const staleThreshold = 5 * 60 * 1000; // 5分钟
        const now = Date.now();
        
        this.sectors.forEach(sector => {
            const iframe = document.getElementById(`iframe-${sector.code}`);
            if (iframe && iframe.dataset.lastRefresh) {
                const lastRefresh = parseInt(iframe.dataset.lastRefresh);
                if (now - lastRefresh > staleThreshold) {
                    this.refreshSector(sector.code);
                }
            }
        });
    }

    /**
     * 刷新错误的行业
     */
    refreshErrorSectors() {
        this.errorSectors.forEach(sectorCode => {
            setTimeout(() => {
                this.refreshSector(sectorCode);
            }, Math.random() * 2000);
        });
    }

    /**
     * 设置自动刷新
     */
    setupAutoRefresh() {
        // 每10分钟自动刷新一次
        this.refreshInterval = setInterval(() => {
            console.log('⏰ 定时自动刷新数据');
            this.refreshAllSectors();
        }, 10 * 60 * 1000);
    }

    /**
     * 开始性能监控
     */
    startPerformanceMonitoring() {
        // 监控页面性能
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    console.log('📊 页面性能数据:', {
                        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                        totalTime: perfData.loadEventEnd - perfData.fetchStart
                    });
                }, 1000);
            });
        }
    }

    /**
     * 获取仪表盘状态
     */
    getStatus() {
        return {
            totalSectors: this.sectors.length,
            loadedSectors: this.loadedSectors.size,
            errorSectors: this.errorSectors.size,
            loadingProgress: (this.loadedSectors.size / this.sectors.length * 100).toFixed(1) + '%',
            uptime: Date.now() - this.performanceMetrics.loadStartTime
        };
    }

    /**
     * 销毁仪表盘
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // 清理事件监听器
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        console.log('🗑️ 仪表盘已销毁');
    }
}

// 全局实例
let sectorDashboard;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    sectorDashboard = new SectorDashboard();
    
    // 将实例暴露到全局作用域，方便调试
    window.sectorDashboard = sectorDashboard;
    
    // 添加调试命令
    window.debugDashboard = () => {
        console.log('🔍 仪表盘状态:', sectorDashboard.getStatus());
    };
});

// 页面卸载前清理
window.addEventListener('beforeunload', () => {
    if (sectorDashboard) {
        sectorDashboard.destroy();
    }
});

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SectorDashboard;
}