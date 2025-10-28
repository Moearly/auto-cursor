# 08 - Freemail 部署教程

## 📋 概述

Freemail 是一个基于 Cloudflare Workers 的临时邮箱系统，可以用于接收和发送邮件。本教程将指导你从零开始部署一个完整的临时邮箱服务。

## 🎯 部署目标

完成本教程后，你将拥有：
- ✅ 一个可用的临时邮箱服务
- ✅ 自定义域名邮箱（如 `xxx@yourdomain.com`）
- ✅ 邮件接收和查看功能
- ✅ 邮件发送功能（可选）
- ✅ 管理后台

## 📦 前置要求

### 1. 必需项
- **Cloudflare 账号**（免费）
- **域名**（托管在 Cloudflare）
- **Node.js 18+** 和 npm
- **Git**

### 2. 可选项
- **Resend 账号**（用于发送邮件，有免费额度）

## 🚀 部署步骤

### 第一步：准备工作

#### 1.1 克隆项目

```bash
# 克隆 Freemail 项目
git clone https://github.com/idinging/freemail.git
cd freemail

# 安装依赖
npm install
```

#### 1.2 安装 Wrangler CLI

```bash
# 全局安装 Cloudflare Wrangler
npm install -g wrangler

# 验证安装
wrangler --version
```

#### 1.3 登录 Cloudflare

```bash
# 登录你的 Cloudflare 账号
wrangler login
```

这会打开浏览器，授权 Wrangler 访问你的 Cloudflare 账号。

---

### 第二步：创建 D1 数据库

D1 是 Cloudflare 的 SQLite 数据库服务，用于存储邮件数据。

#### 2.1 创建数据库

```bash
# 创建名为 temp-mail-db 的数据库
wrangler d1 create temp-mail-db
```

**输出示例：**
```
✅ Successfully created DB 'temp-mail-db'!

[[d1_databases]]
binding = "TEMP_MAIL_DB"
database_name = "temp-mail-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### 2.2 记录数据库 ID

**重要**：复制输出中的 `database_id`，稍后需要用到。

#### 2.3 初始化数据库表结构

```bash
# 本地测试环境初始化
wrangler d1 execute temp-mail-db --local --file=./schema.sql

# 生产环境初始化
wrangler d1 execute temp-mail-db --remote --file=./schema.sql
```

**验证数据库：**
```bash
# 查看表结构
wrangler d1 execute temp-mail-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

应该看到 `mailboxes`、`mails` 等表。

---

### 第三步：创建 R2 存储桶

R2 用于存储完整的邮件 EML 文件。

#### 3.1 创建存储桶

```bash
# 创建名为 mail-eml 的 R2 存储桶
wrangler r2 bucket create mail-eml
```

**输出示例：**
```
✅ Created bucket 'mail-eml'
```

#### 3.2 验证存储桶

```bash
# 列出所有 R2 存储桶
wrangler r2 bucket list
```

应该看到 `mail-eml` 在列表中。

---

### 第四步：配置 wrangler.toml

编辑项目根目录的 `wrangler.toml` 文件：

```toml
name = "temp-mail-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

# D1 数据库绑定
[[d1_databases]]
binding = "TEMP_MAIL_DB"
database_name = "temp-mail-db"
database_id = "你的数据库ID"  # 替换为第二步记录的 database_id

# R2 存储桶绑定
[[r2_buckets]]
binding = "MAIL_EML"
bucket_name = "mail-eml"

# 静态资源配置
[assets]
directory = "public"
```

**关键配置说明：**
- `database_id`：替换为你的 D1 数据库 ID
- `bucket_name`：R2 存储桶名称
- `directory`：静态文件目录（前端页面）

---

### 第五步：配置环境变量

有两种方式配置环境变量：

#### 方式一：通过 Cloudflare Dashboard（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 选择你的 Worker（部署后）
4. 进入 **Settings** → **Variables**
5. 添加以下变量：

