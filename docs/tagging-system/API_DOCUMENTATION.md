# 标签系统 API 接口文档

## 📋 文档概述

本文档详细描述了美股热力图项目中标签系统的所有API接口，包括请求参数、响应格式、错误处理和使用示例。

**版本**: V1.0  
**基础URL**: `https://your-domain.vercel.app/api`  
**认证方式**: 无需认证（公开API）  
**数据格式**: JSON  

---

## 🔗 接口列表

### 1. 标签相关接口

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 获取所有标签 | GET | `/tags` | 获取系统中所有可用标签 |
| 获取标签详情 | GET | `/tags/{tagName}` | 获取特定标签的详细信息和关联股票 |
| 获取标签统计 | GET | `/tags/{tagName}/stats` | 获取标签的统计信息 |

### 2. 股票标签接口

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 获取股票标签 | GET | `/stocks/tags` | 获取指定股票的所有标签 |
| 搜索带标签股票 | GET | `/stocks/search` | 根据标签搜索股票 |

---

## 📖 接口详细说明

### 1. 获取所有标签

#### 请求

```http
GET /api/tags
```

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `category` | string | 否 | `all` | 标签类别筛选 (`static`, `dynamic`, `custom`, `all`) |
| `include_stats` | boolean | 否 | `false` | 是否包含统计信息 |
| `active_only` | boolean | 否 | `true` | 是否只返回激活的标签 |
| `sort_by` | string | 否 | `sort_order` | 排序字段 (`name`, `sort_order`, `created_at`) |
| `sort_order` | string | 否 | `asc` | 排序方向 (`asc`, `desc`) |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": 1,
        "name": "科技股",
        "category": "static",
        "type": "sector",
        "description": "科技行业相关股票",
        "color": "#3b82f6",
        "is_active": true,
        "sort_order": 1,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "stats": {
          "total_stocks": 125,
          "avg_market_cap": 85000000000,
          "avg_change_percent": 0.015
        }
      },
      {
        "id": 2,
        "name": "52周新高",
        "category": "dynamic",
        "type": "performance",
        "description": "接近或达到52周最高价的股票",
        "color": "#10b981",
        "calculation_rule": "current_price >= 52_week_high * 0.95",
        "is_active": true,
        "sort_order": 10,
        "last_updated": "2025-01-09T21:30:00Z",
        "stats": {
          "total_stocks": 23,
          "avg_market_cap": 125000000000,
          "avg_change_percent": 0.045
        }
      }
    ],
    "meta": {
      "total_count": 15,
      "categories": {
        "static": 8,
        "dynamic": 6,
        "custom": 1
      }
    }
  }
}
```

---

### 2. 获取标签详情

#### 请求

```http
GET /api/tags/{tagName}
```

#### 路径参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `tagName` | string | 是 | 标签名称（URL编码） |

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `sort_by` | string | 否 | `relevance` | 排序字段 (`relevance`, `market_cap`, `change_percent`, `name`) |
| `sort_order` | string | 否 | `desc` | 排序方向 (`asc`, `desc`) |
| `page` | integer | 否 | `1` | 页码 |
| `page_size` | integer | 否 | `50` | 每页数量 (最大100) |
| `include_other_tags` | boolean | 否 | `false` | 是否包含股票的其他标签 |
| `min_relevance` | number | 否 | `0` | 最小相关度阈值 (0-1) |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "tag": {
      "id": 1,
      "name": "科技股",
      "category": "static",
      "type": "sector",
      "description": "科技行业相关股票，包括软件、硬件、互联网等细分领域",
      "color": "#3b82f6",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    "stocks": [
      {
        "id": 1,
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "name_zh": "苹果公司",
        "current_price": 150.25,
        "change_percent": 0.025,
        "change_amount": 3.75,
        "market_cap": 2500000000000,
        "volume": 45000000,
        "relevance_score": 1.0,
        "calculated_value": null,
        "sector": "Technology",
        "industry": "Consumer Electronics",
        "other_tags": [
          {
            "id": 5,
            "name": "大盘股",
            "category": "dynamic",
            "color": "#8b5cf6"
          },
          {
            "id": 12,
            "name": "标普500",
            "category": "static",
            "color": "#f59e0b"
          }
        ]
      },
      {
        "id": 2,
        "ticker": "MSFT",
        "name": "Microsoft Corporation",
        "name_zh": "微软公司",
        "current_price": 285.50,
        "change_percent": -0.012,
        "change_amount": -3.45,
        "market_cap": 2100000000000,
        "volume": 32000000,
        "relevance_score": 0.95,
        "calculated_value": null,
        "sector": "Technology",
        "industry": "Software",
        "other_tags": [
          {
            "id": 5,
            "name": "大盘股",
            "category": "dynamic",
            "color": "#8b5cf6"
          }
        ]
      }
    ],
    "statistics": {
      "total_stocks": 125,
      "avg_market_cap": 85000000000,
      "avg_change_percent": 0.015,
      "avg_relevance_score": 0.87,
      "sector_distribution": {
        "Technology": 45,
        "Communication Services": 25,
        "Consumer Discretionary": 30,
        "Healthcare": 25
      },
      "market_cap_distribution": {
        "large_cap": 85,
        "mid_cap": 30,
        "small_cap": 10
      }
    },
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "page_size": 50,
      "total_count": 125,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

### 3. 获取标签统计

#### 请求

```http
GET /api/tags/{tagName}/stats
```

#### 路径参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `tagName` | string | 是 | 标签名称（URL编码） |

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `period` | string | 否 | `1d` | 统计周期 (`1d`, `1w`, `1m`, `3m`, `1y`) |
| `include_history` | boolean | 否 | `false` | 是否包含历史趋势数据 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "tag": {
      "id": 1,
      "name": "科技股",
      "category": "static"
    },
    "current_stats": {
      "total_stocks": 125,
      "avg_market_cap": 85000000000,
      "avg_change_percent": 0.015,
      "avg_relevance_score": 0.87,
      "total_market_cap": 10625000000000,
      "best_performer": {
        "ticker": "NVDA",
        "change_percent": 0.085
      },
      "worst_performer": {
        "ticker": "META",
        "change_percent": -0.032
      }
    },
    "period_comparison": {
      "period": "1d",
      "previous_period": {
        "avg_change_percent": 0.008,
        "total_stocks": 123
      },
      "change": {
        "avg_change_percent": 0.007,
        "total_stocks": 2
      }
    },
    "history": [
      {
        "date": "2025-01-09",
        "total_stocks": 125,
        "avg_change_percent": 0.015,
        "avg_market_cap": 85000000000
      },
      {
        "date": "2025-01-08",
        "total_stocks": 123,
        "avg_change_percent": 0.008,
        "avg_market_cap": 84500000000
      }
    ]
  }
}
```

