// 股票详情页JavaScript功能
class StockDetailPage {
    constructor() {
        this.chart = null;
        this.currentSymbol = null;
        this.currentTimeRange = '1D';
        this.init();
    }

    init() {
        // 从URL获取股票代码
        this.currentSymbol = this.getSymbolFromURL();
        
        // 绑定事件监听器
        this.bindEventListeners();
        
        // 加载股票数据
        if (this.currentSymbol) {
            this.loadStockData(this.currentSymbol);
        } else {
            // 默认加载苹果股票数据
            this.loadStockData('AAPL');
        }
    }

    getSymbolFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('symbol') || urlParams.get('ticker') || 'AAPL';
    }

    bindEventListeners() {
        // 时间范围选择器
        const timeButtons = document.querySelectorAll('.time-btn');
        timeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 移除所有active类
                timeButtons.forEach(b => b.classList.remove('active'));
                // 添加active类到当前按钮
                e.target.classList.add('active');
                
                this.currentTimeRange = e.target.dataset.range;
                this.loadChartData(this.currentSymbol, this.currentTimeRange);
            });
        });
    }

    async loadStockData(symbol) {
        try {
            this.showLoading(true);
            
            // 模拟API调用 - 在实际项目中这里会调用真实的API
            const stockData = await this.fetchStockData(symbol);
            
            // 更新页面数据
            this.updateStockInfo(stockData);
            this.updateKeyMetrics(stockData);
            this.updateCompanyOverview(stockData);
            this.updateFinancialData(stockData);
            
            // 加载图表数据
            await this.loadChartData(symbol, this.currentTimeRange);
            
            this.showLoading(false);
        } catch (error) {
            console.error('加载股票数据失败:', error);
            this.showError('加载股票数据失败，请稍后重试');
        }
    }

    async fetchStockData(symbol) {
        // 这里应该调用实际的API，现在使用模拟数据
        if (symbol === 'AAPL') {
            return {
                symbol: 'AAPL',
                name: '苹果公司',
                exchange: 'NASDAQ',
                logo: 'https://logo.clearbit.com/apple.com',
                currentPrice: 150.25,
                change: 2.50,
                changePercent: 1.69,
                open: 148.50,
                high: 152.00,
                low: 147.80,
                volume: '45.2M',
                marketCap: '$2.45T',
                peRatio: 28.5,
                week52High: 182.94,
                week52Low: 124.17,
                description: '苹果公司是一家美国跨国科技公司，总部位于加利福尼亚州库比蒂诺。公司设计、开发和销售消费电子产品、计算机软件和在线服务。',
                industry: '消费电子',
                employees: '164,000',
                founded: '1976年',
                headquarters: '库比蒂诺, 加利福尼亚',
                website: 'https://www.apple.com',
                revenue: '$394.3B',
                netIncome: '$99.8B',
                grossMargin: '43.3%',
                profitMargin: '25.3%',
                totalAssets: '$352.8B',
                totalDebt: '$123.9B',
                marketStatus: '市场开放',
                lastUpdated: '16:00 EST'
            };
        }
        
        // 其他股票的默认数据
        return {
            symbol: symbol,
            name: '股票名称',
            exchange: 'NASDAQ',
            logo: '',
            currentPrice: 100.00,
            change: 0,
            changePercent: 0,
            open: 100.00,
            high: 100.00,
            low: 100.00,
            volume: '0',
            marketCap: 'N/A',
            peRatio: 'N/A',
            week52High: 'N/A',
            week52Low: 'N/A',
            description: '暂无公司简介',
            industry: 'N/A',
            employees: 'N/A',
            founded: 'N/A',
            headquarters: 'N/A',
            website: '#',
            revenue: 'N/A',
            netIncome: 'N/A',
            grossMargin: 'N/A',
            profitMargin: 'N/A',
            totalAssets: 'N/A',
            totalDebt: 'N/A',
            marketStatus: '市场关闭',
            lastUpdated: 'N/A'
        };
    }

    updateStockInfo(data) {
        // 更新股票基本信息
        document.getElementById('stock-logo').src = data.logo || '';
        document.getElementById('stock-name').textContent = data.name;
        document.getElementById('stock-ticker').textContent = `${data.exchange}: ${data.symbol}`;
        
        // 更新价格信息
        document.getElementById('current-price').textContent = `$${data.currentPrice.toFixed(2)}`;
        
        const priceChangeElement = document.getElementById('price-change');
        const changeText = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)`;
        priceChangeElement.textContent = changeText;
        priceChangeElement.className = `price-change ${data.change >= 0 ? 'gain' : 'loss'}`;
        
        // 更新市场状态
        document.getElementById('market-status').textContent = data.marketStatus;
        document.getElementById('last-updated').textContent = `最后更新: ${data.lastUpdated}`;
        
        // 更新页面标题
        document.title = `${data.name} (${data.symbol}) - 股票详情`;
    }

    updateKeyMetrics(data) {
        document.getElementById('open-price').textContent = `$${data.open.toFixed(2)}`;
        document.getElementById('high-price').textContent = `$${data.high.toFixed(2)}`;
        document.getElementById('low-price').textContent = `$${data.low.toFixed(2)}`;
        document.getElementById('volume').textContent = data.volume;
        document.getElementById('market-cap').textContent = data.marketCap;
        document.getElementById('pe-ratio').textContent = data.peRatio;
        document.getElementById('week-52-high').textContent = typeof data.week52High === 'number' ? `$${data.week52High.toFixed(2)}` : data.week52High;
        document.getElementById('week-52-low').textContent = typeof data.week52Low === 'number' ? `$${data.week52Low.toFixed(2)}` : data.week52Low;
    }

    updateCompanyOverview(data) {
        document.getElementById('company-description').textContent = data.description;
        document.getElementById('industry').textContent = data.industry;
        document.getElementById('employees').textContent = data.employees;
        document.getElementById('founded').textContent = data.founded;
        document.getElementById('headquarters').textContent = data.headquarters;
        
        const websiteElement = document.getElementById('website');
        websiteElement.href = data.website;
        websiteElement.textContent = data.website.replace(/^https?:\/\/(www\.)?/, '');
    }

    updateFinancialData(data) {
        document.getElementById('revenue').textContent = data.revenue;
        document.getElementById('net-income').textContent = data.netIncome;
        document.getElementById('gross-margin').textContent = data.grossMargin;
        document.getElementById('profit-margin').textContent = data.profitMargin;
        document.getElementById('total-assets').textContent = data.totalAssets;
        document.getElementById('total-debt').textContent = data.totalDebt;
    }

    async loadChartData(symbol, timeRange) {
        try {
            // 生成模拟的价格数据
            const chartData = this.generateMockChartData(timeRange);
            this.renderChart(chartData);
        } catch (error) {
            console.error('加载图表数据失败:', error);
        }
    }

    generateMockChartData(timeRange) {
        const now = new Date();
        const data = [];
        let dataPoints = 30;
        let intervalMs = 24 * 60 * 60 * 1000; // 1天
        
        switch (timeRange) {
            case '1D':
                dataPoints = 24;
                intervalMs = 60 * 60 * 1000; // 1小时
                break;
            case '5D':
                dataPoints = 5;
                intervalMs = 24 * 60 * 60 * 1000; // 1天
                break;
            case '1M':
                dataPoints = 30;
                intervalMs = 24 * 60 * 60 * 1000; // 1天
                break;
            case '3M':
                dataPoints = 90;
                intervalMs = 24 * 60 * 60 * 1000; // 1天
                break;
            case '1Y':
                dataPoints = 52;
                intervalMs = 7 * 24 * 60 * 60 * 1000; // 1周
                break;
            case '5Y':
                dataPoints = 60;
                intervalMs = 30 * 24 * 60 * 60 * 1000; // 1月
                break;
        }
        
        let basePrice = 150;
        for (let i = dataPoints - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * intervalMs);
            const price = basePrice + (Math.random() - 0.5) * 20;
            data.push({
                x: date,
                y: price
            });
            basePrice = price;
        }
        
        return data;
    }

    renderChart(data) {
        const ctx = document.getElementById('price-chart').getContext('2d');
        
        // 销毁现有图表
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: '股价',
                    data: data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                hour: 'HH:mm',
                                day: 'MM/DD',
                                week: 'MM/DD',
                                month: 'MM/YY'
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: '#e5e7eb'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#2563eb'
                    }
                }
            }
        });
    }

    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (show) {
            loadingElement.classList.remove('hidden');
        } else {
            loadingElement.classList.add('hidden');
        }
    }

    showError(message) {
        this.showLoading(false);
        // 这里可以显示错误消息
        console.error(message);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new StockDetailPage();
});

// 导出类以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockDetailPage;
}