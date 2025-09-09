# Cursor自动注册 - 可执行文件

## 📦 打包信息
- 平台: windows
- 可执行文件: cursor_register.exe
- 打包时间: 2025-09-10 00:10:33

## 🚀 使用方法

```bash
# 基本用法（默认启用无痕模式和银行卡绑定）
./cursor_register.exe test@example.com John Smith

# 只提供邮箱（会生成随机姓名）
./cursor_register.exe test@example.com

# 完整参数用法
./cursor_register.exe test@example.com John Smith true . true

# 参数说明:
# 参数1: 邮箱地址 (必需)
# 参数2: 名字 (可选，默认: Auto)
# 参数3: 姓氏 (可选，默认: Generated)
# 参数4: 无痕模式 (可选，默认: true)
# 参数5: 应用目录 (可选，默认: .)
# 参数6: 银行卡绑定 (可选，默认: true)
```

## 📊 响应格式

成功:
```json
{"success": true, "email": "test@example.com", "message": "注册成功"}
```

失败:
```json
{"success": false, "error": "错误信息"}
```

## ⚠️ 注意事项

1. 需要Chrome/Chromium浏览器
2. 需要稳定的网络连接
3. 首次运行可能需要较长时间加载
