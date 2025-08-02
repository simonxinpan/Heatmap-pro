# 📊 Neon数据库配置指南

## 🎯 概述
本项目需要连接到Neon PostgreSQL数据库以获取标普500股票数据。请按照以下步骤完成数据库配置。

## 🔧 配置步骤

### 1. 获取Neon数据库连接字符串
1. 访问您的Neon控制台：`https://console.neon.tech/app/org-old-tree-09570551/projects`
2. 选择包含标普500股票数据的项目
3. 在项目仪表板中找到连接字符串
4. 复制完整的PostgreSQL连接URL

### 2. 更新环境变量
编辑项目根目录下的 `.env` 文件，将 `DATABASE_URL` 替换为真实的连接字符串：

```env
# 示例格式（请替换为您的实际连接信息）
DATABASE_URL=postgresql://your_username:your_password@ep-xxx-xxx.us-east-1.aws.neon.tech/your_database?sslmode=require
```

### 3. 数据库表结构要求
确保您的Neon数据库包含以下表和字段：

#### stocks 表
```sql
CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL UNIQUE,
    name_zh VARCHAR(100),
    name_en VARCHAR(100),
    sector_zh VARCHAR(50),
    sector_en VARCHAR(50),
    market_cap BIGINT,
    change_percent DECIMAL(5,2),
    current_price DECIMAL(10,2),
    logo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. 初始化数据库（如果需要）
如果您的数据库还没有股票数据，可以运行项目中的 `database-setup.sql` 文件：

1. 在Neon控制台的SQL编辑器中
2. 复制并执行 `database-setup.sql` 中的所有SQL语句
3. 这将创建表结构并插入40+主要标普500股票的示例数据

### 5. 测试数据库连接
配置完成后，运行测试脚本验证连接：

```bash
node test-db-connection.js
```

成功连接后，您应该看到类似以下输出：
```
✅ 数据库连接成功！
✅ stocks表存在
📈 前10只股票数据:
1. AAPL - 苹果公司 (科技) - 市值: 2450.0B
2. MSFT - 微软 (科技) - 市值: 2200.0B
...
```

## 🚀 启动项目
数据库配置完成后，启动项目：

```bash
npm start
```

然后访问：
- 主页：`http://localhost:8000`
- 集成测试：`http://localhost:8000/integration-test.html`

## 🔍 故障排除

### 连接失败常见问题

1. **密码认证失败**
   - 检查用户名和密码是否正确
   - 确认连接字符串格式正确
   - 验证数据库是否允许外部连接

2. **数据库不存在**
   - 确认数据库名称拼写正确
   - 检查Neon项目是否已创建
   - 验证您有访问该数据库的权限

3. **网络连接问题**
   - 检查网络连接
   - 确认防火墙设置
   - 验证Neon服务状态

### API不可用时的备用方案
如果数据库连接失败，项目会自动使用内置的模拟数据，包含40+主要标普500股票，确保演示功能正常运行。

## 📞 技术支持
如果遇到配置问题，请检查：
1. Neon控制台中的连接信息
2. 网络连接状态
3. 数据库权限设置
4. 环境变量配置

---

**💡 提示**：配置完成后，所有股票点击都将跳转到外部详情页 `https://stock-details-final-gmguhh0c4-simon-pans-projects.vercel.app/?symbol={TICKER}`，实现完整的股票分析功能。