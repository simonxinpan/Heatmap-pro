# 🔥 股票热力图组件包

一个功能强大、高度可定制的股票热力图可视化组件，专为金融数据展示而设计。支持多种数据源、显示模式和交互方式，可轻松集成到任何前端项目中。

## ✨ 特性

- 🎨 **多种预设样式**: 全景、紧凑、迷你等多种显示模式
- 📊 **丰富的数据指标**: 支持涨跌幅、成交量、市值等多种指标
- 🎯 **高度可定制**: 灵活的配置选项和主题系统
- 📱 **响应式设计**: 自适应不同屏幕尺寸
- ⚡ **高性能渲染**: 基于SVG的高效渲染引擎
- 🔄 **实时数据**: 支持数据自动刷新和实时更新
- 🎭 **丰富交互**: 悬停提示、点击事件、缩放等
- 📦 **零依赖**: 纯JavaScript实现，无需外部库



## 📁 组件结构

```
heatmap-component/
├── 📄 index.js            # 主入口文件 - 统一API接口
├── 🎯 StockHeatmap.js     # 核心热力图组件
├── 🔄 DataProcessor.js    # 数据处理器 - 数据获取和处理
├── 🎨 HeatmapRenderer.js  # 渲染引擎 - SVG渲染和动画
├── ⚙️ config.js          # 配置文件 - 预设和工具函数
├── 📋 examples.html       # 完整使用示例
├── 📦 package.json       # 包配置文件
└── 📖 README.md          # 说明文档
```

## 🚀 快速开始

### 1. 引入组件

```html
<!DOCTYPE html>
<html>
<head>
    <title>股票热力图示例</title>
</head>
<body>
    <div id="heatmap-container"></div>
    
    <!-- 按顺序引入组件文件 -->
    <script src="config.js"></script>
    <script src="DataProcessor.js"></script>
    <script src="StockHeatmap.js"></script>
    <script src="HeatmapRenderer.js"></script>
    <script src="index.js"></script>
</body>
</html>
```

### 2. 创建热力图

```javascript
// 基础用法
const heatmap = createHeatmap('heatmap-container', {
    width: 800,
    height: 600,
    onStockClick: (stock) => {
        console.log('点击股票:', stock);
        // 跳转到股票详情页
        window.open(`/stock/${stock.symbol}`, '_blank');
    }
});

// 加载市场数据
heatmap.loadMarketData();
```

### 3. 使用预设配置

```javascript
// 全景热力图 - 适用于主页面
const panoramicHeatmap = createPanoramicHeatmap('main-heatmap');
panoramicHeatmap.loadMarketData();

// 紧凑型热力图 - 适用于侧边栏
const compactHeatmap = createCompactHeatmap('sidebar-heatmap');
compactHeatmap.loadSectorData('科技');

// 迷你热力图 - 适用于卡片组件
const miniHeatmap = createMiniHeatmap('card-heatmap');
miniHeatmap.loadTagData('人工智能');
```

## ⚙️ 配置选项

### 基础配置

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|---------|
| `width` | number | 800 | 热力图宽度 |
| `height` | number | 600 | 热力图高度 |
| `padding` | number | 20 | 内边距 |
| `showLabels` | boolean | true | 显示股票标签 |
| `showTooltip` | boolean | true | 显示悬停提示 |
| `interactive` | boolean | true | 启用交互功能 |
| `animation` | boolean | true | 启用动画效果 |
| `colorScheme` | string | 'default' | 颜色方案 |

### 高级配置

```javascript
const heatmap = createHeatmap('container', {
    // 基础设置
    width: 1200,
    height: 800,
    padding: 30,
    
    // 显示选项
    showLabels: true,
    showTooltip: true,
    interactive: true,
    animation: true,
    
    // 颜色方案: 'default', 'blueRed', 'greenRed'
    colorScheme: 'greenRed',
    
    // 默认显示指标
    defaultMetric: 'changePercent',
    
    // 自动刷新
    autoRefresh: true,
    refreshInterval: 30000, // 30秒
    
    // 事件回调
    onStockClick: (stock) => {
        console.log('点击:', stock);
    },
    onStockHover: (stock) => {
        console.log('悬停:', stock);
    },
    
    // API配置
    baseUrl: '/api',
    timeout: 10000
});
```

### 预设配置

| 预设 | 尺寸 | 适用场景 | 特点 |
|------|------|----------|------|
| `panoramic` | 1200×800 | 主页面、仪表板 | 大尺寸、显示标签、动画效果 |
| `medium` | 800×600 | 内容页面 | 中等尺寸、平衡显示 |
| `compact` | 400×300 | 侧边栏、卡片 | 紧凑布局、隐藏标签 |
| `mini` | 200×150 | 小部件、预览 | 最小尺寸、仅显示颜色 |
| `mobile` | 350×250 | 移动端 | 移动端优化 |

## 📊 数据格式

### 标准数据格式