---

### 4. 获取股票标签

#### 请求

```http
GET /api/stocks/tags
```

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `id` | integer | 否 | - | 股票ID |
| `ticker` | string | 否 | - | 股票代码 |
| `category` | string | 否 | `all` | 标签类别筛选 |
| `min_relevance` | number | 否 | `0` | 最小相关度阈值 |
| `max_tags` | integer | 否 | `20` | 最大返回标签数量 |
| `sort_by` | string | 否 | `relevance` | 排序字段 (`relevance`, `name`, `category`) |

**注意**: `id` 和 `ticker` 参数至少需要提供一个。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "stock": {
      "id": 1,
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "name_zh": "苹果公司",
      "current_price": 150.25,
      "change_percent": 0.025,
      "market_cap": 2500000000000,
      "sector": "Technology",
      "industry": "Consumer Electronics"
    },
    "tags": [
      {
        "id": 1,
        "name": "科技股",
        "category": "static",
        "type": "sector",
        "description": "科技行业相关股票",
        "color": "#3b82f6",
        "relevance_score": 1.0,
        "calculated_value": null,
        "is_clickable": true
      },
      {
        "id": 5,
        "name": "大盘股",
        "category": "dynamic",
        "type": "market_cap",
        "description": "市值超过100亿美元的大型股票",
        "color": "#8b5cf6",
        "relevance_score": 1.0,
        "calculated_value": 2500000000000,
        "is_clickable": true
      },
      {
        "id": 8,
        "name": "近期强势",
        "category": "dynamic",
        "type": "performance",
        "description": "近30日涨幅超过10%的股票",
        "color": "#10b981",
        "relevance_score": 0.85,
        "calculated_value": 0.025,
        "is_clickable": true
      }
    ],
    "meta": {
      "total_tags": 8,
      "categories": {
        "static": 3,
        "dynamic": 5
      }
    }
  }
}
```

---

### 5. 搜索带标签股票

#### 请求

```http
GET /api/stocks/search
```

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `tags` | string | 是 | - | 标签名称，多个用逗号分隔 |
| `operator` | string | 否 | `AND` | 标签组合逻辑 (`AND`, `OR`) |
| `sort_by` | string | 否 | `market_cap` | 排序字段 |
| `sort_order` | string | 否 | `desc` | 排序方向 |
| `page` | integer | 否 | `1` | 页码 |
| `page_size` | integer | 否 | `20` | 每页数量 |
| `min_market_cap` | number | 否 | - | 最小市值筛选 |
| `max_market_cap` | number | 否 | - | 最大市值筛选 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "query": {
      "tags": ["科技股", "大盘股"],
      "operator": "AND",
      "filters": {
        "min_market_cap": 10000000000
      }
    },
    "stocks": [
      {
        "id": 1,
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "name_zh": "苹果公司",
        "current_price": 150.25,
        "change_percent": 0.025,
        "market_cap": 2500000000000,
        "matched_tags": [
          {
            "id": 1,
            "name": "科技股",
            "relevance_score": 1.0
          },
          {
            "id": 5,
            "name": "大盘股",
            "relevance_score": 1.0
          }
        ],
        "total_relevance_score": 2.0
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "page_size": 20,
      "total_count": 95,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

## ❌ 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "用户友好的错误信息",
    "details": "详细的技术错误信息",
    "timestamp": "2025-01-09T12:00:00Z",
    "request_id": "req_123456789"
  }
}
```

