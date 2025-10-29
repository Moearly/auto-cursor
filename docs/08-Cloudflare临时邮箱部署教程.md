# 08 - Cloudflare 临时邮箱部署教程

## 📋 概述

本教程将指导你部署 **cloudflare_temp_email** 项目，这是一个基于 Cloudflare Workers 和 Pages 的开源临时邮箱服务，可以与 Auto-Cursor 的自动注册功能完美集成。

**项目地址：** https://github.com/dreamhunter2333/cloudflare_temp_email

## 🎯 功能特性

- ✅ 完全免费（使用 Cloudflare 免费额度）
- ✅ 自定义域名邮箱
- ✅ 邮件接收和查看
- ✅ 邮件发送功能
- ✅ 自动回复
- ✅ 附件支持
- ✅ REST API 支持
- ✅ 高性能（基于 Rust WASM）

## 📦 前置要求

### 必需项
- **Cloudflare 账号**（免费）
- **域名**（托管在 Cloudflare）
- **Node.js 18+** 和 npm
- **Git**
- **pnpm**（用于前端构建）

### 可选项
- Resend 账号（用于发送邮件）

## 🚀 部署步骤

### 第一步：创建 Cloudflare D1 数据库

1. **登录 Cloudflare Dashboard**
   - 访问 https://dash.cloudflare.com/

2. **创建 D1 数据库**
   - 进入 **Workers & Pages** → **D1**
   - 点击 **Create database**
   - 数据库名称：`temp_mail_db`
   - 点击 **Create**

3. **记录数据库 ID**
   - 创建成功后，复制 `Database ID`（稍后需要用到）

---

### 第二步：克隆项目并配置

#### 2.1 克隆项目

```bash
git clone https://github.com/dreamhunter2333/cloudflare_temp_email.git
cd cloudflare_temp_email
```

#### 2.2 安装依赖

```bash
npm install
```

#### 2.3 创建配置文件

```bash
cp wrangler.toml.template wrangler.toml
```

#### 2.4 编辑配置文件

编辑 `wrangler.toml`：

```toml
name = "temp-mail-worker"
main = "worker-wasm/worker/worker.mjs"
compatibility_date = "2024-01-01"

# 环境变量配置
[vars]
PREFIX = "tmp"                    # 邮箱前缀（可选）
DOMAIN = "yourdomain.com"         # 你的域名
JWT_SECRET = "your_secret_key"    # JWT 密钥（至少32位）
ADMIN_PASSWORD = "admin_password" # 管理员密码

# D1 数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "temp_mail_db"
database_id = "你的数据库ID"       # 替换为第一步记录的 Database ID

# KV 命名空间（可选，用于缓存）
[[kv_namespaces]]
binding = "KV"
id = "your_kv_id"
```

**配置说明：**

| 参数 | 说明 | 示例 |
|------|------|------|
| `PREFIX` | 邮箱地址前缀（可选） | `tmp` |
| `DOMAIN` | 你的域名 | `yourdomain.com` |
| `JWT_SECRET` | JWT 签名密钥 | 至少32位随机字符串 |
| `ADMIN_PASSWORD` | 管理员密码 | 强密码 |
| `database_id` | D1 数据库 ID | 从 Cloudflare 获取 |

**生成 JWT_SECRET：**
```bash
# Linux/Mac
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### 第三步：初始化数据库

```bash
# 本地环境初始化（测试用）
wrangler d1 execute temp_mail_db --local --file=./schema.sql

# 生产环境初始化
wrangler d1 execute temp_mail_db --remote --file=./schema.sql
```

**验证数据库：**
```bash
wrangler d1 execute temp_mail_db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

应该看到创建的表结构。

---

### 第四步：部署后端 Worker

```bash
# 部署到 Cloudflare Workers
wrangler deploy
```

**输出示例：**
```
✨ Built successfully!
✨ Uploaded successfully!
✨ Deployed temp-mail-worker
   https://temp-mail-worker.your-account.workers.dev
```

**记录 Worker URL**，稍后配置前端时需要用到。

---

### 第五步：部署前端 Pages

#### 5.1 安装 pnpm

