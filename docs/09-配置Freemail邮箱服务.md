# 09 - 配置 Freemail 邮箱服务

## 📋 概述

本教程将指导你如何将已部署的 Freemail 服务（`https://mail.codewith.site/`）配置到 Auto-Cursor 的自动注册功能中，实现完全自动化的账号注册流程。

## 🎯 配置目标

完成配置后，自动注册功能将能够：
- ✅ 自动生成临时邮箱
- ✅ 自动接收验证码邮件
- ✅ 自动提取验证码
- ✅ 完成整个注册流程（无需手动干预）

## 📝 准备工作

### 1. 确认 Freemail 服务信息

你需要知道以下信息（这些是你在部署 Freemail 时配置的）：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **Worker 域名** | Cloudflare Worker 的访问域名 | `mail.codewith.site` |
| **邮箱域名** | 临时邮箱的域名后缀（MAIL_DOMAIN） | `codewith.site` |
| **管理员密码** | 访问 Worker 的管理员密码（ADMIN_PASSWORD） | `your_admin_password` |

### 2. 验证 Freemail 服务状态

在配置前，先确认你的 Freemail 服务正常运行：

#### 方法一：访问前端页面
```
打开浏览器访问: https://mail.codewith.site/
应该能看到 Freemail 的界面
```

#### 方法二：测试 API
```bash
# 测试健康检查接口
curl https://mail.codewith.site/health

# 应该返回类似:
# {"status":"ok","timestamp":"2025-10-28T..."}
```



#### 方法三：测试创建邮箱
```bash
# 测试创建临时邮箱（需要管理员密码）
curl -X POST https://mail.codewith.site/admin/new_address \
  -H "X-Admin-Auth: your_admin_password" \
  -H "Content-Type: application/json" \
  -d '{
    "enablePrefix": true,
    "name": "test123",
    "domain": "codewith.site"
  }'

# 成功应该返回:
# {"jwt":"eyJhbGc...","address":"test123@codewith.site"}
```

---

## 🔧 配置步骤

### 方式一：通过界面配置（推荐）

#### 步骤 1：打开 Auto-Cursor 应用

启动 Auto-Cursor 应用程序。

#### 步骤 2：进入自动注册页面

在左侧导航栏点击 **"自动注册"** 菜单。

#### 步骤 3：找到邮箱配置区域

在页面中找到 **"Cloudflare 临时邮箱配置"** 卡片，应该显示类似：

```
📧 Cloudflare 临时邮箱配置
Worker域名: 未配置 | 邮箱域名: 未配置 | 密码: 未配置
[编辑] 按钮
```

#### 步骤 4：点击"编辑"按钮

点击 **"编辑"** 按钮，会弹出邮箱配置对话框。

#### 步骤 5：填写配置信息

在弹出的对话框中填写以下信息：

**Worker 域名**：
```
mail.codewith.site
```
> 注意：不要加 `https://` 前缀，只填写域名

**邮箱域名**：
```
codewith.site
```
> 这是你在 Freemail 部署时配置的 MAIL_DOMAIN 环境变量

**管理员密码**：
```
[你的 ADMIN_PASSWORD]
```
> 这是你在 Freemail 部署时设置的管理员密码

#### 步骤 6：测试连接

填写完成后，点击 **"测试连接"** 按钮。

**成功提示**：
```
✅ 邮箱服务连接成功！
```

**失败提示及解决方案**：

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `连接超时` | Worker 域名错误或服务未启动 | 检查域名是否正确，访问 https://mail.codewith.site/ 确认服务运行 |
| `401 Unauthorized` | 管理员密码错误 | 检查 ADMIN_PASSWORD 是否正确 |
| `404 Not Found` | API 路径错误 | 确认 Freemail 版本是否支持 `/admin/new_address` 接口 |
| `邮箱域名不存在` | 邮箱域名配置错误 | 检查 MAIL_DOMAIN 环境变量 |

#### 步骤 7：保存配置

测试成功后，点击 **"保存配置"** 按钮。

**成功提示**：
```
✅ 邮箱配置保存成功！
```

配置会自动保存到本地，下次使用时无需重新配置。

---

### 方式二：通过配置文件（高级用户）

如果你需要批量配置或备份配置，可以直接编辑配置文件。

#### 配置文件位置

配置文件保存在应用数据目录：

**Windows**：
```
C:\Users\你的用户名\AppData\Roaming\com.auto-cursor.dev\email_config.json
```