### 常见错误代码

| 错误代码 | HTTP状态码 | 描述 | 解决方案 |
|----------|------------|------|----------|
| `TAG_NOT_FOUND` | 404 | 指定的标签不存在 | 检查标签名称是否正确 |
| `STOCK_NOT_FOUND` | 404 | 指定的股票不存在 | 检查股票ID或代码是否正确 |
| `INVALID_PARAMETER` | 400 | 请求参数无效 | 检查参数格式和取值范围 |
| `MISSING_PARAMETER` | 400 | 缺少必需参数 | 提供所有必需的请求参数 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 | 降低请求频率或联系管理员 |
| `DATABASE_ERROR` | 500 | 数据库连接错误 | 稍后重试或联系技术支持 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 | 稍后重试或联系技术支持 |

### 错误示例

#### 标签不存在

```json
{
  "success": false,
  "error": {
    "code": "TAG_NOT_FOUND",
    "message": "指定的标签不存在",
    "details": "Tag 'invalid-tag' was not found in the database",
    "timestamp": "2025-01-09T12:00:00Z",
    "request_id": "req_123456789"
  }
}
```

#### 参数验证失败

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "请求参数无效",
    "details": "Parameter 'page_size' must be between 1 and 100, got 150",
    "timestamp": "2025-01-09T12:00:00Z",
    "request_id": "req_123456789"
  }
}
```

---

## 🔧 使用示例

### JavaScript/Node.js

```javascript
// 获取所有标签
async function getAllTags() {
  try {
    const response = await fetch('/api/tags?include_stats=true');
    const data = await response.json();
    
    if (data.success) {
      console.log('标签列表:', data.data.tags);
      return data.data.tags;
    } else {
      console.error('获取标签失败:', data.error.message);
    }
  } catch (error) {
    console.error('网络错误:', error);
  }
}

