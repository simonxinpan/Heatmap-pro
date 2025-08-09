# 智能标签系统产品需求文档 (PRD)

## 📋 产品概述

**产品名称**: 智能标签系统 (Smart Tagging System)  
**版本**: V1.0  
**负责人**: PM-Core  
**开发周期**: 2-3周  
**优先级**: P0 (核心功能)  

## 🎯 产品目标

### 核心使命
将现有的502只股票数据从"孤立展示"升级为"智能关联"，通过多维度标签体系，让用户能够快速发现符合特定投资策略的股票集群，实现从数据工具到分析平台的关键跃升。

### 商业价值
- **用户粘性提升**: 通过标签探索功能，增加用户在平台的停留时间
- **内容丰富度**: 为后续榜单功能提供数据基础
- **差异化竞争**: 建立独特的股票分类和发现机制
- **付费转化准备**: 为高级筛选功能奠定基础

## 🔍 用户需求分析

### 目标用户画像
1. **个人投资者**: 需要快速筛选符合投资策略的股票
2. **投资研究员**: 需要按行业、财务指标等维度分析股票
3. **量化交易者**: 需要基于多因子模型筛选标的

### 核心用户故事
- 作为投资者，我希望能够快速找到所有"高ROE科技股"
- 作为研究员，我希望能够查看"巴菲特持仓"的所有股票
- 作为用户，我希望能够通过点击标签发现相似的投资机会

## 🏗️ 功能规格说明

### 1. 标签分类体系

#### 1.1 静态标签 (Static Tags)
**定义**: 基于公司固有属性，变化频率低

| 标签类型 | 具体标签 | 数据源 | 更新频率 |
|---------|---------|--------|----------|
| 行业标签 | `科技`, `医疗健康`, `金融`, `消费`, `能源` | 数据库sector_zh字段 | 季度更新 |
| 指数标签 | `标普500`, `纳斯达克100`, `道琼斯30` | 公开指数成分股 | 季度更新 |
| 地区标签 | `美国本土`, `中概股ADR`, `欧洲ADR` | 公司注册地 | 年度更新 |
| 规模标签 | `大盘股`, `中盘股`, `小盘股` | 市值区间 | 月度更新 |

#### 1.2 动态标签 (Dynamic Tags)
**定义**: 基于最新市场和财务数据，每日自动计算

| 标签类型 | 具体标签 | 计算规则 | 更新频率 |
|---------|---------|----------|----------|
| 市场表现 | `52周新高`, `52周新低` | 当前价格 vs 52周价格区间 | 每日 |
| 市场表现 | `近期强势`, `近期弱势` | 近30日涨跌幅 > ±10% | 每日 |
| 市场表现 | `高成交量` | 成交量 > 30日均量的2倍 | 每日 |
| 财务质量 | `高ROE` | ROE > 15% | 季度 |
| 财务质量 | `低市盈率` | P/E < 15 | 每日 |
| 财务质量 | `高股息率` | 股息率 > 3% | 季度 |
| 财务质量 | `稳定增长` | 连续4个季度营收增长 | 季度 |

### 2. 用户界面设计

#### 2.1 个股详情页标签展示
- **位置**: 股票基本信息下方
- **样式**: 彩色标签云，不同类型标签使用不同颜色
- **交互**: 每个标签可点击，点击后跳转到标签详情页
- **限制**: 最多显示8个标签，优先显示动态标签

#### 2.2 标签详情页
- **URL结构**: `/tags/[tagName]` (如: `/tags/高ROE`)
- **页面标题**: "[标签名] - 相关股票" (如: "高ROE - 相关股票")
- **展示方式**: 
  - 默认: 列表视图，显示股票基本信息和关键指标
  - 可选: 热力图视图 (为后续付费功能预留)
- **排序选项**: 按市值、涨跌幅、相关度排序
- **筛选功能**: 可进一步按行业、市值区间筛选

### 3. 数据管理

#### 3.1 标签优先级
1. **P0级标签** (必须实现): 行业、高ROE、52周新高/新低
2. **P1级标签** (重要): 指数成分股、低市盈率、高股息率
3. **P2级标签** (增强): 知名持仓、技术指标相关

#### 3.2 标签更新策略
- **实时标签**: 基于当日股价的标签 (如52周新高)
- **日更标签**: 基于成交量、技术指标的标签
- **周更标签**: 基于财务数据的标签
- **月更标签**: 基于指数成分股变化的标签

## 🛠️ 技术实现方案

### 1. 数据库设计

```sql
-- 标签主表
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    name_en VARCHAR(50),
    category VARCHAR(20) NOT NULL, -- 'static' or 'dynamic'
    type VARCHAR(20) NOT NULL, -- 'industry', 'performance', 'financial', etc.
    description TEXT,
    color VARCHAR(7), -- 十六进制颜色代码
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 股票标签关联表
CREATE TABLE stock_tags (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER REFERENCES stocks(id),
    tag_id INTEGER REFERENCES tags(id),
    relevance_score DECIMAL(3,2) DEFAULT 1.00, -- 相关度评分 0-1
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_id, tag_id)
);

-- 创建索引
CREATE INDEX idx_stock_tags_stock_id ON stock_tags(stock_id);
CREATE INDEX idx_stock_tags_tag_id ON stock_tags(tag_id);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_type ON tags(type);
```