```bash
npm install -g pnpm
```

#### 5.2 进入前端目录并安装依赖

```bash
cd frontend
pnpm install
```

#### 5.3 配置前端环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
VITE_API_BASE=https://temp-mail-worker.your-account.workers.dev
```

将 URL 替换为第四步部署的 Worker URL。

#### 5.4 构建前端

```bash
pnpm build --emptyOutDir
```

#### 5.5 部署到 Cloudflare Pages

```bash
cd ..
wrangler pages deploy dist --branch production
```

**部署过程中会询问：**
- **Project name**：输入项目名称（如 `temp-mail-frontend`）
- **Production branch**：输入 `production`

**输出示例：**
```
✨ Success! Uploaded 15 files
✨ Deployment complete!
   https://temp-mail-frontend.pages.dev
```

---

### 第六步：配置邮件路由

#### 6.1 添加域名到 Cloudflare

如果还没有添加，需要先将域名添加到 Cloudflare：
1. Cloudflare Dashboard → **Add a Site**
2. 输入域名
3. 选择免费计划
4. 修改域名的 NS 记录指向 Cloudflare

#### 6.2 启用 Email Routing

1. 进入域名管理页面
2. 点击 **Email Routing**
3. 点击 **Get started**
4. Cloudflare 会自动配置 MX 记录

#### 6.3 配置 Catch-all 规则

1. 在 Email Routing 页面，点击 **Routing Rules**
2. 点击 **Create address** → **Catch-all address**
3. 配置规则：
   - **Action**: Send to a Worker
   - **Destination**: 选择 `temp-mail-worker`
4. 点击 **Save**

**MX 记录示例：**
```
yourdomain.com    MX    10    route1.mx.cloudflare.net
yourdomain.com    MX    10    route2.mx.cloudflare.net
yourdomain.com    MX    10    route3.mx.cloudflare.net
```

---

### 第七步：绑定自定义域名

#### 7.1 为 Worker 绑定域名

1. 在 Cloudflare Dashboard 中打开你的 Worker
2. 点击 **Settings** → **Triggers**
3. 点击 **Add Custom Domain**
4. 输入域名：`api.yourdomain.com`
5. 点击 **Add Custom Domain**

#### 7.2 为 Pages 绑定域名

1. 在 Cloudflare Dashboard 中打开你的 Pages 项目
2. 点击 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入域名：`mail.yourdomain.com`
5. 点击 **Continue**

---

### 第八步：验证部署

#### 8.1 访问前端界面

打开浏览器访问：`https://mail.yourdomain.com`

应该看到临时邮箱的界面。

#### 8.2 测试创建邮箱

1. 在前端页面点击 **生成邮箱** 按钮
2. 应该生成一个邮箱地址，如 `tmp_abc123@yourdomain.com`

#### 8.3 测试接收邮件

1. 使用另一个邮箱（如 Gmail）发送邮件到生成的临时邮箱
2. 等待几秒钟
3. 刷新页面
4. 应该能看到收到的邮件

---

## 🔧 API 文档

### 创建临时邮箱

**端点：** `POST /admin/new_address`

**请求头：**
```
X-Admin-Auth: your_admin_password
Content-Type: application/json
```

**请求体：**
```json
{
  "enablePrefix": true,
  "name": "test123",
  "domain": "yourdomain.com"
}
```

**响应：**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "address": "tmp_test123@yourdomain.com"
}
```

### 获取邮件列表

**端点：** `GET /api/mails?limit=10&offset=0`

**请求头：**
```
Authorization: Bearer {jwt}
Content-Type: application/json
```

**响应：**
```json
{
  "results": [
    {
      "id": "mail_id",
      "from": "sender@example.com",
      "subject": "Test Email",
      "raw": "邮件原始内容...",
      "created_at": "2025-10-28T10:00:00Z"
    }
  ]
}
```

---

## 🔍 故障排除

### 问题 1：收不到邮件

**检查清单：**
- [ ] Email Routing 已启用
- [ ] MX 记录已配置
- [ ] Catch-all 规则已绑定到 Worker
- [ ] 域名 DNS 已生效

**测试 MX 记录：**
```bash
dig MX yourdomain.com
```

### 问题 2：Worker 部署失败

**错误：`Error: No such database`**

**解决方案：**
```bash
# 检查数据库
wrangler d1 list

