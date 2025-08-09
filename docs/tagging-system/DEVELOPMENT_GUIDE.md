# 标签系统开发指南

## 📋 开发概述

本指南为开发者提供了美股热力图项目中智能标签系统的完整开发指导，包括本地环境搭建、代码结构说明、开发流程、测试方法和贡献指南。

**技术栈**: Next.js + PostgreSQL + Node.js  
**开发环境**: Node.js 18+ + PostgreSQL 14+  
**代码规范**: ESLint + Prettier  

---

## 🛠️ 开发环境搭建

### 1. 前置要求

#### 系统要求

```bash
# Node.js版本要求
node --version  # >= 18.0.0
npm --version   # >= 8.0.0

# 或使用yarn
yarn --version  # >= 1.22.0

# PostgreSQL版本要求
psql --version  # >= 14.0
```

#### 必需工具

```bash
# 安装必需的全局工具
npm install -g vercel
npm install -g @vercel/cli

# 可选：数据库管理工具
# - DBeaver (推荐)
# - pgAdmin
# - TablePlus
```

### 2. 项目克隆和安装

#### 克隆仓库

```bash
# 克隆项目
git clone https://github.com/your-username/heatmap-pro.git
cd heatmap-pro

# 切换到标签系统分支（如果需要）
git checkout feature/tagging-system
```

#### 安装依赖

```bash
# 使用npm
npm install

# 或使用yarn
yarn install

# 检查依赖是否正确安装
npm list --depth=0
```

### 3. 本地数据库配置

#### 方案1: 本地PostgreSQL

```bash
# 安装PostgreSQL（macOS）
brew install postgresql
brew services start postgresql

# 安装PostgreSQL（Ubuntu）
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# 安装PostgreSQL（Windows）
# 下载并安装：https://www.postgresql.org/download/windows/

# 创建开发数据库
psql postgres
CREATE DATABASE heatmap_dev;
CREATE USER heatmap_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE heatmap_dev TO heatmap_user;
\q
```

#### 方案2: Docker PostgreSQL

```bash
# 创建docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: heatmap_dev
      POSTGRES_USER: heatmap_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database-tagging-schema.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:
EOF

# 启动数据库
docker-compose up -d

# 检查状态
docker-compose ps
```

#### 方案3: 云数据库（推荐）

```bash
# 使用Supabase免费层
# 1. 访问 https://supabase.com
# 2. 创建新项目
# 3. 获取连接字符串
# 4. 在SQL Editor中执行database-tagging-schema.sql
```

### 4. 环境变量配置

#### 创建环境文件

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
vim .env.local
```

#### 环境变量配置

```bash
# .env.local
# 数据库配置
DATABASE_URL="postgresql://heatmap_user:dev_password@localhost:5432/heatmap_dev"

# API配置
POLYGON_API_KEY="your_polygon_api_key_here"
POLYGON_BASE_URL="https://api.polygon.io"

# 应用配置
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 标签系统配置
TAG_UPDATE_ENABLED="false"  # 开发环境禁用自动更新
MAX_STOCKS_PER_TAG="100"    # 开发环境限制数据量
DEFAULT_TAG_RELEVANCE_THRESHOLD="0.1"

# 日志配置
LOG_LEVEL="debug"
HEALTH_CHECK_ENABLED="true"

# 缓存配置（可选）
# REDIS_URL="redis://localhost:6379"
CACHE_TTL_TAGS="300"     # 5分钟缓存
CACHE_TTL_STOCKS="180"   # 3分钟缓存
```

### 5. 数据库初始化

#### 执行Schema

```bash
# 方法1: 使用psql
psql $DATABASE_URL -f database-tagging-schema.sql

# 方法2: 使用Node.js脚本
node -e "
  const { Pool } = require('pg');
  const fs = require('fs');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = fs.readFileSync('database-tagging-schema.sql', 'utf8');
  pool.query(sql).then(() => {
    console.log('数据库初始化完成');
    process.exit(0);
  }).catch(console.error);
"
```

#### 验证数据库

```bash
# 检查表是否创建成功
psql $DATABASE_URL -c "\dt"

