# Cloudflare 临时邮箱完整指南

> **项目**: cloudflare_temp_email  
> **GitHub**: https://github.com/dreamhunter2333/cloudflare_temp_email  
> **部署日期**: 2025-10-29  
> **文档版本**: 2.1.0  
> **部署状态**: ✅ 已验证成功

---

## 📑 目录

- [第一部分：项目概述](#第一部分项目概述)
- [第二部分：部署教程](#第二部分部署教程)
- [第三部分：实际部署记录](#第三部分实际部署记录)
- [第四部分：集成到 Auto-Cursor](#第四部分集成到-auto-cursor)
- [附录：故障排除与维护](#附录故障排除与维护)

---

# 第一部分：项目概述

## 🎯 功能特性

- ✅ **完全免费**（使用 Cloudflare 免费额度）
- ✅ **自定义域名邮箱**
- ✅ **邮件接收和查看**
- ✅ **邮件发送功能**
- ✅ **自动回复**
- ✅ **附件支持**
- ✅ **REST API 支持**
- ✅ **高性能**（基于 Rust WASM）
- ✅ **自动清理**（定时任务）

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare 平台                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │  Email       │      │   Worker     │      │   Pages  │ │
│  │  Routing     │─────▶│   (API)      │◀─────│  (前端)  │ │
│  │              │      │              │      │          │ │
│  └──────────────┘      └──────┬───────┘      └──────────┘ │
│                               │                            │
│                               ▼                            │
│                        ┌──────────────┐                    │
│                        │  D1 Database │                    │
│                        │  (存储)      │                    │
│                        └──────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

邮件流程：
1. 外部邮件发送到 xxx@yourdomain.com
2. Cloudflare Email Routing 接收邮件
3. 转发给 Worker 处理
4. Worker 解析邮件并存储到 D1 数据库
5. 前端通过 API 查询并展示邮件
```

## 💰 费用说明

### Cloudflare 免费额度

| 服务 | 免费额度 | 超出费用 |
|------|---------|---------|
| **Workers** | 100,000 请求/天 | $0.50/百万请求 |
| **D1 数据库** | 5GB 存储 | $0.75/GB/月 |
| **Pages** | 无限制 | 免费 |
| **Email Routing** | 无限制 | 免费 |

**结论**: 小规模使用（个人/测试）完全免费！

---

# 第二部分：部署教程

## 📦 前置要求

### 必需项

1. **Cloudflare 账号**（免费）
   - 注册地址：https://dash.cloudflare.com/sign-up

2. **域名**（必须托管在 Cloudflare）
   - 如果已有域名：将 NS 记录指向 Cloudflare
   - 如果没有域名：需要先购买

3. **本地开发环境**
   ```bash
   # 必须安装
   - Node.js 18+
   - npm
   - Git
   - pnpm
   ```

4. **Cloudflare Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

### 可选项

- Resend 账号（用于发送邮件）

## 🚀 完整部署步骤

### 第一步：环境准备

#### 1.1 安装 Wrangler CLI

```bash
npm install -g wrangler

# 验证安装
wrangler --version
```

#### 1.2 登录 Cloudflare

**方式 1：OAuth 登录（推荐）**
```bash
wrangler login
```

**方式 2：API Token 登录（如果 OAuth 失败）**

1. 访问 https://dash.cloudflare.com/profile/api-tokens
2. 点击 "Create Token"
3. 选择 "Edit Cloudflare Workers" 模板
4. 或自定义权限：
   - Account - Cloudflare Pages: Edit
   - Account - D1: Edit
   - Account - Workers Scripts: Edit
   - Zone - Email Routing Rules: Edit
   - Zone - DNS: Edit
5. 创建并复制 Token

```bash
# 设置 Token
export CLOUDFLARE_API_TOKEN=your_token_here

# 验证登录
wrangler whoami
```

### 第二步：创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create temp_mail_db
```

**输出示例**：
```
✅ Successfully created DB 'temp_mail_db' in region APAC
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "temp_mail_db"
database_id = "6b13e4f4-4741-4df4-a8c6-be7b03bd7c0b"
```

⚠️ **重要**：记录 `database_id`，稍后配置时需要用到。

### 第三步：克隆项目并配置

#### 3.1 克隆项目

```bash
git clone https://github.com/dreamhunter2333/cloudflare_temp_email.git
cd cloudflare_temp_email
```

#### 3.2 安装 Worker 依赖

```bash
cd worker
pnpm install
```

#### 3.3 生成配置密钥

```bash
# 生成 JWT 密钥（32位以上）
openssl rand -base64 32
# 或
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 生成管理员密码（24位）
openssl rand -base64 24
# 或
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

#### 3.4 创建配置文件

创建 `worker/wrangler.toml` 文件：

```toml
name = "temp-mail-worker"
main = "src/worker.ts"
compatibility_date = "2025-04-01"
compatibility_flags = [ "nodejs_compat" ]

# 定时任务：每天凌晨 2 点清理邮件
[triggers]
crons = [ "0 2 * * *" ]

[vars]
PREFIX = "tmp"                              # 邮箱前缀
DEFAULT_DOMAINS = ["yourdomain.com"]        # 默认域名
DOMAINS = ["yourdomain.com"]                # 所有域名
JWT_SECRET = "your_jwt_secret_here"         # JWT 密钥（32位以上）
BLACK_LIST = ""                             # 黑名单（可选）
ENABLE_USER_CREATE_EMAIL = true             # 允许用户创建邮箱
ENABLE_USER_DELETE_EMAIL = true             # 允许用户删除邮件
ENABLE_AUTO_REPLY = false                   # 自动回复（默认关闭）
ADMIN_PASSWORDS = ["your_admin_password"]   # 管理员密码

[[d1_databases]]
binding = "DB"
database_name = "temp_mail_db"
database_id = "your_database_id_here"       # 替换为第二步的 database_id
```

**配置说明**：

| 参数 | 说明 | 示例 |
|------|------|------|
| `PREFIX` | 邮箱地址前缀 | `tmp` |
| `DEFAULT_DOMAINS` | 默认域名列表 | `["yourdomain.com"]` |
| `DOMAINS` | 所有可用域名 | `["yourdomain.com"]` |
| `JWT_SECRET` | JWT 签名密钥 | 至少32位随机字符串 |
| `ADMIN_PASSWORDS` | 管理员密码数组 | `["password123"]` |
| `database_id` | D1 数据库 ID | 从第二步获取 |

### 第四步：初始化数据库

```bash
# 返回项目根目录
cd ..

# 初始化数据库（生产环境）
wrangler d1 execute temp_mail_db --remote --file=./db/schema.sql
```

**输出示例**：
```
🌀 Executing on remote database temp_mail_db
🚣 Executed 25 queries in 0.00 seconds (41 rows read, 44 rows written)
   Database is currently at bookmark 00000001-00000005-00004fa6-...
```

**验证数据库**：
```bash
wrangler d1 execute temp_mail_db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

应该看到创建的表：
- `_cf_KV`
- `raw_mails`
- `address`
- `auto_reply_mails`
- `address_sender`
- `sendbox`
- `settings`
- `users`
- `users_address`
- `user_roles`
- `user_passkeys`

### 第五步：部署后端 Worker

```bash
cd worker
wrangler deploy
```

**输出示例**：
```
✨ Built successfully!
✨ Uploaded successfully!
✨ Deployed temp-mail-worker
   https://temp-mail-worker.your-account.workers.dev
   schedule: 0 2 * * *
```

⚠️ **重要**：记录 Worker URL，配置前端时需要用到。

**测试 Worker**：
```bash
curl https://temp-mail-worker.your-account.workers.dev/
# 应返回: OK
```

### 第六步：部署前端 Pages

#### 6.1 安装前端依赖

```bash
cd ../frontend
pnpm install
```

#### 6.2 配置前端环境变量

```bash
# 创建环境变量文件
echo 'VITE_API_BASE=https://temp-mail-worker.your-account.workers.dev' > .env.local
```

将 URL 替换为第五步部署的 Worker URL。

#### 6.3 构建前端

```bash
pnpm build --emptyOutDir
```

**输出示例**：
```
✓ built in 40.47s
dist/index.html                    1.14 kB
dist/assets/index-VUQHdIaQ.js   1,839.68 kB
```

#### 6.4 创建 Pages 项目

```bash
cd ..
wrangler pages project create temp-mail-frontend --production-branch production
```

#### 6.5 部署到 Cloudflare Pages

```bash
wrangler pages deploy frontend/dist --project-name temp-mail-frontend --commit-dirty=true
```

**输出示例**：
```
✨ Success! Uploaded 22 files (10.80 sec)
✨ Deployment complete!
   https://temp-mail-frontend.pages.dev
   https://8edfdf8d.temp-mail-frontend.pages.dev
```

### 第七步：配置邮件路由

⚠️ **此步骤必须在 Cloudflare Dashboard 中手动完成**

#### 7.1 添加域名到 Cloudflare

如果还没有添加：
1. 访问 https://dash.cloudflare.com/
2. 点击 **Add a Site**
3. 输入域名
4. 选择免费计划
5. 修改域名的 NS 记录指向 Cloudflare

#### 7.2 启用 Email Routing

1. 进入域名管理页面
2. 点击左侧菜单 **Email Routing**
3. 点击 **Get started**
4. Cloudflare 会自动配置 MX 记录

#### 7.3 配置 Catch-all 规则

1. 在 Email Routing 页面，点击 **Routing Rules**
2. 点击 **Create address** → **Catch-all address**
3. 配置规则：
   - **Action**: Send to a Worker
   - **Destination**: 选择 `temp-mail-worker`
4. 点击 **Save**

**验证 MX 记录**：
```bash
dig MX yourdomain.com +short
```

应该看到：
```
10 route1.mx.cloudflare.net.
10 route2.mx.cloudflare.net.
10 route3.mx.cloudflare.net.
```

### 第八步：绑定自定义域名（可选但推荐）

#### 8.1 为 Worker 绑定域名

1. 打开 https://dash.cloudflare.com/
2. 进入 **Workers & Pages** → `temp-mail-worker`
3. 点击 **Settings** → **Triggers**
4. 点击 **Add Custom Domain**
5. 输入：`api.yourdomain.com`
6. 点击 **Add Custom Domain**

#### 8.2 为 Pages 绑定域名

1. 在 **Workers & Pages** 中找到 `temp-mail-frontend`
2. 点击 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入：`mail.yourdomain.com`
5. 点击 **Continue**

### 第九步：验证部署

#### 9.1 访问前端界面

打开浏览器访问：`https://mail.yourdomain.com`

应该看到临时邮箱的界面。

#### 9.2 测试创建邮箱

1. 在前端页面点击 **生成邮箱** 按钮
2. 应该生成一个邮箱地址，如 `tmp_abc123@yourdomain.com`

#### 9.3 测试接收邮件

1. 使用另一个邮箱（如 Gmail）发送邮件到生成的临时邮箱
2. 等待几秒钟
3. 刷新页面
4. 应该能看到收到的邮件

---

## ✅ 部署验证成功案例

### 验证时间：2025-10-29 14:13

#### 测试结果：

**发送测试邮件**：
- 发件人：gmartnlei@gmail.com
- 收件人：tmpready2025@codefog.cc
- 主题：你好
- 内容：测试123456
- 发送时间：2025/10/29 14:13:33

**接收结果**：
- ✅ 邮件成功接收
- ✅ 存储到 D1 数据库
- ✅ 前端正确显示
- ✅ 邮件 ID: 1
- ✅ 自动刷新功能正常（57秒）

#### 验证的功能：

| 功能 | 状态 | 说明 |
|------|------|------|
| Worker 部署 | ✅ | API 正常响应 |
| Pages 部署 | ✅ | 前端界面可访问 |
| D1 数据库 | ✅ | 数据正常存储 |
| Email Routing | ✅ | MX 记录生效 |
| Catch-all 规则 | ✅ | 邮件正确转发 |
| 邮件接收 | ✅ | 成功接收外部邮件 |
| 邮件解析 | ✅ | 正确解析邮件内容 |
| 前端显示 | ✅ | 正确显示邮件列表和详情 |
| 自动刷新 | ✅ | 定时刷新功能正常 |
| 邮件操作 | ✅ | 删除、下载、全屏功能可用 |

#### 前端界面功能：

- ✅ 刷新按钮
- ✅ 复制邮箱地址
- ✅ 退出邮箱
- ✅ 账户设置
- ✅ 自动刷新（可配置）
- ✅ 显示邮件列表
- ✅ 查看邮件详情
- ✅ 删除邮件
- ✅ 下载邮件
- ✅ 全屏显示

**结论**：✅ 所有功能验证通过，系统运行正常！

---

# 第三部分：实际部署记录

## 📋 部署信息

### 账号信息
- **Cloudflare 账号**: gmartnlei@gmail.com
- **Account ID**: 9c96ce54547bcd5bb1b560b3015a9dd8
- **部署日期**: 2025-10-29

### 域名配置
- **域名**: codefog.cc
- **邮箱格式**: tmpXXXXXX@codefog.cc

### 数据库配置
- **数据库名称**: temp_mail_db
- **数据库 ID**: 6b13e4f4-4741-4df4-a8c6-be7b03bd7c0b
- **区域**: APAC
- **表数量**: 12 个表

### Worker 配置
- **Worker 名称**: temp-mail-worker
- **Worker URL**: https://temp-mail-worker.gmartnlei.workers.dev
- **Version ID**: 5397cb85-b2d6-4790-84c2-d2145c1b32c7
- **定时任务**: 每天凌晨 2 点执行清理（`0 2 * * *`）

### Pages 配置
- **项目名称**: temp-mail-frontend
- **主域名**: https://temp-mail-frontend-bzd.pages.dev
- **部署链接**: https://8edfdf8d.temp-mail-frontend-bzd.pages.dev
- **Production Branch**: production

### 安全凭证（敏感信息）

```yaml
# 管理员密码
ADMIN_PASSWORD: 9gjyBBjO0Q4uwjAbiHSrxdgxpeV/uX0l

# JWT 密钥
JWT_SECRET: RKXAz2SQSxpoTBlF2eu6smkQoCWL3godOkwYdWSJzqU=

# API Token
CLOUDFLARE_API_TOKEN: mvJNgJxA16kKLvW0t2sJ5gNuoCorqKy0DS-IGGxB
```

⚠️ **注意**: 请妥善保管以上凭证，不要泄露给他人。

## ✅ 部署状态

| 组件 | 状态 | 访问地址 |
|------|------|---------|
| **D1 数据库** | ✅ 运行中 | `temp_mail_db` |
| **后端 Worker** | ✅ 运行中 | https://temp-mail-worker.gmartnlei.workers.dev |
| **前端 Pages** | ✅ 运行中 | https://8edfdf8d.temp-mail-frontend-bzd.pages.dev |
| **主域名** | ✅ 运行中 | https://temp-mail-frontend-bzd.pages.dev |
| **Email Routing** | ✅ 已启用 | Catch-all → temp-mail-worker |
| **邮件接收** | ✅ 已验证 | 2025-10-29 14:13 测试通过 |

## 🧪 功能测试记录

### 测试 1: Worker 健康检查 ✅

```bash
curl https://temp-mail-worker.gmartnlei.workers.dev/

# 返回
OK
```

### 测试 2: 创建临时邮箱 ✅

```bash
curl -X POST https://temp-mail-worker.gmartnlei.workers.dev/admin/new_address \
  -H "X-Admin-Auth: 9gjyBBjO0Q4uwjAbiHSrxdgxpeV/uX0l" \
  -H "Content-Type: application/json" \
  -d '{
    "enablePrefix": true,
    "name": "test123",
    "domain": "codefog.cc"
  }'

# 返回结果
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoidG1wdGVzdDEyM0Bjb2RlZm9nLmNjIiwiYWRkcmVzc19pZCI6MX0.eCRofD38g8uZhE0Qbr_FK9O1rIRtV_9JmtIT7tI3LMo",
  "address": "tmptest123@codefog.cc",
  "password": null
}
```

### 测试 3: 获取邮件列表 ✅

```bash
curl -X GET "https://temp-mail-worker.gmartnlei.workers.dev/api/mails?limit=10&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoidG1wdGVzdDEyM0Bjb2RlZm9nLmNjIiwiYWRkcmVzc19pZCI6MX0.eCRofD38g8uZhE0Qbr_FK9O1rIRtV_9JmtIT7tI3LMo" \
  -H "Content-Type: application/json"

# 返回结果
{
  "results": [],
  "count": 0
}
```

### 测试 4: 接收真实邮件 ✅

**测试邮箱**：tmpready2025@codefog.cc

**发送邮件**：
```
发件人: gmartnlei@gmail.com
收件人: tmpready2025@codefog.cc
主题: 你好
内容: 测试123456
时间: 2025/10/29 14:13:33
```

**接收结果**：
```json
{
  "results": [
    {
      "id": 1,
      "from": "martn lei <gmartnlei@gmail.com>",
      "to": "tmpready2025@codefog.cc",
      "subject": "你好",
      "created_at": "2025/10/29 14:13:33"
    }
  ],
  "count": 1
}
```

**前端显示**：
- ✅ 邮件列表正确显示
- ✅ 邮件详情可查看
- ✅ 自动刷新功能正常
- ✅ 删除、下载、全屏功能可用

✅ **所有测试通过！邮件接收功能验证成功！**

## 📝 实际部署命令记录

```bash
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 配置 API Token
export CLOUDFLARE_API_TOKEN=mvJNgJxA16kKLvW0t2sJ5gNuoCorqKy0DS-IGGxB

# 3. 验证登录
wrangler whoami

# 4. 创建数据库
wrangler d1 create temp_mail_db

# 5. 克隆项目
cd /home/leiyi/codeSpace
git clone https://github.com/dreamhunter2333/cloudflare_temp_email.git
cd cloudflare_temp_email

# 6. 安装 Worker 依赖
cd worker
pnpm install

# 7. 生成密钥
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"

# 8. 创建配置文件（手动编辑 wrangler.toml）

# 9. 初始化数据库
cd ..
wrangler d1 execute temp_mail_db --remote --file=./db/schema.sql

# 10. 部署 Worker
cd worker
wrangler deploy

# 11. 安装前端依赖
cd ../frontend
pnpm install

# 12. 配置前端
echo 'VITE_API_BASE=https://temp-mail-worker.gmartnlei.workers.dev' > .env.local

# 13. 构建前端
pnpm build --emptyOutDir

# 14. 创建 Pages 项目
cd ..
wrangler pages project create temp-mail-frontend --production-branch production

# 15. 部署前端
wrangler pages deploy frontend/dist --project-name temp-mail-frontend --commit-dirty=true
```

---

# 第四部分：集成到 Auto-Cursor

## 📝 配置类型定义

在 Auto-Cursor 项目中已有配置类型：

```typescript
// src/types/emailConfig.ts
export interface EmailConfig {
  worker_domain: string;
  email_domain: string;
  admin_password: string;
}

// 空的邮箱配置模板
export const EMPTY_EMAIL_CONFIG: EmailConfig = {
  worker_domain: "",
  email_domain: "",
  admin_password: "",
};
```

## 🔧 配置示例

### 配置文件

```typescript
// config/email.config.ts
import { EmailConfig } from '../src/types/emailConfig';

export const emailConfig: EmailConfig = {
  worker_domain: 'https://temp-mail-worker.gmartnlei.workers.dev',
  email_domain: 'codefog.cc',
  admin_password: '9gjyBBjO0Q4uwjAbiHSrxdgxpeV/uX0l'
};
```

### 环境变量方式（推荐）

```bash
# .env
EMAIL_WORKER_DOMAIN=https://temp-mail-worker.gmartnlei.workers.dev
EMAIL_DOMAIN=codefog.cc
EMAIL_ADMIN_PASSWORD=9gjyBBjO0Q4uwjAbiHSrxdgxpeV/uX0l
```

```typescript
// config/email.config.ts
export const emailConfig: EmailConfig = {
  worker_domain: process.env.EMAIL_WORKER_DOMAIN || '',
  email_domain: process.env.EMAIL_DOMAIN || '',
  admin_password: process.env.EMAIL_ADMIN_PASSWORD || ''
};
```

## 💻 API 封装

### 创建邮箱服务类

```typescript
// src/services/TempEmailService.ts
import { EmailConfig } from '../types/emailConfig';

export interface TempEmailResponse {
  jwt: string;
  address: string;
  password: string | null;
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  raw: string;
  created_at: string;
}

export interface EmailListResponse {
  results: EmailMessage[];
  count: number;
}

export class TempEmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * 创建临时邮箱
   * @param name 邮箱名称（可选，不传则自动生成）
   * @returns 邮箱地址和 JWT Token
   */
  async createEmail(name?: string): Promise<TempEmailResponse> {
    const url = `${this.config.worker_domain}/admin/new_address`;
    
    const body: any = {
      enablePrefix: true,
      domain: this.config.email_domain
    };
    
    if (name) {
      body.name = name;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Admin-Auth': this.config.admin_password,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`创建邮箱失败: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 获取邮件列表
   * @param jwt JWT Token
   * @param limit 返回数量限制
   * @param offset 偏移量
   * @returns 邮件列表
   */
  async getEmails(
    jwt: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<EmailListResponse> {
    const url = `${this.config.worker_domain}/api/mails?limit=${limit}&offset=${offset}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`获取邮件失败: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 等待接收邮件（轮询）
   * @param jwt JWT Token
   * @param timeout 超时时间（毫秒）
   * @param interval 轮询间隔（毫秒）
   * @returns 第一封邮件
   */
  async waitForEmail(
    jwt: string,
    timeout: number = 60000,
    interval: number = 2000
  ): Promise<EmailMessage | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const response = await this.getEmails(jwt, 1, 0);
      
      if (response.results.length > 0) {
        return response.results[0];
      }

      // 等待指定间隔后继续轮询
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return null;
  }

  /**
   * 从邮件中提取验证码
   * @param email 邮件对象
   * @returns 验证码（如果找到）
   */
  extractVerificationCode(email: EmailMessage): string | null {
    // 常见验证码模式
    const patterns = [
      /验证码[：:]\s*(\d{4,6})/,
      /code[：:]\s*(\d{4,6})/i,
      /verification code[：:]\s*(\d{4,6})/i,
      /(\d{6})/  // 6位数字
    ];

    const content = email.raw || email.subject;

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}
```

## 🎯 使用示例

### 示例 1: 自动注册流程

```typescript
// src/automation/registerWithTempEmail.ts
import { TempEmailService } from '../services/TempEmailService';
import { emailConfig } from '../../config/email.config';

async function autoRegister(username: string) {
  const emailService = new TempEmailService(emailConfig);

  try {
    // 1. 创建临时邮箱
    console.log('正在创建临时邮箱...');
    const tempEmail = await emailService.createEmail(username);
    console.log(`邮箱创建成功: ${tempEmail.address}`);

    // 2. 使用邮箱进行注册
    console.log('正在注册账号...');
    await registerAccount({
      username: username,
      email: tempEmail.address,
      password: 'your_password'
    });

    // 3. 等待接收验证邮件
    console.log('等待接收验证邮件...');
    const email = await emailService.waitForEmail(tempEmail.jwt, 60000);

    if (!email) {
      throw new Error('未收到验证邮件');
    }

    console.log(`收到邮件: ${email.subject}`);

    // 4. 提取验证码
    const code = emailService.extractVerificationCode(email);
    
    if (!code) {
      throw new Error('未找到验证码');
    }

    console.log(`验证码: ${code}`);

    // 5. 完成验证
    await verifyAccount(username, code);
    console.log('账号验证成功！');

    return {
      success: true,
      email: tempEmail.address,
      code: code
    };

  } catch (error) {
    console.error('注册失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 模拟注册函数
async function registerAccount(data: any) {
  // 实现你的注册逻辑
}

// 模拟验证函数
async function verifyAccount(username: string, code: string) {
  // 实现你的验证逻辑
}
```

### 示例 2: 批量注册

```typescript
// src/automation/batchRegister.ts
import { TempEmailService } from '../services/TempEmailService';
import { emailConfig } from '../../config/email.config';

async function batchRegister(usernames: string[]) {
  const emailService = new TempEmailService(emailConfig);
  const results = [];

  for (const username of usernames) {
    try {
      console.log(`\n正在注册: ${username}`);
      
      // 创建邮箱
      const tempEmail = await emailService.createEmail(username);
      console.log(`  邮箱: ${tempEmail.address}`);

      // 注册账号
      await registerAccount({
        username: username,
        email: tempEmail.address,
        password: generatePassword()
      });

      // 等待验证邮件
      const email = await emailService.waitForEmail(tempEmail.jwt);
      
      if (email) {
        const code = emailService.extractVerificationCode(email);
        if (code) {
          await verifyAccount(username, code);
          results.push({
            username,
            email: tempEmail.address,
            status: 'success'
          });
          console.log(`  ✅ 成功`);
        }
      }

      // 延迟避免频率限制
      await delay(5000);

    } catch (error) {
      console.error(`  ❌ 失败: ${error.message}`);
      results.push({
        username,
        status: 'failed',
        error: error.message
      });
    }
  }

  return results;
}

function generatePassword(): string {
  return Math.random().toString(36).slice(-10);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 示例 3: CLI 工具

```typescript
// src/cli/email-tool.ts
import { Command } from 'commander';
import { TempEmailService } from '../services/TempEmailService';
import { emailConfig } from '../../config/email.config';

const program = new Command();
const emailService = new TempEmailService(emailConfig);

program
  .name('email-tool')
  .description('临时邮箱管理工具')
  .version('1.0.0');

// 创建邮箱命令
program
  .command('create')
  .description('创建临时邮箱')
  .option('-n, --name <name>', '邮箱名称')
  .action(async (options) => {
    try {
      const result = await emailService.createEmail(options.name);
      console.log('邮箱创建成功！');
      console.log(`地址: ${result.address}`);
      console.log(`JWT: ${result.jwt}`);
    } catch (error) {
      console.error('创建失败:', error.message);
    }
  });

// 查看邮件命令
program
  .command('list')
  .description('查看邮件列表')
  .requiredOption('-j, --jwt <jwt>', 'JWT Token')
  .option('-l, --limit <limit>', '数量限制', '10')
  .action(async (options) => {
    try {
      const result = await emailService.getEmails(
        options.jwt,
        parseInt(options.limit)
      );
      
      console.log(`共 ${result.count} 封邮件:\n`);
      
      result.results.forEach((email, index) => {
        console.log(`${index + 1}. ${email.subject}`);
        console.log(`   发件人: ${email.from}`);
        console.log(`   时间: ${email.created_at}\n`);
      });
    } catch (error) {
      console.error('获取失败:', error.message);
    }
  });

// 等待邮件命令
program
  .command('wait')
  .description('等待接收邮件')
  .requiredOption('-j, --jwt <jwt>', 'JWT Token')
  .option('-t, --timeout <timeout>', '超时时间（秒）', '60')
  .action(async (options) => {
    try {
      console.log('等待接收邮件...');
      
      const email = await emailService.waitForEmail(
        options.jwt,
        parseInt(options.timeout) * 1000
      );
      
      if (email) {
        console.log('\n收到邮件！');
        console.log(`主题: ${email.subject}`);
        console.log(`发件人: ${email.from}`);
        
        const code = emailService.extractVerificationCode(email);
        if (code) {
          console.log(`\n验证码: ${code}`);
        }
      } else {
        console.log('未收到邮件（超时）');
      }
    } catch (error) {
      console.error('错误:', error.message);
    }
  });

program.parse();
```

使用 CLI 工具：

```bash
# 创建邮箱
npm run email-tool create --name test123

# 查看邮件
npm run email-tool list --jwt YOUR_JWT_TOKEN

# 等待邮件
npm run email-tool wait --jwt YOUR_JWT_TOKEN --timeout 60
```

---

# 附录：故障排除与维护

## 🐛 常见问题

### 问题 1: 前端显示 "Nothing is here yet"

**原因**: Pages 部署刚完成，DNS 传播需要时间

**解决方案**:
- 等待 2-5 分钟
- 使用具体的部署链接（如 `https://8edfdf8d.temp-mail-frontend-bzd.pages.dev`）
- 清除浏览器缓存

### 问题 2: API 返回 401 Unauthorized

**原因**: 管理员密码错误或 JWT Token 无效

**解决方案**:
```bash
# 检查管理员密码
curl -X POST https://your-worker.workers.dev/admin/new_address \
  -H "X-Admin-Auth: YOUR_ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"enablePrefix": true, "name": "test", "domain": "yourdomain.com"}'

# 如果返回 401，说明密码错误，需要重新部署 Worker
```

### 问题 3: 收不到邮件

**检查清单**:
- [ ] Email Routing 已启用
- [ ] MX 记录已配置
- [ ] Catch-all 规则已绑定到 Worker
- [ ] 域名 DNS 已生效
- [ ] Worker 运行正常

**测试步骤**:

1. **验证 MX 记录**:
```bash
dig MX yourdomain.com +short
```

应该看到 Cloudflare 的 MX 记录：
```
10 route1.mx.cloudflare.net.
10 route2.mx.cloudflare.net.
10 route3.mx.cloudflare.net.
```

2. **测试 Worker**:
```bash
curl https://your-worker.workers.dev/
# 应返回: OK
```

3. **检查 Email Routing 配置**:
   - 访问 Cloudflare Dashboard
   - 进入域名 → Email Routing
   - 确认 Catch-all 规则已启用并绑定到正确的 Worker

### 问题 4: Worker 部署失败

**错误**: `Error: No such database`

**解决方案**:
```bash
# 1. 检查数据库是否存在
wrangler d1 list

# 2. 确认 wrangler.toml 中的 database_id 正确
# 3. 如果数据库不存在，重新创建
wrangler d1 create temp_mail_db

# 4. 更新 wrangler.toml 中的 database_id
# 5. 重新部署
wrangler deploy
```

### 问题 5: 前端无法连接后端

**检查项**:
1. `.env.local` 中的 `VITE_API_BASE` 是否正确
2. Worker URL 是否可访问
3. CORS 配置是否正确

**解决方案**:
```bash
# 1. 检查 Worker URL
curl https://your-worker.workers.dev/

# 2. 检查前端配置
cat frontend/.env.local

# 3. 如果配置错误，修改后重新构建部署
cd frontend
echo 'VITE_API_BASE=https://correct-worker-url.workers.dev' > .env.local
pnpm build --emptyOutDir
cd ..
wrangler pages deploy frontend/dist --project-name temp-mail-frontend --commit-dirty=true
```

### 问题 6: Wrangler 登录失败

**错误**: `Timed out waiting for authorization code`

**解决方案**: 使用 API Token 方式

```bash
# 1. 获取 API Token
# 访问 https://dash.cloudflare.com/profile/api-tokens
# 创建 Token 并复制

# 2. 设置环境变量
export CLOUDFLARE_API_TOKEN=your_token_here

# 3. 验证
wrangler whoami
```

## 🔧 维护操作

### 更新 Worker

```bash
cd /path/to/cloudflare_temp_email/worker

# 1. 修改代码或配置
# 2. 重新部署
wrangler deploy
```

### 更新前端

```bash
cd /path/to/cloudflare_temp_email/frontend

# 1. 修改代码
# 2. 重新构建
pnpm build --emptyOutDir

# 3. 重新部署
cd ..
wrangler pages deploy frontend/dist --project-name temp-mail-frontend --commit-dirty=true
```

### 查看 Worker 日志

```bash
cd /path/to/cloudflare_temp_email/worker
wrangler tail
```

### 数据库维护

```bash
# 查看数据库列表
wrangler d1 list

# 执行 SQL 查询
wrangler d1 execute temp_mail_db --remote --command "SELECT COUNT(*) FROM raw_mails;"

# 清理旧邮件（7天前）
wrangler d1 execute temp_mail_db --remote --command "DELETE FROM raw_mails WHERE created_at < datetime('now', '-7 days');"

# 查看数据库大小
wrangler d1 info temp_mail_db
```

### 修改管理员密码

```bash
# 1. 生成新密码
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"

# 2. 修改 wrangler.toml
# ADMIN_PASSWORDS = ["new_password_here"]

# 3. 重新部署
cd worker
wrangler deploy
```

### 修改域名

```bash
# 1. 修改 wrangler.toml
# DEFAULT_DOMAINS = ["newdomain.com"]
# DOMAINS = ["newdomain.com"]

# 2. 重新部署 Worker
cd worker
wrangler deploy

# 3. 重新配置 Email Routing
# 在 Cloudflare Dashboard 中为新域名配置 Email Routing

# 4. 更新前端配置（如果 Worker URL 改变）
cd ../frontend
echo 'VITE_API_BASE=https://new-worker-url.workers.dev' > .env.local
pnpm build --emptyOutDir
cd ..
wrangler pages deploy frontend/dist --project-name temp-mail-frontend --commit-dirty=true
```

## 🔒 安全最佳实践

### 1. 保护敏感信息

```bash
# 使用环境变量而不是硬编码
export ADMIN_PASSWORD=$(openssl rand -base64 24)
export JWT_SECRET=$(openssl rand -base64 32)

# 在 wrangler.toml 中引用
# ADMIN_PASSWORDS = ["${ADMIN_PASSWORD}"]
# JWT_SECRET = "${JWT_SECRET}"
```

### 2. 限制 API 访问

在 Worker 代码中添加 IP 白名单：

```javascript
// worker/src/middleware/ipWhitelist.ts
const ALLOWED_IPS = [
  '你的IP地址',
  '另一个IP地址'
];

export function checkIPAccess(request: Request): boolean {
  const ip = request.headers.get('CF-Connecting-IP');
  return ALLOWED_IPS.includes(ip || '');
}
```

### 3. 定期清理数据

已配置自动清理任务，也可以手动清理：

```bash
# 清理 7 天前的邮件
wrangler d1 execute temp_mail_db --remote --command "
DELETE FROM raw_mails WHERE created_at < datetime('now', '-7 days');
"

# 清理未使用的邮箱地址
wrangler d1 execute temp_mail_db --remote --command "
DELETE FROM address WHERE created_at < datetime('now', '-30 days') 
AND id NOT IN (SELECT DISTINCT address_id FROM raw_mails);
"
```

### 4. 监控使用情况

```bash
# 查看邮件数量
wrangler d1 execute temp_mail_db --remote --command "
SELECT COUNT(*) as total_mails FROM raw_mails;
"

# 查看邮箱数量
wrangler d1 execute temp_mail_db --remote --command "
SELECT COUNT(*) as total_addresses FROM address;
"

# 查看今日邮件
wrangler d1 execute temp_mail_db --remote --command "
SELECT COUNT(*) as today_mails FROM raw_mails 
WHERE created_at > datetime('now', '-1 day');
"
```

## 📊 性能优化

### 1. 启用 KV 缓存

```bash
# 创建 KV 命名空间
wrangler kv:namespace create "CACHE"

# 在 wrangler.toml 中添加
# [[kv_namespaces]]
# binding = "KV"
# id = "your_kv_id"
```

### 2. 配置 CDN 缓存

在 Cloudflare Dashboard 中：
- Page Rules → Create Page Rule
- URL: `mail.yourdomain.com/*`
- Cache Level: Cache Everything
- Edge Cache TTL: 1 hour

### 3. 优化数据库查询

```sql
-- 为常用查询添加索引
CREATE INDEX IF NOT EXISTS idx_raw_mails_created_at ON raw_mails(created_at);
CREATE INDEX IF NOT EXISTS idx_address_email ON address(email);
```

## 📝 维护检查清单

### 每日检查
- [ ] Worker 运行状态
- [ ] 前端可访问性
- [ ] 邮件接收功能

### 每周检查
- [ ] 数据库大小
- [ ] 邮件数量
- [ ] 错误日志

### 每月检查
- [ ] 清理旧数据
- [ ] 更新依赖
- [ ] 安全审计

## 📞 技术支持

### 官方资源
- [项目 GitHub](https://github.com/dreamhunter2333/cloudflare_temp_email)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Email Routing 文档](https://developers.cloudflare.com/email-routing/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)

### 社区支持
- [Cloudflare Community](https://community.cloudflare.com/)
- [项目讨论区](https://github.com/dreamhunter2333/cloudflare_temp_email/discussions)
- [项目 Issues](https://github.com/dreamhunter2333/cloudflare_temp_email/issues)

### 项目文件位置
- **本地路径**: `/home/leiyi/codeSpace/cloudflare_temp_email`
- **Worker 配置**: `/home/leiyi/codeSpace/cloudflare_temp_email/worker/wrangler.toml`
- **前端配置**: `/home/leiyi/codeSpace/cloudflare_temp_email/frontend/.env.local`

---

## 📋 快速参考

### 常用命令

```bash
# 部署 Worker
cd worker && wrangler deploy

# 部署前端
cd frontend && pnpm build --emptyOutDir && cd .. && \
wrangler pages deploy frontend/dist --project-name temp-mail-frontend --commit-dirty=true

# 查看日志
wrangler tail

# 数据库查询
wrangler d1 execute temp_mail_db --remote --command "YOUR_SQL"

# 清理旧邮件
wrangler d1 execute temp_mail_db --remote --command \
"DELETE FROM raw_mails WHERE created_at < datetime('now', '-7 days');"
```

### API 端点

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/` | GET | 健康检查 | 无 |
| `/admin/new_address` | POST | 创建邮箱 | X-Admin-Auth |
| `/api/mails` | GET | 获取邮件列表 | Bearer Token |
| `/api/mails/:id` | GET | 获取邮件详情 | Bearer Token |
| `/api/mails/:id` | DELETE | 删除邮件 | Bearer Token |

### 配置参数速查

| 参数 | 说明 | 示例 |
|------|------|------|
| `PREFIX` | 邮箱前缀 | `tmp` |
| `DEFAULT_DOMAINS` | 默认域名 | `["yourdomain.com"]` |
| `JWT_SECRET` | JWT 密钥 | 32位随机字符串 |
| `ADMIN_PASSWORDS` | 管理员密码 | `["password"]` |
| `ENABLE_USER_CREATE_EMAIL` | 允许创建邮箱 | `true` |
| `ENABLE_USER_DELETE_EMAIL` | 允许删除邮件 | `true` |
| `ENABLE_AUTO_REPLY` | 自动回复 | `false` |

---

**文档版本**: 2.1.0  
**最后更新**: 2025-10-29  
**维护者**: Auto-Cursor Team

**部署实例**:
- Worker: https://temp-mail-worker.gmartnlei.workers.dev
- Frontend: https://8edfdf8d.temp-mail-frontend-bzd.pages.dev
- Domain: codefog.cc
- 部署状态: ✅ 已验证成功（2025-10-29 14:13）

**验证结果**:
- ✅ 所有组件部署成功
- ✅ Email Routing 配置正确
- ✅ 邮件接收功能正常
- ✅ 前端界面功能完整
- ✅ API 接口工作正常

**测试邮箱**:
- tmpready2025@codefog.cc（已验证可接收邮件）