# 确认 wrangler.toml 中的 database_id 正确
```

### 问题 3：前端无法连接后端

**检查：**
1. `.env.local` 中的 `VITE_API_BASE` 是否正确
2. Worker URL 是否可访问
3. CORS 配置是否正确

### 问题 4：API 返回 401

**原因：** 管理员密码错误

**解决方案：**
1. 检查 `wrangler.toml` 中的 `ADMIN_PASSWORD`
2. 重新部署 Worker
```bash
wrangler deploy
```

---

## 🔒 安全建议

### 1. 保护管理员密码

```bash
# 使用强密码
ADMIN_PASSWORD=$(openssl rand -base64 24)
```

### 2. 限制 API 访问

在 Worker 中添加 IP 白名单：

```javascript
const ALLOWED_IPS = [
  '你的IP地址',
];

function checkIPAccess(request) {
  const ip = request.headers.get('CF-Connecting-IP');
  return ALLOWED_IPS.includes(ip);
}
```

### 3. 定期清理邮件

设置自动清理过期邮件（7天）：

```javascript
// 在 Worker 中添加定时任务
export default {
  async scheduled(event, env, ctx) {
    await env.DB.prepare(
      "DELETE FROM mails WHERE created_at < datetime('now', '-7 days')"
    ).run();
  }
}
```

在 `wrangler.toml` 中配置：
```toml
[triggers]
crons = ["0 2 * * *"]  # 每天凌晨2点执行
```

---

## 📊 性能优化

### 1. 启用 KV 缓存

创建 KV 命名空间：
```bash
wrangler kv:namespace create "CACHE"
```

在 `wrangler.toml` 中添加：
```toml
[[kv_namespaces]]
binding = "KV"
id = "your_kv_id"
```

### 2. 配置 CDN 缓存

在 Cloudflare Dashboard 中：
- Page Rules → Create Page Rule
- URL: `mail.yourdomain.com/*`
- Cache Level: Cache Everything
- Edge Cache TTL: 1 hour

---

## 💰 费用说明

### Cloudflare 免费额度

| 服务 | 免费额度 | 超出费用 |
|------|---------|---------|
| Workers | 100,000 请求/天 | $0.50/百万请求 |
| D1 数据库 | 5GB 存储 | $0.75/GB/月 |
| Pages | 无限制 | 免费 |
| Email Routing | 无限制 | 免费 |

**小规模使用（个人/测试）：** 完全免费

---

## 🔗 相关资源

### 官方文档
- [项目 GitHub](https://github.com/dreamhunter2333/cloudflare_temp_email)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Email Routing 文档](https://developers.cloudflare.com/email-routing/)

### 参考教程
- [使用Cloudflare搭建临时邮箱](https://cloud.tencent.com/developer/article/2446533)
- [小白也能看懂的教程](https://linux.do/t/topic/316819)

---

## ✅ 部署检查清单

完成部署后，请确认以下项目：

- [ ] D1 数据库已创建并初始化
- [ ] wrangler.toml 配置正确
- [ ] Worker 已部署成功
- [ ] 前端 Pages 已部署
- [ ] 自定义域名已绑定
- [ ] MX 记录已配置
- [ ] Email Routing 已启用
- [ ] Catch-all 规则已配置
- [ ] 前端页面可访问
- [ ] 可以生成临时邮箱
- [ ] 可以接收邮件
- [ ] API 测试通过

---

**最后更新**：2025-10-28  
**文档版本**：1.0.0  
**适用项目**：cloudflare_temp_email

---

## 🆘 获取帮助

如果遇到问题：

1. **查看项目 Issues**
   - https://github.com/dreamhunter2333/cloudflare_temp_email/issues

2. **检查 Worker 日志**
```bash
wrangler tail
```

3. **社区支持**
   - [Cloudflare Community](https://community.cloudflare.com/)
   - [项目讨论区](https://github.com/dreamhunter2333/cloudflare_temp_email/discussions)

