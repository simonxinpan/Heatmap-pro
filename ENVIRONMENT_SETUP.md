# 环境变量配置指南

为了让热力图自动更新功能正常工作，您需要在 Vercel 项目中配置以下环境变量：

## 必需的环境变量

### 1. 数据库连接
- **NEON_DATABASE_URL**: 您的 Neon 数据库连接字符串
  - 格式: `postgresql://username:password@host/database?sslmode=require`
  - 在 Neon 控制台的 "Connection Details" 中获取

### 2. API 密钥
- **FINNHUB_API_KEY**: Finnhub API 密钥
  - 在 [Finnhub.io](https://finnhub.io) 注册并获取免费 API 密钥
  - 免费版本每分钟限制 60 次请求

- **POLYGON_API_KEY** (推荐): Polygon API 密钥
  - 在 [Polygon.io](https://polygon.io) 注册并获取 API 密钥
  - **强烈推荐使用**：支持更高的请求频率和更好的性能
  - 免费版本每分钟 5 次请求，付费版本无限制
  - 使用grouped daily API获取前一交易日的完整市场数据
  - 支持批量获取502只股票数据，显著提升加载速度

### 3. 安全认证
- **CRON_SECRET**: GitHub Actions 认证密钥
  - 生成一个随机字符串作为密钥（建议 32 位以上）
  - 例如: `your-super-secret-cron-key-12345`

## Vercel 环境变量配置步骤

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的 `heatmap-pro` 项目
3. 进入 "Settings" → "Environment Variables"
4. 添加以下环境变量：

```
NEON_DATABASE_URL=postgresql://username:password@host/database?sslmode=require
FINNHUB_API_KEY=your_finnhub_api_key
CRON_SECRET=your-super-secret-cron-key-12345
```

5. 点击 "Save" 保存配置
6. 重新部署项目以使环境变量生效

## GitHub Secrets 配置

为了让 GitHub Actions 能够调用更新 API，您还需要在 GitHub 仓库中配置 Secret：

1. 进入您的 GitHub 仓库
2. 点击 "Settings" → "Secrets and variables" → "Actions"
3. 点击 "New repository secret"
4. 添加以下 Secret：
   - **Name**: `CRON_SECRET`
   - **Value**: 与 Vercel 中配置的 `CRON_SECRET` 相同的值

## 验证配置

配置完成后，您可以通过以下方式验证：

1. **手动触发更新**:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer your-cron-secret" \
     -H "Content-Type: application/json" \
     "https://your-project.vercel.app/api/update-stocks"
   ```

2. **检查 GitHub Actions**:
   - 进入仓库的 "Actions" 标签页
   - 手动触发 "Update Stock Market Data" 工作流
   - 查看执行日志确认是否成功

3. **验证数据更新**:
   - 访问您的热力图页面
   - 检查股票数据是否包含最新的涨跌幅信息
   - 观察颜色是否根据涨跌幅正确变化

## 自动更新时间表

系统将在以下时间自动更新股票数据：
- **美东时间 9:00 AM** (北京时间 22:00) - 开盘前更新
- **美东时间 4:30 PM** (北京时间 5:30) - 收盘后更新
- 仅在工作日 (周一至周五) 运行

## 故障排除

如果遇到问题，请检查：
1. 所有环境变量是否正确配置
2. API 密钥是否有效且未超出使用限制
3. Neon 数据库连接是否正常
4. GitHub Actions 日志中的错误信息

## API 使用限制

- **Finnhub 免费版**: 每分钟 60 次请求
- **Polygon 免费版**: 每分钟 5 次请求
- 系统已内置请求限制和重试机制

配置完成后，您的热力图将自动获取最新的股票数据并实时更新颜色变化！