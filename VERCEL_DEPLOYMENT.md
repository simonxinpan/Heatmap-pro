# Vercel 部署配置指南

## 问题诊断

您的 Vercel 部署无法连接数据库的原因是：

1. **配置问题**：原 `vercel.json` 使用了 `@vercel/static` 构建器，只能部署静态文件，无法运行 Node.js API
2. **环境变量缺失**：Vercel 项目中未配置数据库连接环境变量
3. **Secret 引用错误**：`vercel.json` 中使用了 `@database_url` 语法引用不存在的 secret

### 最新错误解决

**错误信息 1**：`Environment Variable "DATABASE_URL" references Secret "database_url", which does not exist.`

**解决方案**：已移除 `vercel.json` 中的 `@` 符号引用，改为直接在 Vercel Dashboard 中配置环境变量。

**错误信息 2**：`Build Failed - Function Runtimes must have a valid version, for example 'now-php@1.0.0'.`

**解决方案**：已修复 `vercel.json` 中的 runtime 配置，从 `nodejs18.x` 改为 `@vercel/node@3.0.7`。

**错误信息 3**：`Found invalid Node.js Version: "22.x". Please set Node.js Version to 18.x in your Project Settings to use Node.js 18.`

**解决方案**：在 `package.json` 中添加 engines 字段指定 Node.js 版本：
```json
"engines": {
  "node": "18.x"
}
```

**错误信息 4**：`The Runtime "@vercel/node@3.0.7" is using "nodejs18.x", which is discontinued. Please upgrade your Runtime to a more recent version or consult the author for more details.`

**解决方案**：
1. 将 `vercel.json` 中的 runtime 从 `@vercel/node@3.0.7` 升级为 `nodejs20.x`
2. 同时更新 `package.json` 中的 engines 字段：
```json
"engines": {
  "node": "20.x"
}
```

**错误信息 5**：`Function Runtimes must have a valid version, for example 'now-php@1.0.0'.`

**解决方案**：将 `vercel.json` 中的 runtime 从 `nodejs20.x` 改为带版本号的格式 `@vercel/node@3.1.0`

## 解决方案

### 1. 更新 Vercel 配置（已完成）

已修改 `vercel.json` 文件：
- 移除 `@vercel/static` 构建器
- 添加 `functions` 配置支持 Node.js 18.x 运行时
- 添加 API 路由重写规则
- 配置环境变量引用

### 2. 在 Vercel Dashboard 中配置环境变量

**重要提示**：请直接在 Vercel Dashboard 中添加环境变量，不要使用 `@` 符号引用。

访问您的 Vercel 项目设置页面，添加以下环境变量：

#### 必需的环境变量：

| 变量名 | 值 | 环境 |
|--------|----|---------|
| `DATABASE_URL` | `postgresql://your_username:your_password@ep-xxx-xxx.us-east-1.aws.neon.tech/your_dbname?sslmode=require` | Production, Preview |
| `NEON_DATABASE_URL` | `postgresql://your_username:your_password@ep-xxx-xxx.us-east-1.aws.neon.tech/your_dbname?sslmode=require` | Production, Preview |
| `POLYGON_API_KEY` | `your_polygon_api_key_here` | Production, Preview (可选) |
| `FINNHUB_API_KEY` | `your_finnhub_api_key_here` | Production, Preview (可选) |
| `NODE_ENV` | `production` | Production |

#### 配置步骤：

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的项目 `heatmap-sector-aggregation`
3. 进入 **Settings** → **Environment Variables**
4. 点击 **Add New** 添加每个环境变量
5. 选择环境类型：
   - **Production**: 生产环境
   - **Preview**: 预览环境
   - **Development**: 开发环境

### 3. 获取正确的数据库连接字符串

从您的 Neon 控制台获取真实的数据库连接字符串：

1. 访问 [Neon Console](https://console.neon.tech/)
2. 选择您的数据库项目
3. 在 **Connection Details** 中复制连接字符串
4. 格式应类似：`postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require`

### 4. 重新部署

配置完环境变量后：

1. 在 Vercel Dashboard 中点击 **Redeploy**
2. 或者推送新的代码提交触发自动部署

### 5. 验证部署

部署完成后，访问以下 URL 验证：

- 前端页面：`https://your-project.vercel.app/sector-aggregation.html`
- API 接口：`https://your-project.vercel.app/api/sector-aggregation?all=true`

## 常见问题

### Q: 环境变量配置后仍然无法连接数据库？

A: 确保：
1. 数据库连接字符串格式正确
2. 数据库用户有足够权限
3. 重新部署项目以应用新的环境变量

### Q: API 返回 404 错误？

A: 检查：
1. `vercel.json` 中的 API 路由配置
2. `api/` 目录下的文件是否存在
3. 函数运行时配置是否正确

### Q: 如何查看部署日志？

A: 在 Vercel Dashboard 中：
1. 选择项目
2. 点击 **Deployments**
3. 选择具体的部署记录
4. 查看 **Build Logs** 和 **Function Logs**

## 使用 Vercel CLI 管理环境变量

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 链接项目
vercel link

# 添加环境变量
vercel env add DATABASE_URL production
vercel env add NEON_DATABASE_URL production

# 查看环境变量
vercel env ls

# 拉取环境变量到本地
vercel env pull
```

## 技术说明

### Serverless 函数配置

```json
{
  "functions": {
    "api/*.js": {
      "runtime": "nodejs18.x"
    }
  }
}
```

这个配置告诉 Vercel：
- `api/` 目录下的所有 `.js` 文件都是 serverless 函数
- 使用 Node.js 18.x 运行时
- 每个函数都有独立的执行环境

### 环境变量引用

```json
{
  "env": {
    "DATABASE_URL": "@database_url"
  }
}
```

`@database_url` 语法引用在 Vercel Dashboard 中配置的环境变量。

---

配置完成后，您的 Vercel 部署应该能够正常连接数据库并提供 API 服务。