# 检查初始数据
psql $DATABASE_URL -c "SELECT COUNT(*) FROM tags;"
psql $DATABASE_URL -c "SELECT name, category FROM tags LIMIT 5;"
```

---

## 📁 代码结构说明

### 1. 项目目录结构

```
heatmap-pro/
├── docs/tagging-system/          # 标签系统文档
│   ├── TAGGING_SYSTEM_PRD.md     # 产品需求文档
│   ├── TECHNICAL_ARCHITECTURE.md # 技术架构文档
│   ├── API_DOCUMENTATION.md      # API接口文档
│   ├── DEPLOYMENT_GUIDE.md       # 部署指南
│   └── DEVELOPMENT_GUIDE.md      # 开发指南（本文档）
├── api/                          # API路由
│   └── tags.js                   # 标签系统API
├── components/                   # React组件
│   ├── TagCloud.js               # 标签云组件
│   └── TagCloud.module.css       # 标签云样式
├── pages/                        # Next.js页面
│   ├── api/                      # API端点
│   │   ├── health.js             # 健康检查
│   │   ├── tags/                 # 标签相关API
│   │   └── stocks/               # 股票相关API
│   └── tags/                     # 标签页面
│       └── [tagName].js          # 动态标签详情页
├── scripts/                      # 脚本文件
│   └── update-dynamic-tags.js    # 动态标签更新脚本
├── styles/                       # 样式文件
│   └── TagDetail.module.css      # 标签详情页样式
├── .github/workflows/            # GitHub Actions
│   └── update-tags.yml           # 标签更新工作流
├── database-tagging-schema.sql   # 数据库Schema
├── package.json                  # 项目依赖
├── .env.local                    # 本地环境变量
└── README.md                     # 项目说明
```

### 2. 核心模块说明

#### API模块 (`api/tags.js`)

```javascript
// 主要功能
- getStockTags(stockId/ticker)     // 获取股票标签
- getTagStocks(tagName, options)   // 获取标签下的股票
- getAllTags(filters)              // 获取所有标签
- getTagStatistics(tagName)        // 获取标签统计

// 数据库连接
- PostgreSQL连接池管理
- 查询优化和缓存
- 错误处理和日志记录
```

#### 组件模块 (`components/TagCloud.js`)

```javascript
// 主要功能
- 标签云展示
- 标签分类和颜色管理
- 相关度可视化
- 响应式设计

// 状态管理
- 加载状态
- 错误处理
- 数据缓存
```

#### 页面模块 (`pages/tags/[tagName].js`)

```javascript
// 主要功能
- 动态路由处理
- 服务端渲染(SSR)
- 数据预取和缓存
- SEO优化

// 视图模式
- 列表视图
- 热力图视图
- 分页和排序
```

#### 脚本模块 (`scripts/update-dynamic-tags.js`)

```javascript
// 主要功能
- 动态标签计算
- 批量数据更新
- 错误恢复机制
- 性能监控

// 标签计算器
- 52周新高/新低
- 市值分类
- 性能指标
- 行业分析
```

---

## 🔧 开发流程

### 1. 功能开发流程

#### 创建功能分支

```bash
# 从主分支创建功能分支
git checkout main
git pull origin main
git checkout -b feature/new-tag-feature

# 分支命名规范
# feature/功能名称
# bugfix/问题描述
# hotfix/紧急修复
# docs/文档更新
```

#### 开发步骤

```bash
# 1. 分析需求
# - 阅读PRD文档
# - 理解技术架构
# - 确定实现方案

# 2. 设计数据库变更（如需要）
# - 创建迁移脚本
# - 更新Schema文档
# - 测试数据兼容性

# 3. 实现API接口
# - 编写API函数
# - 添加参数验证
# - 实现错误处理

# 4. 开发前端组件
# - 创建React组件
# - 编写样式文件
# - 实现交互逻辑

# 5. 编写测试
# - 单元测试
# - 集成测试
# - 端到端测试

# 6. 更新文档
# - API文档
# - 组件文档
# - 使用说明
```

### 2. 本地开发和测试

#### 启动开发服务器

```bash
# 启动Next.js开发服务器
npm run dev
# 或
yarn dev

# 访问应用
open http://localhost:3000

# 查看开发日志
# 终端会显示请求日志和错误信息
```

#### API测试

```bash
# 测试健康检查
curl http://localhost:3000/api/health

