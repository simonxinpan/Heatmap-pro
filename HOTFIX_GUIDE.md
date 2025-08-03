# 🚨 热力图显示不全问题 - 紧急修复指南

## 问题诊断

根据您提供的错误日志，问题的根本原因是：

```
❌ Stocks API Error: column "last_price" does not exist
```

**核心问题**：您的 Neon 数据库中的 `stocks` 表缺少新增的字段，导致 API 查询失败，前端只能使用模拟数据。

## 🔧 立即修复步骤

### 步骤 1：更新数据库表结构

1. **登录 Neon 控制台**：
   - 访问 [https://console.neon.tech/](https://console.neon.tech/)
   - 进入您的项目

2. **打开 SQL Editor**：
   - 点击左侧菜单的 "SQL Editor"

3. **执行迁移脚本**：
   - 复制并粘贴以下 SQL 命令：
   
   ```sql
   -- 为现有表添加缺失字段（安全操作）
   ALTER TABLE stocks 
   ADD COLUMN IF NOT EXISTS last_price NUMERIC(10, 2),
   ADD COLUMN IF NOT EXISTS change_amount NUMERIC(10, 2),
   ADD COLUMN IF NOT EXISTS change_percent DECIMAL(8,4),
   ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;
   
   -- 验证字段已成功添加
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'stocks' 
   AND column_name IN ('last_price', 'change_amount', 'change_percent', 'last_updated');
   ```

4. **点击 "Run" 执行**

### 步骤 2：触发数据更新

1. **手动运行 GitHub Action**：
   - 进入您的 GitHub 仓库：`https://github.com/your-username/Heatmap-pro`
   - 点击 "Actions" 标签页
   - 找到 "Update Stock Market Data" 工作流
   - 点击 "Run workflow" → "Run workflow"

2. **或者直接调用 API**（如果您已配置环境变量）：
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     "https://heatmap-dzyhxqw8d-simon-pans-projects.vercel.app/api/update-stocks"
   ```

### 步骤 3：验证修复结果

1. **等待 2-3 分钟**让数据更新完成

2. **刷新热力图页面**：
   - 访问：`https://heatmap-dzyhxqw8d-simon-pans-projects.vercel.app/`
   - 按 `Ctrl+F5` 强制刷新

3. **检查控制台**：
   - 应该不再看到 "API不可用，使用模拟数据" 的消息
   - 应该显示接近 502 只股票

## 🔍 问题原因分析

### 为什么会出现这个问题？

1. **代码与数据库不同步**：
   - 新的 `/api/stocks.js` 代码期望数据库有 `last_price` 等字段
   - 但您的 Neon 数据库还是旧的表结构

2. **错误处理机制**：
   - 当 API 查询失败时，前端自动切换到模拟数据
   - 模拟数据只包含少量股票，所以显示不全

### 数据流程图

```
前端请求 → /api/stocks → 查询数据库 → 找不到字段 → 返回500错误 → 前端使用模拟数据
```

修复后：
```
前端请求 → /api/stocks → 查询数据库 → 成功返回502只股票 → 前端显示完整热力图
```

## 📋 验证清单

- [ ] 数据库表结构已更新（包含 `last_price`, `change_amount`, `change_percent`, `last_updated` 字段）
- [ ] GitHub Action 已成功运行
- [ ] 热力图页面显示接近 502 只股票
- [ ] 控制台没有 API 错误信息
- [ ] 股票颜色根据涨跌幅正确变化

## 🆘 如果仍有问题

### 检查环境变量

确保 Vercel 项目中配置了：
- `NEON_DATABASE_URL`
- `FINNHUB_API_KEY`
- `CRON_SECRET`

### 查看详细日志

1. **Vercel 日志**：
   - 进入 Vercel Dashboard
   - 查看 Functions 标签页的实时日志

2. **GitHub Actions 日志**：
   - 查看工作流运行的详细输出

### 联系支持

如果问题持续存在，请提供：
- Vercel 函数日志截图
- GitHub Actions 运行日志
- 数据库查询结果截图

---

**预期结果**：修复完成后，您的热力图将显示完整的 502 只股票，并且数据会自动更新！