| 变量名 | 类型 | 值 | 说明 |
|--------|------|-----|------|
| `MAIL_DOMAIN` | Text | `temp.yourdomain.com` | 临时邮箱域名（多个用逗号分隔） |
| `ADMIN_PASSWORD` | Secret | `your_secure_password` | 管理员密码（加密存储） |
| `ADMIN_NAME` | Text | `admin` | 管理员用户名 |
| `JWT_TOKEN` | Secret | `random_secret_key_min_32_chars` | JWT签名密钥（至少32位） |

#### 方式二：通过命令行

```bash
# 设置环境变量
wrangler secret put ADMIN_PASSWORD
# 输入密码后按回车

wrangler secret put JWT_TOKEN
# 输入JWT密钥后按回车

# 设置普通变量（在 wrangler.toml 中）
[vars]
MAIL_DOMAIN = "temp.yourdomain.com"
ADMIN_NAME = "admin"
```

**生成安全的 JWT_TOKEN：**
```bash
# Linux/Mac
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### 第六步：配置域名和邮件路由

#### 6.1 添加域名到 Cloudflare

1. 登录 Cloudflare Dashboard
2. 点击 **Add a Site**
3. 输入你的域名（如 `yourdomain.com`）
4. 选择免费计划
5. 按照指引修改域名的 NS 记录

#### 6.2 添加邮件子域名

1. 进入域名管理页面
2. 点击 **DNS** → **Records**
3. 添加 A 记录（用于临时邮箱）：
   - **Type**: A
   - **Name**: `temp`（或其他子域名）
   - **IPv4 address**: `192.0.2.1`（占位IP）
   - **Proxy status**: Proxied（橙色云朵）

#### 6.3 配置 Email Routing（关键步骤）

**这是接收邮件的核心配置！**

1. 在域名管理页面，点击 **Email Routing**
2. 点击 **Get started** 启用邮件路由
3. Cloudflare 会自动配置 MX 记录
4. 验证 MX 记录配置成功

**配置 Catch-all 规则：**

1. 在 Email Routing 页面，点击 **Routing Rules**
2. 点击 **Create address** → **Catch-all address**
3. 配置规则：
   - **Action**: Send to a Worker
   - **Destination**: 选择 `temp-mail-worker`（部署后会出现）
4. 点击 **Save**

**MX 记录示例：**
```
yourdomain.com    MX    10    route1.mx.cloudflare.net
yourdomain.com    MX    10    route2.mx.cloudflare.net
yourdomain.com    MX    10    route3.mx.cloudflare.net
```

---

### 第七步：本地测试

在部署到生产环境前，先本地测试：

```bash
# 启动本地开发服务器
wrangler dev

# 或指定端口
wrangler dev --port 8787
```

**测试访问：**
- 打开浏览器访问 `http://localhost:8787`
- 应该看到 Freemail 的前端界面

**测试 API：**
```bash
# 生成临时邮箱
curl http://localhost:8787/api/mailbox/generate

# 健康检查
curl http://localhost:8787/health
```

---

### 第八步：部署到生产环境

#### 8.1 部署 Worker

```bash
# 部署到 Cloudflare Workers
npx wrangler deploy
```

**输出示例：**
```
✨ Built successfully!
✨ Uploaded successfully!
✨ Deployed temp-mail-worker
   https://temp-mail-worker.your-account.workers.dev
```

#### 8.2 绑定自定义域名

1. 在 Cloudflare Dashboard 中打开你的 Worker
2. 点击 **Settings** → **Triggers**
3. 点击 **Add Custom Domain**
4. 输入域名：`temp.yourdomain.com`
5. 点击 **Add Custom Domain**

**等待 DNS 生效（通常几分钟）**

#### 8.3 完成 Email Routing 绑定

现在回到第六步的 Email Routing 配置：
1. 编辑 Catch-all 规则
2. 确认 Destination 已选择 `temp-mail-worker`
3. 保存

---

### 第九步：验证部署

#### 9.1 访问前端界面

打开浏览器访问：`https://temp.yourdomain.com`

应该看到 Freemail 的界面。

#### 9.2 测试生成邮箱