# 测试标签API
curl http://localhost:3000/api/tags

# 测试股票标签API
curl "http://localhost:3000/api/stocks/tags?ticker=AAPL"

# 测试标签详情API
curl "http://localhost:3000/api/tags/科技股"
```

#### 数据库测试

```bash
# 手动运行标签更新脚本
node scripts/update-dynamic-tags.js

# 检查数据更新
psql $DATABASE_URL -c "SELECT * FROM tag_update_logs ORDER BY created_at DESC LIMIT 5;"

# 验证标签数据
psql $DATABASE_URL -c "SELECT t.name, COUNT(st.stock_id) as stock_count FROM tags t LEFT JOIN stock_tags st ON t.id = st.tag_id GROUP BY t.id, t.name;"
```

### 3. 代码质量检查

#### 代码格式化

```bash
# 安装代码格式化工具
npm install --save-dev eslint prettier

# 运行ESLint检查
npm run lint

# 自动修复格式问题
npm run lint:fix

# 运行Prettier格式化
npm run format
```

#### 代码审查清单

```markdown
## 代码审查清单

### 功能性
- [ ] 功能按需求正确实现
- [ ] 边界条件处理完善
- [ ] 错误处理机制完整
- [ ] 性能表现符合预期

### 代码质量
- [ ] 代码结构清晰合理
- [ ] 变量和函数命名规范
- [ ] 注释充分且准确
- [ ] 无重复代码

### 安全性
- [ ] 输入参数验证
- [ ] SQL注入防护
- [ ] 敏感信息保护
- [ ] 权限控制正确

### 兼容性
- [ ] 浏览器兼容性
- [ ] 移动端适配
- [ ] 数据库兼容性
- [ ] API向后兼容
```

---

## 🧪 测试指南

### 1. 测试环境配置

#### 安装测试工具

```bash
# 安装测试依赖
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev supertest

# 配置Jest
cat > jest.config.js << EOF
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './'
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1'
  },
  testEnvironment: 'jest-environment-jsdom'
}

module.exports = createJestConfig(customJestConfig)
EOF

# 创建Jest设置文件
cat > jest.setup.js << EOF
import '@testing-library/jest-dom'
EOF
```

### 2. 单元测试

#### API函数测试

```javascript
// __tests__/api/tags.test.js
import { getStockTags, getAllTags } from '../../api/tags';
import { Pool } from 'pg';

// Mock数据库连接
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn()
  }))
}));

describe('Tags API', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = new Pool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockTags', () => {
    it('应该返回股票的标签列表', async () => {
      // 模拟数据库返回
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: '科技股',
            category: 'static',
            relevance_score: 1.0
          }
        ]
      });

      const result = await getStockTags('AAPL');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('科技股');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['AAPL'])
      );
    });

    it('应该处理股票不存在的情况', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getStockTags('INVALID');
      
      expect(result).toHaveLength(0);
    });

    it('应该处理数据库错误', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(getStockTags('AAPL')).rejects.toThrow('Database error');
    });
  });

  describe('getAllTags', () => {
    it('应该返回所有激活的标签', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { id: 1, name: '科技股', category: 'static' },
          { id: 2, name: '52周新高', category: 'dynamic' }
        ]
      });

      const result = await getAllTags();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('科技股');
      expect(result[1].name).toBe('52周新高');
    });

    it('应该支持类别筛选', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, name: '科技股', category: 'static' }]
      });

      const result = await getAllTags({ category: 'static' });
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['static'])
      );
    });
  });
});
```

#### 组件测试

```javascript
// __tests__/components/TagCloud.test.js
import { render, screen, waitFor } from '@testing-library/react';
import TagCloud from '../../components/TagCloud';

// Mock fetch
global.fetch = jest.fn();

