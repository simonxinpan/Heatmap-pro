# 🤖 GitHub Actions 自动数据更新配置指南

## 📋 概述

本项目使用 GitHub Actions 实现热力图和个股详情页数据的自动定时更新，确保股票信息实时同步，热力图颜色动态调整。

## 🚀 功能特性

- ⏰ **定时更新**: 每5分钟自动获取最新股票数据
- 🔄 **智能缓存**: 自动刷新API缓存，确保数据实时性
- 📊 **批量处理**: 一次性更新50+只主要股票数据
- 🛡️ **错误处理**: 完善的错误处理和重试机制
- 📈 **实时反馈**: 详细的执行日志和状态报告
- 🎨 **动态渲染**: 热力图颜色根据股价变化实时调整

## 📁 文件结构

```
Heatmap-pro/
├── .github/
│   └── workflows/
│       └── update_heatmap.yml     # GitHub Actions 工作流配置
├── api/
│   ├── stocks.js                  # 股票数据API（已优化缓存）
│   ├── refresh-data.js            # 数据刷新API端点
│   └── update-stocks.js           # 股票数据更新脚本
└── GITHUB_ACTIONS_SETUP.md        # 本配置指南
```

## ⚙️ 配置步骤

### 1. 环境变量配置

在 GitHub 仓库中设置以下 Secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret" 添加以下变量：

```bash
# 数据库连接字符串（Neon PostgreSQL）
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Finnhub API密钥
FINNHUB_API_KEY=your_finnhub_api_key_here
```

### 2. 工作流配置说明

#### 触发条件
- **定时触发**: 每5分钟执行一次 (`cron: '*/5 * * * *'`)
- **手动触发**: 支持在 Actions 页面手动运行

#### 执行步骤
1. **环境准备**: 检出代码，设置 Node.js 环境
2. **依赖安装**: 安装项目依赖包
3. **数据刷新**: 调用 `/api/refresh-data` 更新股票数据
4. **缓存刷新**: 清除并刷新 API 缓存
5. **状态报告**: 输出执行结果和统计信息

## 🔧 API 端点说明

### `/api/refresh-data`
- **功能**: 批量更新所有股票的实时数据
- **方法**: GET
- **响应**: JSON格式的更新统计和结果

```json
{
  "success": true,
  "message": "数据刷新完成",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration": "2500ms",
  "statistics": {
    "total": 50,
    "success": 48,
    "failed": 2,
    "successRate": "96.0%"
  }
}
```

### `/api/stocks?refresh=true`
- **功能**: 强制刷新股票数据缓存
- **方法**: GET
- **参数**: `refresh=true` 强制刷新缓存

## 📊 监控和日志

### 查看执行状态
1. 进入 GitHub 仓库
2. 点击 "Actions" 标签页
3. 选择 "Update Heatmap Data" 工作流
4. 查看最近的执行记录和详细日志

### 日志示例
```
🔄 触发热力图数据刷新...
📊 API响应状态: 200
📋 响应内容: {"success":true,"statistics":{"success":48,"failed":2}}
✅ 数据刷新成功
🔄 刷新股票API缓存...
💾 缓存刷新完成
✅ 热力图数据更新任务完成
📊 股票数据已更新
🔄 Vercel缓存已刷新
⏰ 下次更新时间: 2024-01-15 10:35:00
```

## 🎯 效果验证

### 前端验证
1. 打开热力图页面: `https://heatmap-pro.vercel.app`
2. 观察股票方块的颜色变化（绿色=上涨，红色=下跌）
3. 点击任意股票进入详情页
4. 验证股价、涨跌幅等数据是否为最新

### API验证
```bash
# 检查股票数据API
curl "https://heatmap-pro.vercel.app/api/stocks"

# 手动触发数据刷新
curl "https://heatmap-pro.vercel.app/api/refresh-data"

# 强制刷新缓存
curl "https://heatmap-pro.vercel.app/api/stocks?refresh=true"
```

## 🔍 故障排除

### 常见问题

1. **工作流执行失败**
   - 检查 Secrets 配置是否正确
   - 验证 API 密钥是否有效
   - 查看详细错误日志

2. **数据更新不及时**
   - 确认工作流是否正常运行
   - 检查 API 限制和配额
   - 验证缓存刷新是否生效

3. **部分股票数据缺失**
   - 检查 Finnhub API 的股票代码支持
   - 查看 API 调用频率限制
   - 验证数据库连接状态

### 手动测试
```bash
# 本地测试数据刷新
node api/refresh-data.js

# 测试数据库连接
node test-db-connection.js
```

## 📈 性能优化

- **批量处理**: 每批处理10只股票，避免API限制
- **智能缓存**: 5分钟缓存机制，减少不必要的API调用
- **错误重试**: 自动重试失败的请求
- **资源控制**: 合理的延迟和并发控制

## 🔮 未来扩展

- [ ] 支持更多股票交易所（港股、A股等）
- [ ] 添加技术指标计算（RSI、MACD等）
- [ ] 实现WebSocket实时推送
- [ ] 增加邮件/Slack通知功能
- [ ] 支持自定义更新频率

---

**注意**: GitHub Actions 对公共仓库提供免费的运行时间，私有仓库有一定限制。请根据实际需求合理设置更新频率。