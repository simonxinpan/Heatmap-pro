/**
 * 行业热力图聚合仪表盘 JavaScript
 * 负责动态加载和管理13个行业的热力图
 */

class HeatmapAggregation {
    constructor() {
        // 13个行业配置
        this.sectors = [
            { name: '信息技术', encoded: '%E4%BF%A1%E6%81%AF%E6%8A%80%E6%9C%AF' },
            { name: '工业', encoded: '%E5%B7%A5%E4%B8%9A' },
            { name: '金融', encoded: '%E9%87%91%E8%9E%8D' },
            { name: '医疗保健', encoded: '%E5%8C%BB%E7%96%97%E4%BF%9D%E5%81%A5' },
            { name: '非必需消费品', encoded: '%E9%9D%9E%E5%BF%85%E9%9C%80%E6%B6%88%E8%B4%B9%E5%93%81' },
            { name: '日常消费品', encoded: '%E6%97%A5%E5%B8%B8%E6%B6%88%E8%B4%B9%E5%93%81' },
            { name: '公用事业', encoded: '%E5%85%AC%E7%94%A8%E4%BA%8B%E4%B8%9A' },
            { name: '房地产', encoded: '%E6%88%BF%E5%9C%B0%E4%BA%A7' },
            { name: '原材料', encoded: '%E5%8E%9F%E6%9D%90%E6%96%99' },
            { name: '能源', encoded: '%E8%83%BD%E6%BA%90' },
            { name: '半导体', encoded: '%E5%8D%8A%E5%AF%BC%E4%BD%93' },
            { name: '媒体娱乐', encoded: '%E5%AA%92%E4%BD%93%E5%A8%B1%E4%B9%90' },
            { name: '通讯服务', encoded: '%E9%80%9A%E8%AE%AF%E6%9C%8D%E5%8A%A1' }
        ];

        // 状态管理
        this.loadedCount = 0;
        this.errorCount = 0;
        this.currentView = 'grid';
        this.isLocalDev = window.location.hostname === 'localhost';
        
        // DOM 元素引用
        this.elements = {
            grid: document.getElementById('heatmapGrid'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            errorMessage: document.getElementById('errorMessage'),
            refreshBtn: document.getElementById('refreshAll'),
            loadedSectors: document.getElementById('loadedSectors'),
            avgPerformance: document.getElementById('avgPerformance'),
            lastUpdate: document.getElementById('lastUpdate')
        };

        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        this.bindEvents();
        this.createSectorCards();
        this.updateLastUpdateTime();
        
        // 延迟加载iframe以提升性能
        setTimeout(() => {
            this.loadAllHeatmaps();
        }, 500);
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 刷新按钮
        this.elements.refreshBtn?.addEventListener('click', () => {
            this.refreshAllHeatmaps();
        });

        // 视图切换
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshAllHeatmaps();
            }
        });
    }

    /**
     * 创建行业卡片
     */
    createSectorCards() {
        const template = document.getElementById('sectorCardTemplate');
        if (!template) return;

        this.sectors.forEach((sector, index) => {
            const card = template.content.cloneNode(true);
            const cardElement = card.querySelector('.sector-card');
            const nameElement = card.querySelector('.sector-name');
            const iframe = card.querySelector('.sector-iframe');
            const fullscreenBtn = card.querySelector('.fullscreen-btn');
            const refreshBtn = card.querySelector('.refresh-sector-btn');

            // 设置卡片属性
            cardElement.dataset.sector = sector.name;
            nameElement.textContent = sector.name;
            iframe.title = `${sector.name}行业热力图`;

            // 绑定按钮事件
            fullscreenBtn?.addEventListener('click', () => {
                this.openFullscreen(sector);
            });

            refreshBtn?.addEventListener('click', () => {
                this.refreshSectorHeatmap(cardElement, sector);
            });

            // 绑定卡片点击事件，点击卡片跳转到行业热力图
            cardElement.addEventListener('click', (e) => {
                // 避免按钮点击事件冒泡
                if (e.target.closest('.fullscreen-btn') || e.target.closest('.refresh-sector-btn')) {
                    return;
                }
                this.openFullscreen(sector);
            });

            // 添加鼠标悬停效果
            cardElement.addEventListener('mouseenter', () => {
                cardElement.style.transform = 'translateY(-2px)';
                cardElement.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
            });

            cardElement.addEventListener('mouseleave', () => {
                cardElement.style.transform = 'translateY(0)';
                cardElement.style.boxShadow = '';
            });

            this.elements.grid.appendChild(card);
        });
    }

    /**
     * 加载所有热力图
     */
    async loadAllHeatmaps() {
        this.showLoading(true);
        this.loadedCount = 0;
        this.errorCount = 0;

        const cards = document.querySelectorAll('.sector-card');
        const loadPromises = [];

        cards.forEach((card, index) => {
            const sector = this.sectors[index];
            if (sector) {
                loadPromises.push(this.loadSectorHeatmap(card, sector));
            }
        });

        try {
            await Promise.allSettled(loadPromises);
        } catch (error) {
            console.error('加载热力图时发生错误:', error);
        }

        this.showLoading(false);
        this.updateStats();
        
        if (this.errorCount > 0) {
            this.showErrorMessage();
        }
    }

    /**
     * 加载单个行业热力图
     */
    async loadSectorHeatmap(cardElement, sector) {
        const iframe = cardElement.querySelector('.sector-iframe');
        const overlay = cardElement.querySelector('.iframe-overlay');
        const statusIndicator = cardElement.querySelector('.status-indicator');
        const statusText = cardElement.querySelector('.status-text');

        try {
            // 设置加载状态
            statusIndicator.className = 'status-indicator loading';
            statusText.textContent = '加载中...';

            // 构建URL
            const baseUrl = this.isLocalDev 
                ? `${window.location.origin}/heatmap-viewer.html`
                : 'https://heatmap-dvrckt4gd-simon-pans-projects.vercel.app';
            
            const iframeUrl = `${baseUrl}?sector=${sector.encoded}&embed=true`;
            
            // 设置iframe源
            iframe.src = iframeUrl;

            // 监听iframe加载
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('加载超时'));
                }, 15000); // 15秒超时

                iframe.onload = () => {
                    clearTimeout(timeout);
                    
                    // 延迟隐藏加载覆盖层，确保内容已渲染
                    setTimeout(() => {
                        overlay.classList.add('hidden');
                        statusIndicator.className = 'status-indicator loaded';
                        statusText.textContent = '已加载';
                        this.loadedCount++;
                        resolve();
                    }, 1000);
                };

                iframe.onerror = () => {
                    clearTimeout(timeout);
                    this.handleLoadError(cardElement, sector);
                    reject(new Error('加载失败'));
                };
            });

        } catch (error) {
            console.error(`加载 ${sector.name} 热力图失败:`, error);
            this.handleLoadError(cardElement, sector);
            throw error;
        }
    }

    /**
     * 处理加载错误
     */
    handleLoadError(cardElement, sector) {
        const statusIndicator = cardElement.querySelector('.status-indicator');
        const statusText = cardElement.querySelector('.status-text');
        const overlay = cardElement.querySelector('.iframe-overlay');

        statusIndicator.className = 'status-indicator error';
        statusText.textContent = '加载失败';
        overlay.innerHTML = `
            <div style="text-align: center; color: #e53e3e;">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                <div>加载失败</div>
                <button onclick="window.heatmapAgg.refreshSectorHeatmap(this.closest('.sector-card'), {name: '${sector.name}', encoded: '${sector.encoded}'})" 
                        style="margin-top: 10px; padding: 8px 16px; background: #e53e3e; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    重试
                </button>
            </div>
        `;
        
        this.errorCount++;
    }

    /**
     * 刷新所有热力图
     */
    refreshAllHeatmaps() {
        // 重置所有iframe
        document.querySelectorAll('.sector-iframe').forEach(iframe => {
            iframe.src = '';
        });

        // 显示所有加载覆盖层
        document.querySelectorAll('.iframe-overlay').forEach(overlay => {
            overlay.classList.remove('hidden');
            overlay.innerHTML = '<div class="loading-spinner"></div>';
        });

        // 重新加载
        setTimeout(() => {
            this.loadAllHeatmaps();
        }, 500);
    }

    /**
     * 刷新单个行业热力图
     */
    refreshSectorHeatmap(cardElement, sector) {
        const iframe = cardElement.querySelector('.sector-iframe');
        const overlay = cardElement.querySelector('.iframe-overlay');
        
        // 重置状态
        overlay.classList.remove('hidden');
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        iframe.src = '';
        
        // 重新加载
        setTimeout(() => {
            this.loadSectorHeatmap(cardElement, sector);
        }, 500);
    }

    /**
     * 切换视图模式
     */
    switchView(view) {
        if (this.currentView === view) return;

        this.currentView = view;
        
        // 更新按钮状态
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // 更新网格类名
        this.elements.grid.className = view === 'list' ? 'heatmap-grid list-view' : 'heatmap-grid';
    }

    /**
     * 打开全屏视图
     */
    openFullscreen(sector) {
        const baseUrl = this.isLocalDev 
            ? `${window.location.origin}/heatmap-viewer.html`
            : 'https://heatmap-dvrckt4gd-simon-pans-projects.vercel.app';
        
        const fullscreenUrl = `${baseUrl}?sector=${sector.encoded}`;
        window.open(fullscreenUrl, '_blank');
    }

    /**
     * 显示/隐藏加载覆盖层
     */
    showLoading(show) {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.toggle('hidden', !show);
        }
    }

    /**
     * 显示错误消息
     */
    showErrorMessage() {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.style.display = 'block';
            
            // 5秒后自动隐藏
            setTimeout(() => {
                this.elements.errorMessage.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        if (this.elements.loadedSectors) {
            this.elements.loadedSectors.textContent = this.loadedCount;
        }

        // 这里可以添加更多统计信息的更新逻辑
        // 比如从API获取平均涨跌幅等数据
    }

    /**
     * 更新最后更新时间
     */
    updateLastUpdateTime() {
        if (this.elements.lastUpdate) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            this.elements.lastUpdate.textContent = timeString;
        }
    }

    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        return {
            totalSectors: this.sectors.length,
            loadedSectors: this.loadedCount,
            errorSectors: this.errorCount,
            successRate: ((this.loadedCount / this.sectors.length) * 100).toFixed(1) + '%'
        };
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 创建全局实例
    window.heatmapAgg = new HeatmapAggregation();
    
    // 添加页面可见性变化监听，当页面重新可见时刷新数据
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && window.heatmapAgg) {
            // 页面重新可见时，检查是否需要刷新数据
            const lastUpdate = localStorage.getItem('heatmap_last_update');
            const now = Date.now();
            
            // 如果超过5分钟没有更新，则自动刷新
            if (!lastUpdate || (now - parseInt(lastUpdate)) > 5 * 60 * 1000) {
                window.heatmapAgg.refreshAllHeatmaps();
                localStorage.setItem('heatmap_last_update', now.toString());
            }
        }
    });
    
    // 记录初始加载时间
    localStorage.setItem('heatmap_last_update', Date.now().toString());
});

// 错误处理
window.addEventListener('error', (event) => {
    console.error('页面错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});