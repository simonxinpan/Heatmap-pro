# 标签系统技术架构文档

## 📋 文档概述

本文档详细描述了美股热力图项目中智能标签系统的技术架构设计、实现方案和部署指南。

**版本**: V1.0  
**创建日期**: 2025年1月  
**负责人**: PM-Core  
**状态**: 开发完成，待部署  

---

## 🏗️ 系统架构概览

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    前端展示层 (Frontend)                      │
├─────────────────────────────────────────────────────────────┤
│  TagCloud组件  │  标签详情页  │  热力图集成  │  搜索筛选      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API服务层 (API Layer)                    │
├─────────────────────────────────────────────────────────────┤
│  /api/tags.js   │  获取标签信息  │  标签统计  │  股票关联     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   业务逻辑层 (Business Logic)                 │
├─────────────────────────────────────────────────────────────┤
│  标签计算引擎  │  相关度算法  │  缓存管理  │  数据验证       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据存储层 (Data Layer)                    │
├─────────────────────────────────────────────────────────────┤
│   Neon PostgreSQL   │   标签表   │   关联表   │   日志表     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   自动化层 (Automation)                       │
├─────────────────────────────────────────────────────────────┤
│  GitHub Actions  │  定时更新  │  数据同步  │  监控告警       │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

1. **前端组件**
   - `TagCloud.js`: 标签云展示组件
   - `[tagName].js`: 动态标签详情页
   - 响应式CSS样式系统

2. **后端API**
   - `api/tags.js`: 标签系统核心API
   - RESTful接口设计
   - 错误处理和性能优化

3. **数据库设计**
   - `tags`: 标签定义表
   - `stock_tags`: 股票标签关联表
   - `tag_update_logs`: 更新日志表

4. **自动化脚本**
   - `update-dynamic-tags.js`: 动态标签更新脚本
   - GitHub Actions工作流

---

## 🗄️ 数据库设计

### 表结构设计

#### 1. tags 表（标签定义）