describe('TagCloud组件', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('应该正确渲染标签云', async () => {
    // Mock API响应
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          tags: [
            {
              id: 1,
              name: '科技股',
              category: 'static',
              color: '#3b82f6',
              relevance_score: 1.0
            },
            {
              id: 2,
              name: '52周新高',
              category: 'dynamic',
              color: '#10b981',
              relevance_score: 0.8
            }
          ]
        }
      })
    });

    render(<TagCloud stockId={1} />);

    // 检查加载状态
    expect(screen.getByText('加载中...')).toBeInTheDocument();

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.getByText('科技股')).toBeInTheDocument();
      expect(screen.getByText('52周新高')).toBeInTheDocument();
    });

    // 检查标签样式
    const techTag = screen.getByText('科技股');
    expect(techTag).toHaveClass('tag', 'static');
  });

  it('应该处理API错误', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<TagCloud stockId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    });
  });

  it('应该处理空数据', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { tags: [] }
      })
    });

    render(<TagCloud stockId={1} />);

    await waitFor(() => {
      expect(screen.getByText('暂无标签')).toBeInTheDocument();
    });
  });
});
```

### 3. 集成测试

#### API端点测试

```javascript
// __tests__/api/integration.test.js
import request from 'supertest';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const app = next({ dev: false });
const handle = app.getRequestHandler();

describe('API集成测试', () => {
  let server;

  beforeAll(async () => {
    await app.prepare();
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
  });

  afterAll(() => {
    server.close();
  });

  describe('/api/health', () => {
    it('应该返回健康状态', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('/api/tags', () => {
    it('应该返回标签列表', async () => {
      const response = await request(server)
        .get('/api/tags')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('tags');
      expect(Array.isArray(response.body.data.tags)).toBe(true);
    });

    it('应该支持类别筛选', async () => {
      const response = await request(server)
        .get('/api/tags?category=static')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.tags.forEach(tag => {
        expect(tag.category).toBe('static');
      });
    });
  });

  describe('/api/stocks/tags', () => {
    it('应该返回股票标签', async () => {
      const response = await request(server)
        .get('/api/stocks/tags?ticker=AAPL')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('stock');
      expect(response.body.data).toHaveProperty('tags');
    });

    it('应该处理无效股票代码', async () => {
      const response = await request(server)
        .get('/api/stocks/tags?ticker=INVALID')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.code).toBe('STOCK_NOT_FOUND');
    });
  });
});
```

### 4. 端到端测试

#### Playwright配置

```bash
# 安装Playwright
npm install --save-dev @playwright/test

# 初始化Playwright
npx playwright install
```

```javascript
// playwright.config.js
module.exports = {
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
};
```

#### E2E测试用例

```javascript
// e2e/tagging-system.spec.js
import { test, expect } from '@playwright/test';

test.describe('标签系统E2E测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示股票标签云', async ({ page }) => {
    // 点击某个股票进入详情页
    await page.click('[data-testid="stock-AAPL"]');
    
    // 等待标签云加载
    await page.waitForSelector('[data-testid="tag-cloud"]');
    
    // 检查标签是否显示
    const tags = await page.locator('.tag').count();
    expect(tags).toBeGreaterThan(0);
    
    // 检查标签分类
    const staticTags = await page.locator('.tag.static').count();
    const dynamicTags = await page.locator('.tag.dynamic').count();
    expect(staticTags + dynamicTags).toBe(tags);
  });

  test('应该支持标签详情页导航', async ({ page }) => {
    // 进入股票详情页
    await page.goto('/stocks/AAPL');
    
    // 点击标签
    await page.click('[data-testid="tag-科技股"]');
    
    // 检查是否跳转到标签详情页
    await expect(page).toHaveURL('/tags/科技股');
    
    // 检查页面内容
    await expect(page.locator('h1')).toContainText('科技股');
    
    // 检查股票列表
    const stocks = await page.locator('[data-testid="stock-item"]').count();
    expect(stocks).toBeGreaterThan(0);
  });

  test('应该支持视图切换', async ({ page }) => {
    await page.goto('/tags/科技股');
    
    // 默认列表视图
    await expect(page.locator('[data-testid="list-view"]')).toBeVisible();
    
    // 切换到热力图视图
    await page.click('[data-testid="heatmap-view-button"]');
    await expect(page.locator('[data-testid="heatmap-view"]')).toBeVisible();
    
    // 切换回列表视图
    await page.click('[data-testid="list-view-button"]');
    await expect(page.locator('[data-testid="list-view"]')).toBeVisible();
  });

  test('应该支持排序和分页', async ({ page }) => {
    await page.goto('/tags/科技股');
    
    // 测试排序
    await page.selectOption('[data-testid="sort-select"]', 'market_cap');
    await page.waitForLoadState('networkidle');
    
    // 检查排序结果
    const firstStock = await page.locator('[data-testid="stock-item"]').first();
    const firstMarketCap = await firstStock.locator('[data-testid="market-cap"]').textContent();
    
    // 测试分页
    if (await page.locator('[data-testid="next-page"]').isVisible()) {
      await page.click('[data-testid="next-page"]');
      await page.waitForLoadState('networkidle');
      
      // 检查URL变化
      expect(page.url()).toContain('page=2');
    }
  });
});
```

### 5. 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行E2E测试
npm run test:e2e

# 生成测试覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

---

## 🤝 贡献指南

### 1. 贡献流程

#### 提交Issue

```markdown
## Bug报告模板