**macOS**：
```
~/Library/Application Support/com.auto-cursor.dev/email_config.json
```

**Linux**：
```
~/.config/com.auto-cursor.dev/email_config.json
```

#### 配置文件格式

```json
{
  "worker_domain": "mail.codewith.site",
  "email_domain": "codewith.site",
  "admin_password": "your_admin_password"
}
```

#### 手动编辑步骤

1. **关闭 Auto-Cursor 应用**

2. **找到配置文件**（如果不存在则创建）

3. **编辑配置文件**，填入你的配置信息

4. **保存文件**

5. **重新启动 Auto-Cursor**

---

## ✅ 验证配置

### 测试自动注册功能

配置完成后，测试一下是否能正常使用：

#### 1. 选择邮箱类型

在自动注册页面，选择 **"Cloudflare 临时邮箱（自动获取验证码）"**

#### 2. 填写用户信息

```
名字: Test
姓氏: User
```

或点击 **"生成随机信息"** 按钮自动生成。

#### 3. 开始注册

点击 **"开始注册"** 按钮。

#### 4. 观察日志输出

你应该能看到类似的日志：

```
📧 创建的临时邮箱: abc123@codewith.site
🌐 访问注册页面...
✍️ 填写注册表单...
⏳ 等待验证码邮件...
📬 收到验证码邮件
🔑 提取到验证码: 123456
✅ 注册成功！
```

#### 5. 检查结果

注册成功后，应该能在 **"账号管理"** 页面看到新创建的账号。

---

## 🔍 故障排除

### 问题 1：测试连接失败

**错误信息**：
```
❌ 邮箱服务连接失败: 创建邮箱请求失败: error sending request for url
```

**可能原因**：
1. Worker 域名错误
2. 网络连接问题
3. Cloudflare Worker 服务未启动

**解决方案**：

1. **检查域名是否正确**
```bash
# 测试域名是否可访问
curl -I https://mail.codewith.site/

# 应该返回 200 OK
```

2. **检查网络连接**
```bash
# 测试网络连接
ping mail.codewith.site
```

3. **检查 Worker 状态**
   - 登录 Cloudflare Dashboard
   - 进入 Workers & Pages
   - 确认 Worker 状态为 "Active"

### 问题 2：创建邮箱失败（401）

**错误信息**：
```
❌ 创建邮箱失败: 401 Unauthorized
```

**原因**：管理员密码错误

**解决方案**：

1. **确认 Cloudflare Worker 的环境变量**
```bash
# 登录 Cloudflare Dashboard
# Workers & Pages → 你的 Worker → Settings → Variables
# 检查 ADMIN_PASSWORD 的值
```

2. **重新设置密码**（如果忘记了）
```bash
# 使用 wrangler 重新设置
wrangler secret put ADMIN_PASSWORD
# 输入新密码

# 重新部署
npx wrangler deploy
```

3. **在 Auto-Cursor 中更新密码**
   - 打开邮箱配置
   - 更新管理员密码
   - 测试连接

### 问题 3：邮箱域名不存在

**错误信息**：
```
❌ 邮箱域名 'codewith.site' 不存在或未配置
```

**原因**：MAIL_DOMAIN 环境变量未配置或配置错误

**解决方案**：

1. **检查 Cloudflare Worker 环境变量**
```bash
# 在 Cloudflare Dashboard 中检查
# Workers & Pages → 你的 Worker → Settings → Variables
# 确认 MAIL_DOMAIN 的值
```

2. **MAIL_DOMAIN 应该配置为**：
```
codewith.site
```
或
```
mail.codewith.site,codewith.site
```
（如果有多个域名，用逗号分隔）

3. **重新部署 Worker**
```bash
npx wrangler deploy
```

### 问题 4：收不到验证码邮件

**症状**：注册流程卡在 "等待验证码邮件" 步骤

**可能原因**：
1. Email Routing 未配置
2. MX 记录未生效
3. Catch-all 规则未绑定到 Worker

**解决方案**：

1. **检查 Email Routing 配置**
   - 登录 Cloudflare Dashboard
   - 进入域名管理 → Email Routing
   - 确认状态为 "Active"

2. **检查 MX 记录**
```bash
dig MX codewith.site

# 应该看到 Cloudflare 的 MX 记录：
# codewith.site. 300 IN MX 10 route1.mx.cloudflare.net.
# codewith.site. 300 IN MX 10 route2.mx.cloudflare.net.
# codewith.site. 300 IN MX 10 route3.mx.cloudflare.net.
```

