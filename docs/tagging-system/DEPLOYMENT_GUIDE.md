# 标签系统部署指南

## 📋 部署概述

本指南详细说明了如何在生产环境中部署美股热力图项目的智能标签系统，包括数据库配置、环境变量设置、自动化流程部署和监控配置。

**目标环境**: Vercel + PostgreSQL (Supabase/Neon)  
**部署方式**: 自动化CI/CD  
**监控方案**: 内置健康检查 + 外部监控  

---

## 🗄️ 数据库部署

### 1. PostgreSQL数据库准备

#### 选择数据库服务商

**推荐选项**:
- **Supabase** (推荐): 免费额度充足，集成度高
- **Neon**: 无服务器PostgreSQL，按需付费
- **Railway**: 简单易用，适合小型项目
- **AWS RDS**: 企业级，需要更多配置

#### Supabase部署步骤

1. **创建项目**
   ```bash
   # 访问 https://supabase.com
   # 创建新项目，选择区域（建议选择离用户最近的区域）
   # 记录数据库连接信息
   ```

2. **获取连接信息**
   ```bash
   # 在Supabase Dashboard中获取以下信息：
   # - Database URL
   # - Direct Connection URL
   # - API URL
   # - API Keys
   ```

3. **执行数据库Schema**
   ```bash
   # 方法1: 使用Supabase SQL Editor
   # 复制 database-tagging-schema.sql 内容到SQL Editor执行
   
   # 方法2: 使用psql命令行
   psql "postgresql://postgres:[password]@[host]:5432/postgres" -f database-tagging-schema.sql
   
   # 方法3: 使用数据库管理工具
   # 如DBeaver、pgAdmin等，连接后执行SQL文件
   ```

### 2. 数据库连接配置

#### 连接字符串格式

```bash
# 标准PostgreSQL连接字符串
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Supabase连接字符串示例
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:password@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Neon连接字符串示例
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

#### 连接池配置

```javascript
// 在api/tags.js中的数据库配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲超时
  connectionTimeoutMillis: 2000, // 连接超时
});
```

---

## 🔧 环境变量配置

### 1. 必需环境变量

#### Vercel环境变量设置

```bash
# 数据库连接
DATABASE_URL="postgresql://username:password@host:port/database"

# Polygon API配置
POLYGON_API_KEY="your_polygon_api_key_here"
POLYGON_BASE_URL="https://api.polygon.io"

# 应用配置
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"

# 标签系统配置
TAG_UPDATE_ENABLED="true"
TAG_UPDATE_SCHEDULE="0 21 * * 1-5"  # 工作日21:00 UTC
MAX_STOCKS_PER_TAG="1000"
DEFAULT_TAG_RELEVANCE_THRESHOLD="0.1"

# 缓存配置
REDIS_URL="redis://username:password@host:port"  # 可选，用于缓存
CACHE_TTL_TAGS="3600"  # 标签缓存时间（秒）
CACHE_TTL_STOCKS="1800"  # 股票数据缓存时间（秒）

# 监控和日志
LOG_LEVEL="info"
HEALTH_CHECK_ENABLED="true"
MONITORING_WEBHOOK_URL="https://your-monitoring-service.com/webhook"  # 可选
```

#### 本地开发环境变量

创建 `.env.local` 文件：

```bash
# .env.local (本地开发)
DATABASE_URL="postgresql://localhost:5432/heatmap_dev"
POLYGON_API_KEY="your_dev_api_key"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TAG_UPDATE_ENABLED="false"  # 本地开发时禁用自动更新
LOG_LEVEL="debug"
```

### 2. Vercel部署配置

#### 在Vercel Dashboard中设置

1. **访问项目设置**
   ```
   Vercel Dashboard → 选择项目 → Settings → Environment Variables
   ```

2. **添加环境变量**
   ```bash
   # 逐个添加上述环境变量
   # 注意选择正确的环境（Production/Preview/Development）
   ```

3. **验证配置**
   ```bash
   # 部署后访问健康检查端点
   curl https://your-domain.vercel.app/api/health
   ```

---

## 🚀 应用部署

### 1. 代码部署流程

#### 自动部署（推荐）

```bash
# 1. 推送到主分支触发自动部署
git push origin main

# 2. 或者合并feature分支
git checkout main
git merge feature/tagging-system
git push origin main

# 3. Vercel自动检测变更并部署
# 查看部署状态：https://vercel.com/dashboard
```

#### 手动部署

```bash
# 使用Vercel CLI
npm install -g vercel
vercel login
vercel --prod