1. 点击 **生成临时邮箱** 按钮
2. 应该生成一个邮箱地址，如 `abc123@temp.yourdomain.com`

#### 9.3 测试接收邮件

1. 使用另一个邮箱（如 Gmail）发送邮件到生成的临时邮箱
2. 等待几秒钟
3. 刷新 Freemail 页面
4. 应该能看到收到的邮件

**如果收不到邮件，检查：**
```bash
# 检查 MX 记录
dig MX yourdomain.com

# 检查 Email Routing 状态
# 在 Cloudflare Dashboard → Email Routing 查看
```

#### 9.4 测试管理后台

1. 访问 `https://temp.yourdomain.com/admin`
2. 使用配置的 `ADMIN_NAME` 和 `ADMIN_PASSWORD` 登录
3. 应该能看到所有邮箱和邮件

---

## 📧 可选：配置邮件发送功能

如果需要发送邮件，需要配置 Resend API。

### 步骤一：注册 Resend

1. 访问 [Resend.com](https://resend.com/)
2. 注册账号（免费额度：100封/天）
3. 验证邮箱

### 步骤二：添加并验证域名

1. 登录 Resend Dashboard
2. 点击 **Domains** → **Add Domain**
3. 输入域名：`temp.yourdomain.com`
4. 按照指引添加 DNS 记录：

**需要添加的记录：**
```
# SPF 记录
Type: TXT
Name: temp.yourdomain.com
Value: v=spf1 include:_spf.resend.com ~all

# DKIM 记录
Type: TXT
Name: resend._domainkey.temp.yourdomain.com
Value: [Resend 提供的值]

# DMARC 记录
Type: TXT
Name: _dmarc.temp.yourdomain.com
Value: v=DMARC1; p=none; rua=mailto:dmarc@temp.yourdomain.com
```

5. 等待验证通过（通常几分钟）

### 步骤三：创建 API Key

1. 在 Resend Dashboard，点击 **API Keys**
2. 点击 **Create API Key**
3. 输入名称：`Freemail Worker`
4. 选择权限：**Sending access**
5. 复制生成的 API Key（以 `re_` 开头）

### 步骤四：配置到 Worker

#### 单域名配置：

```bash
# 通过命令行
wrangler secret put RESEND_API_KEY
# 输入: re_xxxxxxxxxxxxxxxxxxxxx
```

#### 多域名配置（推荐）：

如果你有多个域名，可以为每个域名配置不同的 API Key：

**方式一：键值对格式**
```bash
wrangler secret put RESEND_API_KEY
# 输入: domain1.com=re_key1,domain2.com=re_key2
```

**方式二：JSON 格式**
```bash
wrangler secret put RESEND_API_KEY
# 输入: {"domain1.com":"re_key1","domain2.com":"re_key2"}
```

### 步骤五：测试发送邮件

```bash
# 测试发送 API
curl -X POST https://temp.yourdomain.com/api/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "from": "noreply@temp.yourdomain.com",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>Hello from Freemail!</p>",
    "fromName": "Freemail Service"
  }'
```

---

## 🔧 高级配置

### 1. 配置邮件转发

可以将收到的邮件自动转发到指定邮箱。

#### 添加转发规则

在 Cloudflare Dashboard → Worker Settings → Variables：

**JSON 格式：**
```json
FORWARD_RULES='[
  {"prefix":"vip","email":"admin@example.com"},
  {"prefix":"code","email":"dev@example.com"},
  {"prefix":"*","email":"fallback@example.com"}
]'
```

**键值对格式：**
```
FORWARD_RULES="vip=admin@example.com,code=dev@example.com,*=fallback@example.com"
```

**规则说明：**
- `vip123@temp.yourdomain.com` → 转发到 `admin@example.com`
- `code456@temp.yourdomain.com` → 转发到 `dev@example.com`
- 其他邮箱 → 转发到 `fallback@example.com`

#### 验证转发邮箱

**重要**：转发目标邮箱需要在 Cloudflare Email Routing 中验证。

1. 进入 **Email Routing** → **Destination addresses**
2. 点击 **Add destination address**
3. 输入邮箱地址（如 `admin@example.com`）
4. 点击发送验证邮件
5. 在目标邮箱中点击验证链接

### 2. 自定义邮件保留时间

编辑 Worker 代码，修改邮件自动清理时间：

```javascript
// src/index.js
const MAIL_RETENTION_DAYS = 7; // 保留7天

// 清理过期邮件的定时任务
async function cleanupOldMails(env) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAIL_RETENTION_DAYS);
  
  await env.TEMP_MAIL_DB.prepare(
    'DELETE FROM mails WHERE created_at < ?'
  ).bind(cutoffDate.toISOString()).run();
}
```

### 3. 配置 CORS

如果需要从其他域名访问 API：

```javascript
// src/index.js
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

### 4. 设置速率限制

防止滥用，限制 API 调用频率：

```javascript
// 使用 Cloudflare KV 存储请求计数
const rateLimiter = {
  async checkLimit(ip, env) {
    const key = `ratelimit:${ip}`;
    const count = await env.RATE_LIMIT_KV.get(key);
    
    if (count && parseInt(count) > 100) {
      return false; // 超过限制
    }
    
    await env.RATE_LIMIT_KV.put(key, (parseInt(count || 0) + 1).toString(), {
      expirationTtl: 3600 // 1小时过期
    });
    
    return true;
  }
};
```

---

## 🔍 故障排除

### 问题 1：收不到邮件

**症状**：发送邮件到临时邮箱，但收不到。

**排查步骤：**

1. **检查 MX 记录**
```bash
dig MX yourdomain.com
# 应该看到 Cloudflare 的 MX 记录
```

2. **检查 Email Routing 状态**
   - 登录 Cloudflare Dashboard
   - 进入 Email Routing
   - 确认状态为 **Active**
   - 确认 Catch-all 规则已绑定到 Worker

3. **检查 Worker 日志**
```bash
wrangler tail
# 发送测试邮件，观察日志输出
```

4. **测试 MX 记录**
```bash
# 使用在线工具测试
# https://mxtoolbox.com/
```

### 问题 2：部署失败

**错误：`Error: No such database`**

**解决方案：**
```bash
# 重新创建数据库
wrangler d1 create temp-mail-db

# 更新 wrangler.toml 中的 database_id
# 重新初始化
wrangler d1 execute temp-mail-db --remote --file=./schema.sql
```

**错误：`Error: R2 bucket not found`**

**解决方案：**
```bash
# 检查存储桶
wrangler r2 bucket list

# 重新创建
wrangler r2 bucket create mail-eml
```

### 问题 3：前端页面 404

**症状**：访问 Worker URL 返回 404。

**解决方案：**

1. **检查 wrangler.toml 配置**
```toml
[assets]
directory = "public"  # 确认目录正确
```

2. **确认静态文件存在**
```bash
ls -la public/
# 应该看到 index.html
```

3. **清除缓存**
   - Cloudflare Dashboard → Worker → Caching
   - 点击 **Purge Everything**
   - 浏览器强制刷新（Ctrl+F5）

### 问题 4：管理员登录失败

**症状**：输入正确的密码仍然无法登录。

**解决方案：**

1. **检查环境变量**
```bash
# 重新设置密码
wrangler secret put ADMIN_PASSWORD

# 重新设置 JWT
wrangler secret put JWT_TOKEN
```

2. **重新部署**
```bash
npx wrangler deploy
```

3. **清除浏览器 Cookie**

### 问题 5：发送邮件失败

**错误：`Resend API error: Domain not verified`**

**解决方案：**
1. 登录 Resend Dashboard
2. 检查域名验证状态
3. 确认所有 DNS 记录已添加
4. 等待验证通过（可能需要几小时）

**错误：`No API key for domain`**

**解决方案：**
```bash
# 检查配置格式
# 多域名配置示例：
wrangler secret put RESEND_API_KEY
# 输入: {"temp.yourdomain.com":"re_xxxxx"}
```

---

## 📊 监控和维护

### 1. 查看 Worker 日志

```bash
# 实时查看日志
wrangler tail

# 过滤错误日志
wrangler tail --status error
```

### 2. 监控数据库使用

```bash
# 查看邮箱数量
wrangler d1 execute temp-mail-db --remote \
  --command "SELECT COUNT(*) FROM mailboxes;"

# 查看邮件数量
wrangler d1 execute temp-mail-db --remote \
  --command "SELECT COUNT(*) FROM mails;"

# 查看数据库大小
wrangler d1 info temp-mail-db
```

### 3. 监控 R2 存储

```bash
# 查看存储桶信息
wrangler r2 bucket info mail-eml
```

### 4. 定期清理

**手动清理过期邮件：**
```bash
# 删除7天前的邮件
wrangler d1 execute temp-mail-db --remote \
  --command "DELETE FROM mails WHERE created_at < datetime('now', '-7 days');"

# 删除30天前的邮箱
wrangler d1 execute temp-mail-db --remote \
  --command "DELETE FROM mailboxes WHERE created_at < datetime('now', '-30 days');"
```

**设置自动清理（推荐）：**

使用 Cloudflare Cron Triggers：

```javascript
// wrangler.toml
[triggers]
crons = ["0 2 * * *"]  # 每天凌晨2点执行

// src/index.js
export default {
  async scheduled(event, env, ctx) {
    // 清理7天前的邮件
    await env.TEMP_MAIL_DB.prepare(
      "DELETE FROM mails WHERE created_at < datetime('now', '-7 days')"
    ).run();
    
    // 清理30天前的邮箱
    await env.TEMP_MAIL_DB.prepare(
      "DELETE FROM mailboxes WHERE created_at < datetime('now', '-30 days')"
    ).run();
  }
}
```

---

## 💰 费用说明

### Cloudflare 免费额度

| 服务 | 免费额度 | 超出费用 |
|------|---------|---------|
| Workers | 100,000 请求/天 | $0.50/百万请求 |
| D1 数据库 | 5GB 存储，500万行读取/天 | $0.75/GB/月 |
| R2 存储 | 10GB 存储，100万次操作/月 | $0.015/GB/月 |
| Email Routing | 无限制 | 免费 |

### Resend 免费额度

- **免费计划**：100封/天，3,000封/月
- **付费计划**：$20/月起，50,000封/月

### 成本估算

**小规模使用（个人/测试）：**
- 完全免费（在免费额度内）

**中等规模（100用户/天）：**
- Cloudflare: 免费
- Resend: 免费（如果发送量 < 100封/天）

**大规模（1000用户/天）：**
- Cloudflare: 约 $5-10/月
- Resend: 约 $20-50/月

---

## 🔒 安全建议

### 1. 强密码策略

```bash
# 生成强密码
openssl rand -base64 32

# 定期更换
wrangler secret put ADMIN_PASSWORD
```

### 2. 限制管理员访问

```javascript
// 添加 IP 白名单
const ADMIN_IP_WHITELIST = [
  '1.2.3.4',
  '5.6.7.8'
];

function checkAdminAccess(request) {
  const ip = request.headers.get('CF-Connecting-IP');
  return ADMIN_IP_WHITELIST.includes(ip);
}
```

### 3. 启用 HTTPS

Cloudflare 自动提供 HTTPS，确保：
- **SSL/TLS** 设置为 **Full** 或 **Full (strict)**
- 启用 **Always Use HTTPS**

### 4. 防止滥用

```javascript
// 限制邮箱生成频率
const MAILBOX_GENERATION_LIMIT = 10; // 每小时10个

// 限制邮件大小
const MAX_EMAIL_SIZE = 10 * 1024 * 1024; // 10MB
```

---

## 📚 API 文档

### 生成临时邮箱

```http
GET /api/mailbox/generate
```

**响应：**
```json
{
  "email": "abc123@temp.yourdomain.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 获取邮件列表

```http
GET /api/mails?email=abc123@temp.yourdomain.com
Authorization: Bearer <token>
```

**响应：**
```json
{
  "mails": [
    {
      "id": "mail_123",
      "from": "sender@example.com",
      "to": "abc123@temp.yourdomain.com",
      "subject": "Welcome",
      "timestamp": "2025-10-28T10:00:00Z",
      "hasAttachments": false
    }
  ]
}
```

### 获取邮件详情

```http
GET /api/mail/:id
Authorization: Bearer <token>
```

**响应：**
```json
{
  "id": "mail_123",
  "from": "sender@example.com",
  "to": "abc123@temp.yourdomain.com",
  "subject": "Welcome",
  "html": "<p>Email content</p>",
  "text": "Email content",
  "timestamp": "2025-10-28T10:00:00Z"
}
```

### 发送邮件

```http
POST /api/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "from": "noreply@temp.yourdomain.com",
  "to": "recipient@example.com",
  "subject": "Test Email",
  "html": "<p>Hello World!</p>",
  "fromName": "My Service"
}
```

**响应：**
```json
{
  "id": "sent_123",
  "status": "sent"
}
```

---

## 🎓 最佳实践

### 1. 域名选择

- ✅ 使用子域名（如 `temp.yourdomain.com`）
- ✅ 避免使用主域名
- ✅ 考虑使用专门的域名（如 `tempmail.com`）

### 2. 数据管理

- ✅ 定期清理过期邮件（建议7天）
- ✅ 定期清理过期邮箱（建议30天）
- ✅ 监控数据库大小

### 3. 性能优化

- ✅ 启用 Cloudflare 缓存
- ✅ 使用 CDN 加速静态资源
- ✅ 优化数据库查询

### 4. 监控告警

- ✅ 设置 Cloudflare Workers 告警
- ✅ 监控 API 错误率
- ✅ 监控邮件接收成功率

---

## 🔗 相关资源

### 官方文档
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [R2 存储文档](https://developers.cloudflare.com/r2/)
- [Email Routing 文档](https://developers.cloudflare.com/email-routing/)
- [Resend 文档](https://resend.com/docs)

### 工具
- [MX Toolbox](https://mxtoolbox.com/) - 测试邮件配置
- [Mail Tester](https://www.mail-tester.com/) - 测试邮件质量
- [DNS Checker](https://dnschecker.org/) - 检查 DNS 记录

### 社区
- [Freemail GitHub](https://github.com/idinging/freemail)
- [Cloudflare Community](https://community.cloudflare.com/)

---

## ✅ 部署检查清单

完成部署后，请确认以下项目：

- [ ] D1 数据库已创建并初始化
- [ ] R2 存储桶已创建
- [ ] wrangler.toml 配置正确
- [ ] 环境变量已设置（MAIL_DOMAIN, ADMIN_PASSWORD, JWT_TOKEN）
- [ ] Worker 已部署成功
- [ ] 自定义域名已绑定
- [ ] MX 记录已配置
- [ ] Email Routing 已启用
- [ ] Catch-all 规则已配置
- [ ] 前端页面可访问
- [ ] 可以生成临时邮箱
- [ ] 可以接收邮件
- [ ] 管理后台可登录
- [ ] （可选）Resend 已配置
- [ ] （可选）可以发送邮件

---

## 🆘 获取帮助

如果遇到问题：

1. **查看日志**
```bash
wrangler tail
```

2. **检查配置**
```bash
wrangler whoami
wrangler d1 list
wrangler r2 bucket list
```

3. **社区支持**
   - [GitHub Issues](https://github.com/idinging/freemail/issues)
   - [Cloudflare Community](https://community.cloudflare.com/)

4. **联系作者**
   - 微信：`iYear1213`

---

**最后更新**：2025-10-28  
**文档版本**：1.0.0  
**适用版本**：Freemail v4.5+

---

## 📝 更新日志

### v1.0.0 (2025-10-28)
- ✅ 完整的部署教程
- ✅ 详细的配置说明
- ✅ 故障排除指南
- ✅ API 文档
- ✅ 最佳实践建议