### 问题描述
简要描述遇到的问题

### 复现步骤
1. 访问页面...
2. 点击按钮...
3. 观察到错误...

### 预期行为
描述期望的正确行为

### 实际行为
描述实际发生的行为

### 环境信息
- 浏览器: Chrome 120
- 操作系统: macOS 14
- Node.js版本: 18.17.0

### 附加信息
- 错误截图
- 控制台日志
- 网络请求信息
```

```markdown
## 功能请求模板

### 功能描述
详细描述建议的新功能

### 使用场景
说明什么情况下需要这个功能

### 解决方案
描述你认为的实现方案

### 替代方案
描述其他可能的解决方案

### 优先级
- [ ] 高（影响核心功能）
- [ ] 中（改善用户体验）
- [ ] 低（锦上添花）
```

#### 提交Pull Request

```bash
# 1. Fork仓库
# 在GitHub上点击Fork按钮

# 2. 克隆你的Fork
git clone https://github.com/your-username/heatmap-pro.git
cd heatmap-pro

# 3. 添加上游仓库
git remote add upstream https://github.com/original-owner/heatmap-pro.git

# 4. 创建功能分支
git checkout -b feature/your-feature-name

# 5. 进行开发
# ... 编写代码 ...

# 6. 提交更改
git add .
git commit -m "feat: 添加新的标签功能"

# 7. 推送到你的Fork
git push origin feature/your-feature-name

# 8. 创建Pull Request
# 在GitHub上创建PR
```

### 2. 代码规范

#### 提交信息规范

```bash
# 提交信息格式
<type>(<scope>): <subject>

<body>

<footer>

# 类型说明
feat:     新功能
fix:      Bug修复
docs:     文档更新
style:    代码格式调整
refactor: 代码重构
test:     测试相关
chore:    构建过程或辅助工具的变动

# 示例
feat(tags): 添加标签搜索功能

- 实现标签名称模糊搜索
- 支持多标签组合查询
- 添加搜索结果高亮显示

Closes #123
```

#### 代码风格

```javascript
// 1. 使用ES6+语法
const getData = async () => {
  try {
    const response = await fetch('/api/tags');
    return await response.json();
  } catch (error) {
    console.error('获取数据失败:', error);
    throw error;
  }
};

// 2. 使用解构赋值
const { tags, pagination } = data;

// 3. 使用模板字符串
const message = `找到 ${count} 个标签`;

// 4. 使用箭头函数
const filterTags = (tags, category) => 
  tags.filter(tag => tag.category === category);

// 5. 适当的注释
/**
 * 计算标签相关度评分
 * @param {Object} stock - 股票信息
 * @param {Object} tag - 标签信息
 * @returns {number} 相关度评分 (0-1)
 */
function calculateRelevanceScore(stock, tag) {
  // 实现计算逻辑
}
```

### 3. 文档贡献

#### 文档更新流程

```bash
# 1. 更新相关文档
# - API变更 → 更新API_DOCUMENTATION.md
# - 新功能 → 更新TAGGING_SYSTEM_PRD.md
# - 部署变更 → 更新DEPLOYMENT_GUIDE.md
# - 开发流程 → 更新DEVELOPMENT_GUIDE.md

