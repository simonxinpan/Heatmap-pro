# Polygon API 配置指南

## 🎯 为什么选择 Polygon API？

Polygon API 是专业级的金融数据提供商，相比其他免费API具有以下优势：

- ✅ **数据质量更高**：提供准确的实时股价数据
- ✅ **延迟更低**：数据更新更及时
- ✅ **覆盖面广**：支持美股、期权、外汇等多种金融产品
- ✅ **稳定性强**：企业级API服务，可靠性高

## 🔑 获取 Polygon API 密钥

### 步骤 1：注册账户
1. 访问 [Polygon.io](https://polygon.io)
2. 点击 "Sign Up" 注册免费账户
3. 验证邮箱地址

### 步骤 2：获取 API 密钥
1. 登录后进入 [Dashboard](https://polygon.io/dashboard)
2. 在左侧菜单中找到 "API Keys"
3. 复制您的 API 密钥（格式类似：`your_polygon_api_key_here`）

### 步骤 3：了解免费版限制
- **请求限制**：每分钟 5 次请求
- **数据延迟**：15分钟延迟（免费版）
- **历史数据**：2年历史数据访问

## ⚙️ 在 Vercel 中配置

### 方法 1：通过 Vercel Dashboard
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的 `heatmap-pro` 项目
3. 进入 "Settings" → "Environment Variables"
4. 添加新的环境变量：
   - **Name**: `POLYGON_API_KEY`
   - **Value**: 您的 Polygon API 密钥
5. 点击 "Save" 保存
6. 重新部署项目以使配置生效

### 方法 2：通过 Vercel CLI
```bash
# 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 登录 Vercel
vercel login

# 在项目目录中设置环境变量
vercel env add POLYGON_API_KEY
# 输入您的 API 密钥

# 重新部署
vercel --prod
```

## 🧪 测试 API 配置

### 手动测试 API 密钥
```bash
# 测试 Polygon API 是否工作
curl "https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apikey=YOUR_API_KEY"
```

成功响应示例：
```json
{
  "ticker": "AAPL",
  "queryCount": 1,
  "resultsCount": 1,
  "adjusted": true,
  "results": [
    {
      "T": "AAPL",
      "v": 73645891,
      "vw": 150.0123,
      "o": 149.31,
      "c": 150.47,
      "h": 151.07,
      "l": 148.56,
      "t": 1640995200000,
      "n": 645365
    }
  ],
  "status": "OK",
  "request_id": "abc123"
}
```

### 验证热力图数据更新
1. **手动触发更新**：
   ```bash
   curl -X POST \
     -H "Authorization: Bearer your-cron-secret" \
     -H "Content-Type: application/json" \
     "https://heatmap-mq9xnw5rw-simon-pans-projects.vercel.app/api/update-stocks"
   ```

2. **检查 GitHub Actions 日志**：
   - 进入 GitHub 仓库的 "Actions" 标签页
   - 手动触发 "Update Stock Market Data" 工作流
   - 查看日志中是否显示 "🔥 Using Polygon API for stock quotes..."

3. **验证前端数据**：
   - 访问热力图页面
   - 打开浏览器开发者工具
   - 检查网络请求中 `/api/stocks` 的响应
   - 确认 `change_percent` 字段有实际数据

## 🔄 自动更新机制

配置完成后，系统将按以下流程自动更新：

1. **定时触发**：GitHub Actions 在美股交易时间自动运行
   - 开盘前：美东时间 9:00 AM（北京时间 22:00）
   - 收盘后：美东时间 4:30 PM（北京时间 5:30）

2. **数据获取**：优先使用 Polygon API 获取最新股价
   - 如果 Polygon API 失败，自动切换到 Finnhub API
   - 批量处理，避免超出API限制

3. **数据库更新**：将最新数据写入 Neon 数据库
   - 更新 `last_price`、`change_amount`、`change_percent` 字段
   - 记录 `last_updated` 时间戳

4. **前端展示**：热力图自动反映最新的涨跌幅变化
   - 绿色：上涨股票
   - 红色：下跌股票
   - 颜色深浅：涨跌幅大小

## 🚨 故障排除

### 常见问题

**Q: API 密钥无效**
```
A: 检查以下几点：
1. 确认 API 密钥复制完整，没有多余空格
2. 确认账户状态正常，没有被暂停
3. 检查 Vercel 环境变量配置是否正确
```

**Q: 请求超出限制**
```
A: Polygon 免费版每分钟限制 5 次请求：
1. 系统已内置 12 秒延迟机制
2. 如果股票数量过多，考虑升级到付费版
3. 或者依赖 Finnhub API 作为备用
```

**Q: 数据更新不及时**
```
A: 免费版有 15 分钟延迟：
1. 这是 Polygon 免费版的限制
2. 升级到付费版可获得实时数据
3. 对于热力图展示，15分钟延迟通常可接受
```

### 调试步骤

1. **检查环境变量**：
   ```bash
   # 在 Vercel 项目设置中确认
   POLYGON_API_KEY=your_actual_api_key
   ```

2. **查看 GitHub Actions 日志**：
   - 寻找 "🔥 Using Polygon API" 或错误信息
   - 确认 API 调用是否成功

3. **检查数据库**：
   - 登录 Neon 控制台
   - 查询 `stocks` 表的 `last_updated` 字段
   - 确认数据是否在更新

## 🎉 配置完成

配置成功后，您的热力图将：
- ✅ 自动获取高质量的实时股价数据
- ✅ 定时更新，无需手动干预
- ✅ 智能切换API，确保数据可靠性
- ✅ 实时反映市场涨跌变化

**现在您的股票热力图已经具备了专业级的实时数据更新能力！** 🚀