# 或者使用GitHub集成
# 在Vercel Dashboard中连接GitHub仓库
```

### 2. 部署验证

#### 健康检查

```bash
# 检查应用状态
curl https://your-domain.vercel.app/api/health

# 预期响应
{
  "status": "healthy",
  "timestamp": "2025-01-09T12:00:00Z",
  "database": "connected",
  "services": {
    "tags_api": "operational",
    "polygon_api": "operational"
  }
}
```

#### 功能测试

```bash
# 测试标签API
curl https://your-domain.vercel.app/api/tags

# 测试股票标签API
curl "https://your-domain.vercel.app/api/stocks/tags?ticker=AAPL"

# 测试标签详情页
curl "https://your-domain.vercel.app/api/tags/科技股"
```

---

## ⚙️ 自动化系统部署

### 1. GitHub Actions配置

#### 验证工作流文件

确保 `.github/workflows/update-tags.yml` 已正确配置：

```yaml
# 检查文件路径
ls -la .github/workflows/update-tags.yml

# 验证YAML语法
yaml-lint .github/workflows/update-tags.yml
```

#### 设置GitHub Secrets

在GitHub仓库中设置以下Secrets：

```bash
# GitHub Repository → Settings → Secrets and variables → Actions

# 必需的Secrets
DATABASE_URL          # 生产数据库连接字符串
POLYGON_API_KEY       # Polygon API密钥
MONITORING_WEBHOOK    # 监控通知Webhook（可选）
```

### 2. 定时任务配置

#### 时区和调度

```yaml
# 当前配置：美股交易日收盘后
schedule:
  - cron: '30 21 * * 1-5'  # UTC时间21:30，对应美东时间16:30

# 其他时区示例
# 北京时间早上6:00: '0 22 * * 0-4'
# 欧洲时间晚上10:00: '0 21 * * 1-5'
```

#### 手动触发测试

```bash
# 在GitHub Actions页面手动触发
# Repository → Actions → Update Dynamic Tags → Run workflow