# 2. 检查文档格式
markdown-lint docs/tagging-system/*.md

# 3. 预览文档
# 使用Markdown预览工具检查格式

# 4. 提交文档更改
git add docs/
git commit -m "docs: 更新标签系统API文档"
```

#### 文档写作规范

```markdown
# 文档结构规范

## 1. 标题层级
# 一级标题 - 文档主题
## 二级标题 - 主要章节
### 三级标题 - 子章节
#### 四级标题 - 具体内容

## 2. 代码块
```javascript
// 使用语言标识符
const example = 'code';
```

## 3. 链接格式
[链接文本](URL)
[内部链接](#章节标题)

## 4. 表格格式
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |

## 5. 列表格式
- 无序列表项
  - 子项
1. 有序列表项
   1. 子项
```

---

## 🔍 调试技巧

### 1. 常见问题排查

#### 数据库连接问题

```bash
# 检查环境变量
echo $DATABASE_URL

# 测试数据库连接
psql $DATABASE_URL -c "SELECT version();"

# 检查数据库表
psql $DATABASE_URL -c "\dt"

# 查看连接数
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

#### API响应问题

```bash
# 检查API端点
curl -v http://localhost:3000/api/health

# 查看详细错误信息
curl -H "Accept: application/json" http://localhost:3000/api/tags

# 检查请求头
curl -H "Content-Type: application/json" -X POST http://localhost:3000/api/tags
```

#### 前端组件问题

```javascript
// 在组件中添加调试日志
const TagCloud = ({ stockId }) => {
  const [tags, setTags] = useState([]);
  
  useEffect(() => {
    console.log('TagCloud mounted, stockId:', stockId);
    fetchTags();
  }, [stockId]);
  
  const fetchTags = async () => {
    try {
      console.log('Fetching tags for stock:', stockId);
      const response = await fetch(`/api/stocks/tags?id=${stockId}`);
      const data = await response.json();
      console.log('Tags data received:', data);
      setTags(data.data.tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };
  
  // ...
};
```

### 2. 性能调试

#### 数据库查询优化

```sql
-- 启用查询计划分析
EXPLAIN ANALYZE SELECT 
  t.name,
  t.category,
  st.relevance_score
FROM tags t
JOIN stock_tags st ON t.id = st.tag_id
WHERE st.stock_id = 1;

-- 检查慢查询
SELECT 
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements 
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- 检查索引使用情况
SELECT 
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public';
```

#### 前端性能监控

```javascript
// 使用Performance API
const measureApiCall = async (apiCall) => {
  const start = performance.now();
  try {
    const result = await apiCall();
    const end = performance.now();
    console.log(`API调用耗时: ${end - start}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.error(`API调用失败，耗时: ${end - start}ms`, error);
    throw error;
  }
};

// 使用React DevTools Profiler
import { Profiler } from 'react';

const onRenderCallback = (id, phase, actualDuration) => {
  console.log('组件渲染性能:', {
    id,
    phase,
    actualDuration
  });
};

<Profiler id="TagCloud" onRender={onRenderCallback}>
  <TagCloud stockId={stockId} />
</Profiler>
```

### 3. 调试工具

#### 浏览器开发者工具

```javascript
// 在代码中设置断点
debugger;

// 使用console.table显示数据
console.table(tags);

// 使用console.group组织日志
console.group('标签数据处理');
console.log('原始数据:', rawData);
console.log('处理后数据:', processedData);
console.groupEnd();

// 使用console.time测量性能
console.time('数据处理');
// ... 处理逻辑 ...
console.timeEnd('数据处理');
```

#### VS Code调试配置

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Next.js: debug client-side",
      "type": "pwa-chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

---

## 📚 学习资源

### 1. 技术文档

- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev/learn
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Vercel**: https://vercel.com/docs

### 2. 最佳实践

- **API设计**: RESTful API设计指南
- **数据库设计**: PostgreSQL性能优化
- **前端性能**: React性能优化技巧
- **测试策略**: 前端测试最佳实践

### 3. 社区资源

- **GitHub Issues**: 查看已知问题和解决方案
- **Stack Overflow**: 技术问题讨论
- **Discord/Slack**: 实时技术交流

---

**最后更新**: 2025年1月9日  
**文档版本**: V1.0  
**维护团队**: 开发团队