### 2. API 端点设计

#### 2.1 获取股票标签
```
GET /api/stocks/[ticker]/tags
响应: {
  "ticker": "AAPL",
  "tags": [
    {
      "id": 1,
      "name": "科技",
      "type": "industry",
      "color": "#2196F3",
      "relevance_score": 1.0
    }
  ]
}
```

#### 2.2 获取标签相关股票
```
GET /api/tags/[tagName]/stocks?page=1&limit=50&sort=market_cap
响应: {
  "tag": "高ROE",
  "total_count": 156,
  "stocks": [
    {
      "ticker": "AAPL",
      "name_zh": "苹果公司",
      "current_price": 150.25,
      "change_percent": 2.34,
      "market_cap": 2500000000000,
      "relevance_score": 0.95
    }
  ]
}
```

#### 2.3 获取所有标签
```
GET /api/tags?category=dynamic&type=performance
响应: {
  "tags": [
    {
      "id": 1,
      "name": "52周新高",
      "category": "dynamic",
      "type": "performance",
      "stock_count": 23,
      "color": "#4CAF50"
    }
  ]
}
```

### 3. 自动化标签更新

#### 3.1 GitHub Actions 工作流
```yaml
name: Update Dynamic Tags
on:
  schedule:
    - cron: '0 2 * * *' # 每日凌晨2点执行
  workflow_dispatch: # 手动触发

jobs:
  update-tags:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Update dynamic tags
        run: node scripts/update-dynamic-tags.js
        env:
          NEON_DATABASE_URL: ${{ secrets.NEON_DATABASE_URL }}
          POLYGON_API_KEY: ${{ secrets.POLYGON_API_KEY }}
```

#### 3.2 标签计算脚本结构
```javascript
// scripts/update-dynamic-tags.js
const tagCalculators = {
  '52周新高': calculateNewHigh,
  '52周新低': calculateNewLow,
  '高ROE': calculateHighROE,
  '低市盈率': calculateLowPE,
  '近期强势': calculateRecentStrong,
  '高成交量': calculateHighVolume
};

async function updateDynamicTags() {
  for (const [tagName, calculator] of Object.entries(tagCalculators)) {
    const qualifiedStocks = await calculator();
    await updateStockTags(tagName, qualifiedStocks);
  }
}
```

## 📊 成功指标 (KPIs)

### 1. 功能指标
- **标签覆盖率**: 每只股票平均拥有标签数 ≥ 5个
- **标签准确性**: 动态标签计算准确率 ≥ 99%
- **更新及时性**: 动态标签更新延迟 ≤ 24小时

### 2. 用户行为指标
- **标签点击率**: 个股详情页标签点击率 ≥ 15%
- **标签页停留时间**: 标签详情页平均停留时间 ≥ 2分钟
- **标签页跳出率**: 标签详情页跳出率 ≤ 60%

### 3. 业务指标
- **用户粘性**: 使用标签功能的用户，7日留存率提升 ≥ 20%
- **页面浏览量**: 标签相关页面PV占总PV比例 ≥ 25%
- **SEO效果**: 标签页面在搜索引擎的收录率 ≥ 90%

## 🚀 实施计划

### Phase 1: 基础架构 (第1周)
- [ ] 数据库表结构设计和创建
- [ ] 基础API端点开发
- [ ] 静态标签数据初始化
- [ ] 个股详情页标签展示组件

### Phase 2: 动态标签 (第2周)
- [ ] 动态标签计算逻辑开发
- [ ] GitHub Actions自动化脚本
- [ ] 标签详情页开发
- [ ] 标签管理后台界面

### Phase 3: 优化完善 (第3周)
- [ ] 性能优化和缓存策略
- [ ] 用户体验优化
- [ ] 数据质量监控
- [ ] 文档和测试完善

## 🔒 风险评估

### 技术风险
- **数据质量**: 第三方API数据不准确或延迟
  - **缓解措施**: 多数据源验证，异常数据告警
- **性能问题**: 大量标签计算影响系统性能
  - **缓解措施**: 异步处理，分批计算，结果缓存

### 产品风险
- **用户接受度**: 标签分类不符合用户认知
  - **缓解措施**: 用户调研，A/B测试，快速迭代
- **维护成本**: 标签规则需要持续优化
  - **缓解措施**: 自动化监控，规则配置化

## 📈 后续规划

### V1.1 增强功能
- 自定义标签创建
- 标签组合筛选
- 标签热度排行

### V2.0 高级功能
- AI智能标签推荐
- 标签相关性分析
- 个性化标签订阅

---

**文档版本**: V1.0  
**最后更新**: 2024年12月  
**审核状态**: 待审核  
**下一步行动**: 创建开发分支，开始Phase 1实施