// 获取股票标签
async function getStockTags(ticker) {
  try {
    const response = await fetch(`/api/stocks/tags?ticker=${ticker}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data.tags;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('获取股票标签失败:', error);
    return [];
  }
}

// 搜索带特定标签的股票
async function searchStocksByTags(tags, options = {}) {
  const params = new URLSearchParams({
    tags: tags.join(','),
    operator: options.operator || 'AND',
    sort_by: options.sortBy || 'market_cap',
    sort_order: options.sortOrder || 'desc',
    page: options.page || 1,
    page_size: options.pageSize || 20
  });
  
  try {
    const response = await fetch(`/api/stocks/search?${params}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('搜索股票失败:', error);
    return { stocks: [], pagination: null };
  }
}
```

### React组件示例

```jsx
import React, { useState, useEffect } from 'react';

function TaggedStocksList({ tagName }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchTaggedStocks();
  }, [tagName, page]);

  const fetchTaggedStocks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/tags/${encodeURIComponent(tagName)}?page=${page}&page_size=20`
      );
      const data = await response.json();
      
      if (data.success) {
        setStocks(data.data.stocks);
        setPagination(data.data.pagination);
      } else {
        setError(data.error.message);
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h2>标签: {tagName}</h2>
      <div className="stocks-grid">
        {stocks.map(stock => (
          <div key={stock.id} className="stock-card">
            <h3>{stock.ticker}</h3>
            <p>{stock.name_zh || stock.name}</p>
            <p>价格: ${stock.current_price}</p>
            <p className={stock.change_percent > 0 ? 'positive' : 'negative'}>
              {(stock.change_percent * 100).toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
      
      {pagination && (
        <div className="pagination">
          <button 
            disabled={!pagination.has_prev}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </button>
          <span>第 {pagination.current_page} 页，共 {pagination.total_pages} 页</span>
          <button 
            disabled={!pagination.has_next}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
```

### cURL示例

```bash
# 获取所有标签
curl -X GET "https://your-domain.vercel.app/api/tags?include_stats=true" \
  -H "Accept: application/json"

# 获取特定标签的股票
curl -X GET "https://your-domain.vercel.app/api/tags/%E7%A7%91%E6%8A%80%E8%82%A1?page=1&page_size=10" \
  -H "Accept: application/json"

# 获取股票的标签
curl -X GET "https://your-domain.vercel.app/api/stocks/tags?ticker=AAPL" \
  -H "Accept: application/json"

# 搜索带多个标签的股票
curl -X GET "https://your-domain.vercel.app/api/stocks/search?tags=%E7%A7%91%E6%8A%80%E8%82%A1,%E5%A4%A7%E7%9B%98%E8%82%A1&operator=AND" \
  -H "Accept: application/json"
```

---

## 📊 性能考虑

### 缓存策略

1. **标签列表缓存**: 静态标签列表缓存24小时
2. **股票标签缓存**: 股票标签关联缓存1小时
3. **统计数据缓存**: 标签统计数据缓存30分钟
4. **搜索结果缓存**: 常见搜索结果缓存15分钟

### 分页建议

- 默认页面大小: 20-50条记录
- 最大页面大小: 100条记录
- 大数据集使用游标分页

### 请求频率限制

- 每个IP每分钟最多60次请求
- 每个IP每小时最多1000次请求
- 超出限制返回429状态码

---

## 🔄 版本更新

### V1.1 (计划中)

- 添加标签订阅功能
- 支持自定义标签创建
- 增加标签推荐API

### V1.2 (计划中)

- 实时标签更新WebSocket
- 标签分析和洞察API
- 多语言标签支持

---

## 📞 技术支持

如有API使用问题，请通过以下方式联系：

- **文档问题**: 查看技术架构文档
- **Bug报告**: 提交GitHub Issue
- **功能建议**: 联系产品团队

---

**最后更新**: 2025年1月9日  
**文档版本**: V1.0