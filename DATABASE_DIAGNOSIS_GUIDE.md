# 🔍 数据库诊断与修复指南

## 🚨 问题确认

根据错误日志：`❌ Stocks API Error: column "last_price" does not exist`

**问题根源**：后端API代码期望的数据库表结构与实际的Neon数据库表结构不匹配。

## 📋 第一步：数据库表结构诊断

### 1.1 登录Neon控制台
1. 访问 [Neon Console](https://console.neon.tech)
2. 选择与Vercel项目关联的正确项目
3. 点击左侧的 **"SQL Editor"**

### 1.2 运行诊断命令

**请复制并运行以下SQL命令来检查当前表结构：**

```sql
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'stocks'
ORDER BY 
    ordinal_position;
```

### 1.3 检查结果

**必须包含的字段：**
- ✅ `ticker` (VARCHAR)
- ✅ `name_zh` (VARCHAR)
- ✅ `sector_zh` (VARCHAR)
- ✅ `market_cap` (BIGINT)
- ✅ `change_percent` (NUMERIC)
- ✅ `logo` (TEXT)
- ❓ `last_price` (NUMERIC) - **可能缺失**
- ❓ `change_amount` (NUMERIC) - **可能缺失**
- ❓ `last_updated` (TIMESTAMPTZ) - **可能缺失**

**如果缺少 `last_price`、`change_amount`、`last_updated` 字段，请继续第二步。**

## 🛠️ 第二步：修复数据库表结构

### 2.1 执行ALTER TABLE命令

**在同一个SQL Editor中，复制并运行以下命令：**

```sql
-- 添加缺失的字段
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS last_price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS change_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;

-- 确保change_percent字段有足够精度
ALTER TABLE stocks 
ALTER COLUMN change_percent TYPE NUMERIC(8, 4);
```

### 2.2 验证修复结果

**再次运行诊断命令确认字段已添加：**

```sql
SELECT 
    column_name, 
    data_type
FROM 
    information_schema.columns 
WHERE 
    table_name = 'stocks'
    AND column_name IN ('last_price', 'change_amount', 'last_updated')
ORDER BY 
    column_name;
```

**期望结果：**
```
column_name    | data_type
---------------|-----------
change_amount  | numeric
last_price     | numeric
last_updated   | timestamp with time zone
```

## 🔄 第三步：重新部署和数据更新

### 3.1 Vercel重新部署

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择 `heatmap-pro` 项目
3. 进入 "Deployments" 页面
4. 找到最新部署，点击 `...` 菜单
5. 选择 **"Redeploy"**
6. **取消勾选** "Use existing Build Cache"
7. 点击红色的 "Redeploy" 按钮

### 3.2 触发数据更新

**方法1：手动触发GitHub Action**
1. 访问GitHub仓库的 "Actions" 页面
2. 选择 "Update Stock Market Data" 工作流
3. 点击 "Run workflow" 按钮
4. 选择分支并运行

**方法2：API调用测试**
```bash
curl -X POST \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json" \
  "https://heatmap-mq9xnw5rw-simon-pans-projects.vercel.app/api/update-stocks"
```

## 🧪 第四步：验证修复效果

### 4.1 检查API响应

访问：`https://heatmap-mq9xnw5rw-simon-pans-projects.vercel.app/api/stocks`

**成功的响应应该包含：**
```json
[
  {
    "ticker": "AAPL",
    "name_zh": "苹果公司",
    "sector_zh": "科技",
    "market_cap": 3000000000000,
    "change_percent": 1.25,
    "logo": "..."
  }
]
```

### 4.2 检查热力图页面

1. 访问热力图页面
2. 按 `F12` 打开开发者工具
3. 查看 "Console" 标签页
4. 刷新页面 (`Ctrl+F5`)
5. 确认没有数据库错误信息

### 4.3 验证股票数量

热力图应该显示接近502只股票，而不是少量的模拟数据。

## 🚨 故障排除

### 问题1：ALTER TABLE命令失败

**可能原因：**
- 权限不足
- 语法错误
- 表被锁定

**解决方案：**
```sql
-- 检查表是否存在
SELECT table_name FROM information_schema.tables WHERE table_name = 'stocks';

-- 检查当前用户权限
SELECT current_user, session_user;
```

### 问题2：Vercel环境变量不匹配

**检查步骤：**
1. 在Neon控制台复制正确的连接字符串
2. 在Vercel项目设置中验证 `NEON_DATABASE_URL`
3. 确保连接字符串完全一致

### 问题3：数据更新失败

**检查GitHub Actions日志：**
1. 查看工作流执行状态
2. 检查API调用是否成功
3. 验证环境变量配置

## ✅ 成功标志

修复成功后，您应该看到：

1. ✅ **数据库诊断**：`stocks` 表包含所有必需字段
2. ✅ **API响应**：`/api/stocks` 返回完整股票列表
3. ✅ **前端显示**：热力图显示所有502只股票
4. ✅ **实时更新**：GitHub Actions成功执行
5. ✅ **无错误日志**：Vercel日志中没有数据库错误

---

**请按照这个指南逐步执行，并在每个步骤完成后告诉我结果。我们一定能彻底解决这个问题！** 🎯