```javascript
[
    {
        symbol: 'AAPL',              // 股票代码 (必需)
        name: '苹果公司',             // 股票名称
        changePercent: 2.5,          // 涨跌幅 (%) (必需)
        marketCap: 2800000000000,    // 市值
        volume: 50000000,            // 成交量
        price: 150.25,               // 当前价格
        sector: '科技',              // 行业分类
        industry: '消费电子'          // 细分行业
    },
    // ... 更多股票数据
]
```

### 字段映射

组件支持多种字段名称，自动识别：

- **股票代码**: `symbol`, `ticker`, `code`
- **股票名称**: `name`, `name_zh`, `companyName`
- **涨跌幅**: `changePercent`, `change_percent`, `pct_change`
- **市值**: `marketCap`, `market_cap`, `totalMarketCap`
- **成交量**: `volume`, `totalVolume`, `vol`
- **行业**: `sector`, `sector_zh`, `industry`

## 🔧 API 方法

### 数据加载方法

```javascript
// 加载全市场数据
heatmap.loadMarketData();

// 加载特定行业数据
heatmap.loadSectorData('科技');
heatmap.loadSectorData('金融');

// 加载标签/概念数据
heatmap.loadTagData('人工智能');
heatmap.loadTagData('新能源');

// 加载趋势数据
heatmap.loadTrendingData('gainers');  // 涨幅榜
heatmap.loadTrendingData('losers');   // 跌幅榜
heatmap.loadTrendingData('active');   // 活跃股
```

### 显示控制方法

```javascript
// 直接渲染数据
heatmap.render(stockData, 'changePercent');

// 切换显示指标
heatmap.updateMetric('volume');      // 切换到成交量
heatmap.updateMetric('marketCap');   // 切换到市值

// 刷新当前数据
heatmap.refresh();

// 调整组件大小
heatmap.resize(1000, 700);
heatmap.resize(); // 自动适应容器大小
```

### 工具方法

```javascript
// 导出为图片
heatmap.exportAsImage('market-heatmap.png');

// 获取当前状态
const currentState = heatmap.getCurrentData();
console.log(currentState.data);    // 当前数据
console.log(currentState.metric);  // 当前指标
console.log(currentState.config);  // 当前配置

// 销毁组件
heatmap.destroy();
```

### 自动刷新控制

```javascript
// 开始自动刷新
heatmap.startAutoRefresh();

// 停止自动刷新
heatmap.stopAutoRefresh();
```

## 🎨 主题和样式

### 颜色方案

```javascript
// 默认绿红配色
const heatmap1 = createHeatmap('container1', {
    colorScheme: 'default'
});

// 蓝红配色
const heatmap2 = createHeatmap('container2', {
    colorScheme: 'blueRed'
});

// 自定义颜色方案
const heatmap3 = createHeatmap('container3', {
    colorScheme: 'greenRed'
});
```

### 自定义样式

```css
/* 自定义热力图样式 */
.heatmap-cell {
    stroke-width: 2px;
    transition: all 0.3s ease;
}

.heatmap-cell:hover {
    stroke: #333;
    stroke-width: 3px;
}

.heatmap-tooltip {
    background: rgba(0, 0, 0, 0.9);
    border-radius: 6px;
    font-size: 13px;
}
```

## 📱 响应式设计

```javascript
// 移动端适配
const mobileHeatmap = createHeatmap('mobile-container', {
    preset: 'mobile',
    // 移动端特定配置
    showLabels: false,
    fontSize: 10,
    padding: 15
});

// 响应式调整
window.addEventListener('resize', () => {
    const container = document.getElementById('heatmap-container');
    const rect = container.getBoundingClientRect();
    heatmap.resize(rect.width, rect.height);
});
```

## 🔄 事件系统

```javascript
// 监听组件事件
document.addEventListener('heatmap:renderComplete', (event) => {
    console.log('渲染完成:', event.detail);
});

document.addEventListener('heatmap:error', (event) => {
    console.error('组件错误:', event.detail);
});

// 股票交互事件
const heatmap = createHeatmap('container', {
    onStockClick: (stock, index) => {
        // 处理点击事件
        showStockDetail(stock);
    },
    onStockHover: (stock, index) => {
        // 处理悬停事件
        updateSidebar(stock);
    }
});
```

## 🛠️ 开发和构建

### 本地开发

```bash
# 启动本地服务器
npm run serve

# 访问示例页面
# http://localhost:8080/examples.html
```

### 构建打包

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 开发模式（监听文件变化）
npm run dev
```

## 🌐 浏览器兼容性

| 浏览器 | 版本要求 |
|--------|-----------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 12+ |
| Edge | 79+ |
| IE | 不支持 |

## 📋 完整示例

查看 `examples.html` 文件获取完整的使用示例，包括：

- 🌍 全景市场热力图
- 🏭 行业分类热力图
- 🏷️ 标签概念热力图
- 📱 紧凑型热力图
- 🔍 迷你预览热力图

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 LICENSE 文件