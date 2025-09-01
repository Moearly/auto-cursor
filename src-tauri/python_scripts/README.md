# Auto-Cursor 精简版Python注册功能

## 🎯 项目概述

这是精简版的Cursor自动注册功能，只保留**手动自定义邮箱注册**功能，大幅减小了项目体积。

## 📁 文件结构

```
python_scripts/
├── venv/                       # Python虚拟环境 (被git忽略)
├── manual_register.py          # 🚀 主要注册脚本
├── run_manual_register.sh      # Shell启动脚本
├── cursor_register_manual.py   # 原始注册逻辑
├── cursor_auth.py              # 认证模块
├── get_user_token.py           # 获取令牌
├── account_manager.py          # 账户管理
├── reset_machine_manual.py     # 机器ID重置
├── config.py                   # 配置管理
├── utils.py                    # 工具函数
├── email_tabs/                 # 邮箱相关功能
├── requirements_minimal.txt    # 精简依赖列表
├── .gitignore                  # Git忽略文件
└── README.md                   # 本文档
```

## 🚀 功能特点

✅ **仅保留手动注册功能** - 对应原项目菜单选项2  
✅ **支持自定义邮箱注册** - 可指定任意邮箱地址  
✅ **自动生成用户信息** - 使用Faker生成姓名  
✅ **精简依赖** - 只保留必要的Python包  
✅ **中文界面** - 移除多语言支持，统一使用中文  
✅ **虚拟环境隔离** - 避免全局Python环境污染  

## 📦 依赖列表

```
colorama>=0.4.6      # 彩色终端输出
requests>=2.28.0     # HTTP请求
DrissionPage>=4.0.0  # 浏览器自动化
faker>=15.0.0        # 假数据生成
python-dotenv>=1.0.0 # 环境变量管理
```

## 🔧 使用方法

### 1. 直接使用Python脚本
```bash
# 激活虚拟环境
source venv/bin/activate

# 使用指定邮箱注册
python manual_register.py test@example.com John Smith

# 使用随机生成的姓名
python manual_register.py test@example.com
```

### 2. 使用Shell脚本（推荐）
```bash
# 自动激活虚拟环境并执行
./run_manual_register.sh test@example.com John Smith
```

### 3. 通过Tauri调用
Tauri后端会自动调用shell脚本进行注册。

## 📊 响应格式

成功响应：
```json
{
  "success": true,
  "email": "test@example.com",
  "first_name": "John",
  "last_name": "Smith",
  "message": "注册成功",
  "status": "completed"
}
```

需要验证：
```json
{
  "success": true,
  "email": "test@example.com",
  "first_name": "John",
  "last_name": "Smith",
  "message": "注册成功，需要邮箱验证",
  "status": "verification_needed"
}
```

失败响应：
```json
{
  "success": false,
  "error": "详细错误信息"
}
```

## 🛠️ Tauri集成

### Rust命令
- `register_cursor_account(first_name, last_name)` - 生成随机邮箱注册
- `register_with_email(email, first_name, last_name)` - 使用指定邮箱注册

### 后端实现
```rust
// 生成随机邮箱并注册
let random_email = format!("{}{}{}@gmail.com", 
    first_name.to_lowercase(), 
    last_name.to_lowercase(), 
    rand::random::<u32>() % 1000);

// 调用Shell脚本
Command::new("bash")
    .arg(&shell_script)
    .arg(&email)
    .arg(&first_name)
    .arg(&last_name)
    .spawn()
```

## 📂 Git管理

### .gitignore配置
虚拟环境和临时文件已被Git忽略：
- `venv/` - Python虚拟环境
- `__pycache__/` - Python字节码
- `*.log` - 日志文件
- 其他临时文件

### 首次设置
```bash
# 克隆项目后需要重新创建虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_minimal.txt
```

## 🎯 精简优化

### 已删除的功能
- ❌ 多语言支持（locales/）
- ❌ Google OAuth注册
- ❌ GitHub OAuth注册  
- ❌ 自动更新功能
- ❌ 完全重置功能
- ❌ 令牌绕过功能
- ❌ 版本检查绕过
- ❌ 图片资源文件
- ❌ 构建打包脚本
- ❌ 文档和许可证文件

### 体积对比
- **原项目**: ~50MB+ (包含所有功能)
- **精简版**: ~15MB (仅核心注册功能)
- **减少约**: 70%的文件和依赖

## ⚠️ 注意事项

1. **浏览器要求**: 需要Chrome/Chromium浏览器
2. **网络连接**: 需要稳定的网络连接
3. **虚拟环境**: 首次使用需要重新安装依赖
4. **权限问题**: 确保shell脚本有执行权限

## 🔄 更新维护

需要更新功能时：
1. 修改 `manual_register.py`
2. 测试：`./run_manual_register.sh test@example.com`
3. 重新构建Tauri应用

## 🎉 优势总结

- 🎯 **专注核心功能** - 只保留手动注册
- 📦 **体积大幅减少** - 删除70%不需要的文件
- 🔧 **维护更简单** - 减少复杂性和依赖
- 🚀 **加载更快速** - 更少的模块导入
- 🛡️ **环境更干净** - 精简的虚拟环境