# 或使用GitHub CLI
gh workflow run update-tags.yml
```

### 3. 监控和通知

#### 配置监控Webhook

```javascript
// 在update-dynamic-tags.js中的通知配置
const sendNotification = async (message, isError = false) => {
  if (!process.env.MONITORING_WEBHOOK_URL) return;
  
  try {
    await fetch(process.env.MONITORING_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `标签系统更新: ${message}`,
        level: isError ? 'error' : 'info',
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('发送通知失败:', error);
  }
};
```

---

## 📊 监控和维护

### 1. 应用监控

#### 健康检查端点

创建 `pages/api/health.js`：

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查数据库连接
    const dbResult = await pool.query('SELECT 1');
    const dbStatus = dbResult.rows.length > 0 ? 'connected' : 'disconnected';

    // 检查标签数据
    const tagsResult = await pool.query('SELECT COUNT(*) FROM tags WHERE is_active = true');
    const activeTagsCount = parseInt(tagsResult.rows[0].count);

    // 检查最近更新时间
    const updateResult = await pool.query(
      'SELECT MAX(updated_at) as last_update FROM tag_update_logs'
    );
    const lastUpdate = updateResult.rows[0]?.last_update;

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      services: {
        tags_api: 'operational',
        polygon_api: process.env.POLYGON_API_KEY ? 'configured' : 'not_configured'
      },
      metrics: {
        active_tags: activeTagsCount,
        last_update: lastUpdate
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}
```

#### 外部监控配置

```bash
# 使用Uptime Robot或类似服务监控
# 监控URL: https://your-domain.vercel.app/api/health
# 检查间隔: 5分钟
# 失败阈值: 连续3次失败
```

### 2. 日志和调试

#### Vercel日志查看

```bash
# 使用Vercel CLI查看日志
vercel logs

# 查看特定函数日志
vercel logs --follow

# 在Vercel Dashboard中查看
# Project → Functions → 选择函数 → View Logs
```

#### 数据库监控

```sql
-- 监控标签更新状态
SELECT 
  tag_name,
  update_type,
  stocks_affected,
  execution_time_ms,
  created_at
FROM tag_update_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- 检查标签分布
SELECT 
  t.category,
  t.type,
  COUNT(*) as tag_count,
  AVG(st.relevance_score) as avg_relevance
FROM tags t
LEFT JOIN stock_tags st ON t.id = st.tag_id
WHERE t.is_active = true
GROUP BY t.category, t.type;

-- 监控数据库性能
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE tablename IN ('tags', 'stock_tags', 'tag_update_logs');
```

### 3. 性能优化

#### 数据库优化

```sql
-- 定期分析表统计信息
ANALYZE tags;
ANALYZE stock_tags;
ANALYZE tag_update_logs;

-- 检查索引使用情况
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public';

-- 清理旧的更新日志（保留30天）
DELETE FROM tag_update_logs 
WHERE created_at < NOW() - INTERVAL '30 days';
```

#### 缓存策略

```javascript
// 在API中实现简单缓存
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}
```

---

## 🔄 更新和维护

### 1. 版本更新流程

#### 准备更新

```bash
# 1. 创建更新分支
git checkout -b update/tagging-system-v1.1

# 2. 进行必要的代码修改
# 3. 更新数据库Schema（如需要）
# 4. 更新文档

# 5. 测试更新
npm run test
npm run build

# 6. 提交更改
git add .
git commit -m "feat: 标签系统v1.1更新"
git push origin update/tagging-system-v1.1
```

#### 部署更新

```bash
# 1. 创建Pull Request
# 2. 代码审查
# 3. 合并到主分支
git checkout main
git merge update/tagging-system-v1.1
git push origin main

# 4. 验证部署
curl https://your-domain.vercel.app/api/health
```

### 2. 数据库迁移

#### 创建迁移脚本

```sql
-- migrations/001_add_tag_categories.sql
BEGIN;

-- 添加新的标签类别
ALTER TABLE tags ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50);

-- 创建新索引
CREATE INDEX IF NOT EXISTS idx_tags_subcategory ON tags(subcategory);

-- 更新现有数据
UPDATE tags SET subcategory = 'large_cap' WHERE name = '大盘股';
UPDATE tags SET subcategory = 'mid_cap' WHERE name = '中盘股';
UPDATE tags SET subcategory = 'small_cap' WHERE name = '小盘股';

COMMIT;
```

#### 执行迁移

```bash
# 在生产环境执行前，先在测试环境验证
psql $TEST_DATABASE_URL -f migrations/001_add_tag_categories.sql

# 确认无误后在生产环境执行
psql $DATABASE_URL -f migrations/001_add_tag_categories.sql
```

### 3. 备份和恢复

#### 数据备份

```bash
# 定期备份数据库
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 仅备份标签相关表
pg_dump $DATABASE_URL -t tags -t stock_tags -t tag_update_logs > tags_backup.sql

# 压缩备份文件
gzip backup_*.sql
```

#### 数据恢复

```bash
# 恢复完整数据库
psql $DATABASE_URL < backup_20250109_120000.sql

# 恢复特定表
psql $DATABASE_URL < tags_backup.sql
```

---

## 🚨 故障排除

### 1. 常见问题

#### 数据库连接问题

```bash
# 检查连接字符串
echo $DATABASE_URL

# 测试连接
psql $DATABASE_URL -c "SELECT version();"

# 检查SSL配置
psql "$DATABASE_URL?sslmode=require" -c "SELECT 1;"
```

#### API响应慢

```sql
-- 检查慢查询
SELECT 
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements 
WHERE mean_time > 1000
ORDER BY mean_time DESC;

-- 检查锁等待
SELECT 
  pid,
  usename,
  application_name,
  state,
  query
FROM pg_stat_activity 
WHERE state = 'active';
```

#### 标签更新失败

```bash
# 检查GitHub Actions日志
# Repository → Actions → 选择失败的运行 → 查看日志

# 手动运行更新脚本
node scripts/update-dynamic-tags.js

# 检查环境变量
echo $POLYGON_API_KEY
echo $DATABASE_URL
```

### 2. 紧急恢复

#### 回滚部署

```bash
# 在Vercel Dashboard中回滚
# Project → Deployments → 选择之前的部署 → Promote to Production

# 或使用Git回滚
git revert HEAD
git push origin main
```

#### 禁用自动更新

```bash
# 临时禁用GitHub Actions
# Repository → Settings → Actions → Disable Actions

# 或修改环境变量
# Vercel Dashboard → Settings → Environment Variables
# 设置 TAG_UPDATE_ENABLED=false
```

---

## 📞 支持和联系

### 技术支持

- **部署问题**: 查看Vercel文档或联系支持
- **数据库问题**: 查看Supabase/Neon文档
- **API问题**: 查看API文档或GitHub Issues

### 监控告警

- **健康检查失败**: 检查数据库连接和API状态
- **标签更新失败**: 查看GitHub Actions日志
- **性能问题**: 检查数据库查询和缓存状态

---

**最后更新**: 2025年1月9日  
**文档版本**: V1.0  
**维护团队**: 产品开发团队