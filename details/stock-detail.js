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
    
    updateYouTubeSearch(chineseName) {
        // 构建YouTube搜索查询 - 中文名称+股票
        const searchQuery = `${chineseName}股票`;
        const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        
        // 更新搜索链接
        const searchLink = document.getElementById('youtube-search-link');
        if (searchLink) {
            searchLink.href = youtubeSearchUrl;
            searchLink.querySelector('.link-description').textContent = `搜索"${searchQuery}"相关视频`;
        }
        
        // 嵌入一个相关的YouTube视频（使用搜索结果的第一个视频）
        this.embedYouTubeVideo(searchQuery);
    }
    
    async embedYouTubeVideo(searchQuery) {
        try {
            // 由于YouTube API需要密钥，这里使用一个通用的股票分析视频作为示例
            // 在实际项目中，可以集成YouTube Data API来获取真实的搜索结果
            const embedContainer = document.getElementById('youtube-embed');
            if (embedContainer) {
                // 创建一个搜索提示而不是嵌入视频，避免API密钥问题
                embedContainer.innerHTML = `
                    <div class="video-placeholder">
                        <div class="video-icon">📺</div>
                        <h3>观看"${searchQuery}"相关视频</h3>
                        <p>点击下方链接在YouTube搜索相关股票分析视频</p>
                        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}" 
                           target="_blank" class="watch-button">
                            🎬 立即观看
                        </a>
                    </div>
                `;
            }
        } catch (error) {
            console.error('YouTube视频加载失败:', error);
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
        // 股票中文名称映射表
        const stockNameMap = {
            'AAPL': '苹果公司',
            'MSFT': '微软',
            'GOOGL': '谷歌',
            'AMZN': '亚马逊',
            'TSLA': '特斯拉',
            'NVDA': '英伟达',
            'META': 'Meta平台',
            'BRK.B': '伯克希尔',
            'JPM': '摩根大通',
            'JNJ': '强生',
            'UNH': '联合健康',
            'PFE': '辉瑞',
            'V': '维萨',
            'PG': '宝洁',
            'HD': '家得宝',
            'MA': '万事达',
            'BAC': '美国银行',
            'XOM': '埃克森美孚',
            'CVX': '雪佛龙',
            'ABBV': '艾伯维',
            'KO': '可口可乐',
            'PEP': '百事可乐',
            'TMO': '赛默飞',
            'COST': '好市多',
            'AVGO': '博通',
            'NKE': '耐克',
            'MRK': '默克',
            'WMT': '沃尔玛',
            'DIS': '迪士尼',
            'ABT': '雅培',
            'CRM': '赛富时',
            'VZ': '威瑞森',
            'ADBE': '奥多比',
            'NFLX': '奈飞',
            'CMCSA': '康卡斯特',
            'INTC': '英特尔',
            'T': 'AT&T',
            'CSCO': '思科',
            'WFC': '富国银行',
            'LLY': '礼来',
            'ORCL': '甲骨文',
            'MDT': '美敦力',
            'UPS': '联合包裹',
            'HON': '霍尼韦尔',
            'QCOM': '高通',
            'TXN': '德州仪器',
            'LOW': '劳氏',
            'UNP': '联合太平洋',
            'LMT': '洛克希德马丁',
            'SPGI': '标普全球',
            'GS': '高盛',
            'MS': '摩根士丹利',
            'CAT': '卡特彼勒',
            'DE': '迪尔',
            'AXP': '美国运通',
            'BLK': '贝莱德',
            'MMM': '3M公司',
            'BA': '波音',
            'GE': '通用电气',
            'IBM': 'IBM',
            'AMD': 'AMD',
            'PYPL': 'PayPal',
            'NOW': 'ServiceNow',
            'ISRG': '直觉外科',
            'MU': '美光科技',
            'TGT': '塔吉特',
            'GILD': '吉利德',
            'CVS': 'CVS健康',
            'CHTR': '特许通信',
            'ANTM': 'Anthem',
            'ZTS': '硕腾',
            'SYK': '史赛克',
            'BKNG': 'Booking',
            'ADP': 'ADP',
            'MDLZ': '亿滋',
            'CI': '信诺',
            'TJX': 'TJX',
            'REGN': '再生元',
            'SO': '南方公司',
            'PLD': '普洛斯',
            'CL': '高露洁',
            'CME': '芝商所',
            'USB': '美国合众银行',
            'EOG': 'EOG资源',
            'DUK': '杜克能源',
            'NSC': '诺福克南方',
            'BSX': '波士顿科学',
            'AON': '怡安',
            'ICE': '洲际交易所',
            'FCX': '自由港',
            'PNC': 'PNC金融',
            'D': '道明尼能源',
            'SHW': '宣伟',
            'COP': '康菲石油',
            'EMR': '艾默生',
            'FIS': 'FIS',
            'GD': '通用动力',
            'CSX': 'CSX',
            'WM': '废物管理',
            'TFC': 'Truist金融',
            'GM': '通用汽车',
            'F': '福特',
            'FISV': 'Fiserv',
            'ECL': '艺康',
            'NOC': '诺斯罗普',
            'ITW': '伊利诺伊工具',
            'BDX': '贝克顿',
            'APD': '空气产品',
            'ROP': '罗珀科技',
            'CARR': '开利',
            'PCAR': '帕卡',
            'NEM': '纽蒙特',
            'SRE': 'Sempra能源',
            'KMB': '金佰利',
            'CTSH': '高知特',
            'WELL': 'Welltower',
            'CMG': 'Chipotle',
            'FAST': '快扣',
            'VRSK': 'Verisk',
            'EXC': 'Exelon',
            'HUM': 'Humana',
            'CTAS': 'Cintas',
            'VRTX': '福泰制药',
            'WBA': '沃博联',
            'OTIS': '奥的斯',
            'IDXX': 'IDEXX',
            'IQV': 'IQVIA',
            'GPN': '环汇',
            'PAYX': 'Paychex',
            'PRU': '保德信',
            'TROW': 'T. Rowe Price',
            'MSCI': 'MSCI',
            'ILMN': '因美纳',
            'EA': '艺电',
            'EW': '爱德华兹',
            'CTVA': '科迪华',
            'DD': '杜邦',
            'FTV': '福蒂夫',
            'BIIB': '百健',
            'RMD': '瑞思迈',
            'XLNX': '赛灵思',
            'MXIM': '美信',
            'KLAC': '科磊',
            'AMAT': '应用材料',
            'LRCX': '拉姆研究',
            'ADI': '亚德诺',
            'MCHP': '微芯科技',
            'SWKS': 'Skyworks',
            'QRVO': 'Qorvo',
            'MRVL': '迈威尔',
            'FTNT': '飞塔',
            'KEYS': '是德科技',
            'ANSS': 'Ansys',
            'CDNS': '铿腾电子',
            'SNPS': '新思科技',
            'INTU': 'Intuit',
            'ADSK': '欧特克',
            'WDAY': 'Workday',
            'TEAM': 'Atlassian',
            'DOCU': 'DocuSign',
            'ZM': 'Zoom',
            'CRWD': 'CrowdStrike',
            'OKTA': 'Okta',
            'SPLK': 'Splunk',
            'PANW': 'Palo Alto',
            'DXCM': 'DexCom',
            'ALGN': '爱齐科技',
            'MRNA': 'Moderna',
            'ZBH': '捷迈邦美',
            'HOLX': 'Hologic',
            'VAR': 'Varian',
            'TECH': 'Bio-Techne',
            'PODD': 'Insulet',
            'INCY': 'Incyte',
            'BMRN': 'BioMarin',
            'ALXN': 'Alexion',
            'VTRS': 'Viatris',
            'AMGN': '安进',
            'CELG': '新基',
            'EXAS': 'Exact Sciences',
            'PTON': 'Peloton',
            'ROKU': 'Roku',
            'SQ': 'Square',
            'SHOP': 'Shopify',
            'SPOT': 'Spotify',
            'UBER': '优步',
            'LYFT': 'Lyft',
            'TWTR': '推特',
            'SNAP': 'Snapchat',
            'PINS': 'Pinterest',
            'ZG': 'Zillow',
            'ETSY': 'Etsy',
            'EBAY': 'eBay',
            'BABA': '阿里巴巴',
            'JD': '京东',
            'PDD': '拼多多',
            'BIDU': '百度',
            'NTES': '网易',
            'TME': '腾讯音乐',
            'IQ': '爱奇艺',
            'BILI': '哔哩哔哩',
            'VIPS': '唯品会',
            'WB': '微博',
            'SINA': '新浪',
            'SOHU': '搜狐',
            'YY': 'YY',
            'MOMO': '陌陌',
            'HUYA': '虎牙',
            'DOYU': '斗鱼',
            'LK': '瑞幸咖啡',
            'NIO': '蔚来',
            'XPEV': '小鹏汽车',
            'LI': '理想汽车',
            'DIDI': '滴滴',
            'GRAB': 'Grab',
            'SE': 'Sea Limited',
            'GOTU': '高途',
            'TAL': '好未来',
            'EDU': '新东方',
            'YMM': '满帮',
            'TUYA': '涂鸦智能',
            'KC': '金山云',
            'TIGR': '老虎证券',
            'FUTU': '富途',
            'UP': 'Wheels Up',
            'OPEN': 'Opendoor',
            'RBLX': 'Roblox',
            'COIN': 'Coinbase',
            'HOOD': 'Robinhood',
            'AFRM': 'Affirm',
            'UPST': 'Upstart',
            'SOFI': 'SoFi',
            'LC': 'LendingClub',
            'ALLY': 'Ally Financial',
            'COF': '第一资本',
            'DFS': 'Discover',
            'SYF': 'Synchrony',
            'PYPL': 'PayPal',
            'V': '维萨',
            'MA': '万事达',
            'AXP': '美国运通'
        };
        
        // 获取中文名称
        const chineseName = stockNameMap[symbol] || symbol;
        
        // 这里应该调用实际的API，现在使用模拟数据
        if (symbol === 'AAPL') {
            return {
                symbol: 'AAPL',
                name: chineseName,
                englishName: 'Apple Inc.',
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
        
        // 伯克希尔的特殊处理
        if (symbol === 'BRK.B') {
            return {
                symbol: 'BRK.B',
                name: chineseName,
                englishName: 'Berkshire Hathaway Inc.',
                exchange: 'NYSE',
                logo: 'https://logo.clearbit.com/berkshirehathaway.com',
                currentPrice: 350.75, // 修正后的伯克希尔股价
                change: 1.25,
                changePercent: 0.36,
                open: 349.50,
                high: 352.00,
                low: 348.80,
                volume: '1.2M',
                marketCap: '$750B',
                peRatio: 'N/A',
                week52High: 362.10,
                week52Low: 200.55,
                description: '伯克希尔·哈撒韦公司是一家美国跨国企业集团控股公司，总部位于内布拉斯加州奥马哈。',
                industry: '金融服务',
                employees: '372,000',
                founded: '1839年',
                headquarters: '奥马哈, 内布拉斯加',
                website: 'https://www.berkshirehathaway.com',
                revenue: '$276.1B',
                netIncome: '$89.8B',
                grossMargin: 'N/A',
                profitMargin: '32.5%',
                totalAssets: '$958.8B',
                totalDebt: '$28.9B',
                marketStatus: '市场开放',
                lastUpdated: '16:00 EST'
            };
        }
        
        // 其他股票的默认数据
        return {
            symbol: symbol,
            name: chineseName,
            englishName: symbol,
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
        // 更新股票基本信息 - 优先显示中文名称
        document.getElementById('stock-logo').src = data.logo || '';
        document.getElementById('stock-name').textContent = data.name; // 中文名称
        
        // 如果有英文名称，在股票代码下方显示
        const tickerElement = document.getElementById('stock-ticker');
        if (data.englishName && data.englishName !== data.symbol) {
            tickerElement.innerHTML = `${data.exchange}: ${data.symbol}<br><small style="color: #666; font-size: 0.9em;">${data.englishName}</small>`;
        } else {
            tickerElement.textContent = `${data.exchange}: ${data.symbol}`;
        }
        
        // 更新价格信息
        document.getElementById('current-price').textContent = `$${data.currentPrice.toFixed(2)}`;
        
        const priceChangeElement = document.getElementById('price-change');
        const changeText = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)`;
        priceChangeElement.textContent = changeText;
        priceChangeElement.className = `price-change ${data.change >= 0 ? 'gain' : 'loss'}`;
        
        // 更新市场状态
        document.getElementById('market-status').textContent = data.marketStatus;
        document.getElementById('last-updated').textContent = `最后更新: ${data.lastUpdated}`;
        
        // 更新页面标题 - 优先显示中文名称
        document.title = `${data.name} (${data.symbol}) - 股票详情`;
        
        // 更新YouTube搜索链接 - 使用中文名称+股票
        this.updateYouTubeSearch(data.name);
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