3. **检查 Catch-all 规则**
   - Email Routing → Routing Rules
   - 确认有 Catch-all 规则
   - 目标应该是 "Send to Worker: temp-mail-worker"

4. **手动测试邮件接收**
```bash
# 发送测试邮件
echo "Test email" | mail -s "Test" test@codewith.site

# 在 Freemail 前端查看是否收到
```

### 问题 5：验证码提取失败

**症状**：收到邮件但无法提取验证码

**可能原因**：
1. 邮件格式不符合预期
2. 验证码正则表达式不匹配

**解决方案**：

1. **查看邮件原始内容**
   - 在 Freemail 前端打开邮件
   - 查看邮件内容
   - 确认验证码格式

2. **检查 Python 脚本的验证码提取逻辑**
```python
# 在 src-tauri/python_scripts/ 中查找验证码提取代码
# 通常使用正则表达式: r'\b\d{6}\b'
```

3. **手动测试验证码提取**
```python
import re
email_content = "Your verification code is: 123456"
match = re.search(r'\b\d{6}\b', email_content)
if match:
    print(f"验证码: {match.group()}")
```

---

## 🎨 配置示例

### 示例 1：基本配置

```json
{
  "worker_domain": "mail.codewith.site",
  "email_domain": "codewith.site",
  "admin_password": "MySecurePassword123"
}
```

### 示例 2：多域名配置

如果你的 Freemail 支持多个邮箱域名：

**Cloudflare Worker 环境变量**：
```
MAIL_DOMAIN=codewith.site,temp.codewith.site,mail.codewith.site
```

**Auto-Cursor 配置**（选择其中一个）：
```json
{
  "worker_domain": "mail.codewith.site",
  "email_domain": "codewith.site",
  "admin_password": "MySecurePassword123"
}
```

### 示例 3：使用子域名

**Cloudflare Worker 环境变量**：
```
MAIL_DOMAIN=temp.codewith.site
```

**Auto-Cursor 配置**：
```json
{
  "worker_domain": "mail.codewith.site",
  "email_domain": "temp.codewith.site",
  "admin_password": "MySecurePassword123"
}
```

---

## 🔒 安全建议

### 1. 保护管理员密码

- ✅ 使用强密码（至少 16 位，包含大小写字母、数字、特殊字符）
- ✅ 不要在代码中硬编码密码
- ✅ 定期更换密码
- ✅ 不要在公共场合分享密码

**生成强密码**：
```bash
# Linux/Mac
openssl rand -base64 24

# 或使用密码管理器生成
```

### 2. 限制 Worker 访问

在 Cloudflare Worker 中添加 IP 白名单：

```javascript
// src/index.js
const ALLOWED_IPS = [
  '你的IP地址',
  '服务器IP地址'
];

function checkIPAccess(request) {
  const ip = request.headers.get('CF-Connecting-IP');
  return ALLOWED_IPS.includes(ip);
}
```

### 3. 使用 HTTPS

确保所有通信都通过 HTTPS：
- ✅ Worker 域名使用 HTTPS
- ✅ 前端页面使用 HTTPS
- ✅ API 请求使用 HTTPS

### 4. 监控异常访问

在 Cloudflare Dashboard 中监控：
- Worker 请求量
- 错误率
- 异常 IP 访问

---

## 📊 性能优化

### 1. 配置缓存

在 Auto-Cursor 中，邮箱配置会缓存到本地，避免重复请求。

### 2. 并发控制

批量注册时，建议：
- 每批次 3-5 个账号
- 间隔 10-30 秒
- 避免触发 Cloudflare 速率限制

### 3. 超时设置

合理设置超时时间：
- 创建邮箱：5 秒
- 等待验证码：60 秒
- API 请求：10 秒

---

## 📝 配置检查清单

在开始使用前，请确认以下项目：

- [ ] Freemail 服务已部署并正常运行
- [ ] 可以访问 https://mail.codewith.site/
- [ ] Email Routing 已配置
- [ ] MX 记录已生效
- [ ] Catch-all 规则已绑定到 Worker
- [ ] MAIL_DOMAIN 环境变量已配置
- [ ] ADMIN_PASSWORD 环境变量已配置
- [ ] 在 Auto-Cursor 中填写了正确的配置
- [ ] 测试连接成功
- [ ] 配置已保存
- [ ] 能够成功创建临时邮箱
- [ ] 能够接收验证码邮件
- [ ] 能够自动提取验证码
- [ ] 完整的注册流程测试通过