```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- 'static', 'dynamic', 'custom'
    type VARCHAR(50), -- 'sector', 'index', 'performance', 'financial'
    description TEXT,
    color VARCHAR(7), -- HEX颜色代码
    calculation_rule TEXT, -- 动态标签的计算规则
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. stock_tags 表（股票标签关联）

```sql
CREATE TABLE stock_tags (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    relevance_score DECIMAL(3,2) DEFAULT 1.0, -- 相关度评分 0-1
    calculated_value DECIMAL(15,4), -- 计算得出的数值
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_id, tag_id)
);
```

#### 3. tag_update_logs 表（更新日志）

```sql
CREATE TABLE tag_update_logs (
    id SERIAL PRIMARY KEY,
    tag_id INTEGER,
    update_type VARCHAR(50), -- 'create', 'update', 'delete'
    affected_stocks_count INTEGER,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 索引优化

```sql
-- 性能优化索引
CREATE INDEX idx_stock_tags_stock_id ON stock_tags(stock_id);
CREATE INDEX idx_stock_tags_tag_id ON stock_tags(tag_id);
CREATE INDEX idx_stock_tags_relevance ON stock_tags(relevance_score DESC);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_active ON tags(is_active);
```

---

## 🔧 API设计规范

### 接口列表

#### 1. 获取股票标签
```
GET /api/stocks/tags?id={stock_id}&ticker={ticker}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "stock": {
      "id": 1,
      "ticker": "AAPL",
      "name": "Apple Inc."
    },
    "tags": [
      {
        "id": 1,
        "name": "科技股",
        "category": "static",
        "color": "#3b82f6",
        "relevance_score": 1.0
      }
    ]
  }
}
```

#### 2. 获取标签详情
```
GET /api/tags/{tagName}?sort_by=relevance&sort_order=desc&page=1&page_size=50
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "tag": {
      "id": 1,
      "name": "科技股",
      "description": "科技行业相关股票",
      "category": "static"
    },
    "stocks": [
      {
        "id": 1,
        "ticker": "AAPL",
        "name_zh": "苹果公司",
        "current_price": 150.25,
        "change_percent": 0.025,
        "market_cap": 2500000000000,
        "relevance_score": 1.0
      }
    ],
    "statistics": {
      "total_stocks": 125,
      "avg_market_cap": 85000000000,
      "avg_change_percent": 0.015
    },
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

#### 3. 获取所有标签
```
GET /api/tags?category=all&include_stats=true
```

### 错误处理

```json
{
  "success": false,
  "error": {
    "code": "TAG_NOT_FOUND",
    "message": "指定的标签不存在",
    "details": "Tag 'invalid-tag' was not found in the database"
  }
}
```

---

## 🎨 前端组件设计

### TagCloud 组件

#### 属性接口

```typescript
interface TagCloudProps {
  stockId?: number;
  ticker?: string;
  tags?: Tag[];
  maxTags?: number;
  showCategory?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

interface Tag {
  id: number;
  name: string;
  category: 'static' | 'dynamic' | 'custom';
  type?: string;
  color?: string;
  relevance_score?: number;
  calculated_value?: number;
  description?: string;
}
```

#### 使用示例

```jsx
// 基础用法
<TagCloud stockId={123} maxTags={10} />

// 自定义样式
<TagCloud 
  ticker="AAPL" 
  size="large" 
  showCategory={true}
  className="custom-tag-cloud"
/>

// 预设配置
<TagCloud 
  {...TAG_PRESETS.stockDetail}
  stockId={123}
/>
```

### 标签详情页组件

#### 功能特性

- **双视图模式**: 列表视图和热力图视图
- **多维排序**: 按相关度、市值、涨跌幅排序
- **分页加载**: 支持大量股票数据的分页展示
- **响应式设计**: 适配移动端和桌面端
- **SEO优化**: 服务端渲染支持

---

## 🤖 自动化系统

### 动态标签更新流程

```mermaid
graph TD
    A[GitHub Actions 触发] --> B[检查环境变量]
    B --> C[连接数据库]
    C --> D[获取动态标签列表]
    D --> E[遍历标签计算器]
    E --> F[调用Polygon API]
    F --> G[计算标签相关度]
    G --> H[更新数据库]
    H --> I[记录更新日志]
    I --> J[发送通知]
    J --> K[清理资源]
```

### 标签计算器

#### 1. 52周新高计算器

```javascript
async function calculate52WeekHigh(tag) {
  // 获取过去252个交易日的价格数据
  // 计算当前价格与52周最高价的比率
  // 筛选出接近或达到52周新高的股票
  // 返回符合条件的股票列表
}
```

#### 2. 高ROE计算器

```javascript
async function calculateHighROE(tag) {
  // 从财务数据API获取ROE数据
  // 设定ROE阈值（如>15%）
  // 计算相关度评分
  // 返回高ROE股票列表
}
```

### GitHub Actions 配置

#### 触发条件

- **定时触发**: 每日美股收盘后（UTC 21:30）
- **手动触发**: 支持workflow_dispatch
- **代码推送**: 标签相关代码更新时

#### 环境变量

```yaml
env:
  NEON_DATABASE_URL: ${{ secrets.NEON_DATABASE_URL }}
  POLYGON_API_KEY: ${{ secrets.POLYGON_API_KEY }}
  NODE_ENV: production
```

---

## 🚀 部署指南

### 1. 数据库部署

```bash
# 1. 连接到Neon数据库
psql $NEON_DATABASE_URL

# 2. 执行数据库schema
\i database-tagging-schema.sql

# 3. 验证表创建
\dt
```

### 2. 环境配置

```bash
# GitHub Secrets 配置
NEON_DATABASE_URL=postgresql://username:password@host/database
POLYGON_API_KEY=your_polygon_api_key
```

### 3. 依赖安装

```bash
# 安装Node.js依赖
npm install pg node-fetch dotenv

# 验证依赖
node -e "console.log('Dependencies installed successfully')"
```

### 4. 功能测试

```bash
# 测试数据库连接
node test-db-connection.js

# 测试标签API
curl http://localhost:3000/api/tags

# 测试标签更新脚本
node scripts/update-dynamic-tags.js
```

### 5. 生产部署

```bash
# 部署到Vercel
vercel --prod

# 验证部署
curl https://your-domain.vercel.app/api/tags
```

---

## 📊 性能优化

### 数据库优化

1. **索引策略**
   - 为高频查询字段创建复合索引
   - 定期分析查询计划并优化

2. **查询优化**
   - 使用JOIN代替多次查询
   - 实现查询结果缓存

3. **数据分页**
   - 限制单次查询返回的记录数
   - 使用游标分页提升性能

### 前端优化

1. **组件懒加载**
   - 标签云组件按需加载
   - 图片和大型组件延迟渲染

2. **缓存策略**
   - API响应缓存
   - 组件状态缓存

3. **代码分割**
   - 按路由分割代码
   - 动态导入非关键组件

### API优化

1. **响应压缩**
   - 启用gzip压缩
   - 优化JSON响应结构

2. **请求合并**
   - 批量API请求
   - GraphQL查询优化

---

## 🔍 监控与维护

### 关键指标监控

1. **性能指标**
   - API响应时间
   - 数据库查询性能
   - 页面加载速度

2. **业务指标**
   - 标签使用频率
   - 用户点击率
   - 页面停留时间

3. **系统指标**
   - 错误率
   - 可用性
   - 资源使用率

### 日志管理

```javascript
// 结构化日志示例
const log = {
  timestamp: new Date().toISOString(),
  level: 'INFO',
  service: 'tagging-system',
  action: 'update_dynamic_tags',
  tag_id: 123,
  affected_stocks: 45,
  execution_time: 1250,
  success: true
};
```

### 故障处理

1. **自动重试机制**
   - API调用失败重试
   - 数据库连接重试

2. **降级策略**
   - 缓存数据回退
   - 静态标签优先显示

3. **告警机制**
   - 关键错误实时通知
   - 性能异常监控

---

## 🔮 未来扩展

### 短期规划（1-3个月）

1. **标签推荐算法**
   - 基于用户行为的个性化标签推荐
   - 协同过滤算法实现

2. **标签分析工具**
   - 标签效果分析仪表板
   - A/B测试框架

### 中期规划（3-6个月）

1. **机器学习集成**
   - 自动标签生成
   - 智能相关度计算

2. **多语言支持**
   - 国际化标签系统
   - 多语言标签翻译

### 长期规划（6-12个月）

1. **实时标签更新**
   - WebSocket实时数据推送
   - 流式数据处理

2. **标签生态系统**
   - 用户自定义标签
   - 社区标签分享

---

## 📚 参考资料

- [PostgreSQL官方文档](https://www.postgresql.org/docs/)
- [Next.js官方指南](https://nextjs.org/docs)
- [Polygon API文档](https://polygon.io/docs)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Vercel部署指南](https://vercel.com/docs)

---

**文档维护**: 本文档将随着系统迭代持续更新，请关注版本变更记录。