---

## 🎯 使用技巧

### 1. 批量注册

配置完成后，可以使用批量注册功能：

1. 选择 "Cloudflare 临时邮箱"
2. 设置批量数量（建议 3-5 个）
3. 点击 "批量注册"
4. 等待所有账号注册完成

### 2. 邮箱管理

你可以在 Freemail 前端查看所有临时邮箱：
- 访问 https://mail.codewith.site/admin
- 使用管理员密码登录
- 查看所有邮箱和邮件

### 3. 邮件转发

如果需要将验证码邮件转发到你的真实邮箱：

在 Cloudflare Worker 环境变量中配置：
```
FORWARD_RULES=*=your-email@example.com
```

### 4. 自动清理

Freemail 会自动清理过期邮件（默认 7 天），无需手动管理。

---

## 🔗 相关资源

### 文档
- [Freemail 部署教程](./08-Freemail部署教程.md)
- [自动注册功能说明](./05-自动注册.md)
- [Freemail GitHub](https://github.com/idinging/freemail)

### 工具
- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [MX Toolbox](https://mxtoolbox.com/) - 测试邮件配置
- [DNS Checker](https://dnschecker.org/) - 检查 DNS 记录

### 支持
- Freemail 作者微信：`iYear1213`
- Auto-Cursor GitHub Issues

---

## 🆘 获取帮助

如果遇到问题：

1. **查看日志**
   - Auto-Cursor 应用中的实时日志
   - Cloudflare Worker 日志（`wrangler tail`）

2. **检查配置**
   - 确认所有配置项都正确填写
   - 使用"测试连接"功能验证

3. **查看文档**
   - 本文档的故障排除章节
   - Freemail 部署教程

4. **寻求支持**
   - GitHub Issues
   - 社区论坛

---

## 📈 配置完成后的效果

配置成功后，你将获得：

### ✅ 完全自动化的注册流程

```
1. 点击"开始注册"
   ↓
2. 自动生成临时邮箱（abc123@codewith.site）
   ↓
3. 自动填写注册表单
   ↓
4. 自动等待验证码邮件
   ↓
5. 自动提取验证码（123456）
   ↓
6. 自动完成注册
   ↓
7. 注册成功！✅
```

### ✅ 批量注册能力

- 一次注册多个账号
- 自动分配临时邮箱
- 并行处理，提高效率
- 自动保存账号信息

### ✅ 无需手动干预

- 不需要手动输入验证码
- 不需要管理邮箱
- 不需要清理邮件
- 完全自动化

---

**最后更新**：2025-10-28  
**文档版本**：1.0.0  
**适用版本**：Auto-Cursor v1.0+

---

## 💡 常见问题 FAQ

### Q1: 配置后多久生效？

**A**: 立即生效。保存配置后，下次注册就会使用新配置。

### Q2: 可以使用多个 Freemail 服务吗？

**A**: 目前只支持配置一个 Freemail 服务。如果需要切换，重新配置即可。

### Q3: 临时邮箱会过期吗？

**A**: 是的。Freemail 默认会清理 7 天前的邮件和 30 天前的邮箱。

### Q4: 配置信息存储在哪里？

**A**: 存储在本地应用数据目录，不会上传到云端。

### Q5: 可以导出配置吗？

**A**: 可以。配置文件是 JSON 格式，可以直接复制备份。

### Q6: 忘记管理员密码怎么办？

**A**: 需要在 Cloudflare Dashboard 中重新设置 ADMIN_PASSWORD 环境变量。

### Q7: 为什么测试连接成功，但注册时失败？

**A**: 可能是 Email Routing 未配置或 MX 记录未生效。请检查邮件路由配置。

### Q8: 可以使用自己的域名吗？

**A**: 可以。只要在 Cloudflare 上托管域名，并正确配置 Email Routing 即可。

### Q9: 支持哪些邮箱域名？

**A**: 支持你在 Freemail 的 MAIL_DOMAIN 环境变量中配置的所有域名。

### Q10: 如何提高注册成功率？

**A**: 
- 确保 Freemail 服务稳定运行
- 使用真实的用户信息
- 避免频繁注册（建议间隔 10-30 秒）
- 检查网络连接

