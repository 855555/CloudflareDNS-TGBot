# 📡 cf-dnseditor-telegram

一个使用 [Telegraf](https://telegraf.js.org/) 构建的 Telegram Bot，可用于通过 Cloudflare API 管理 DNS 记录。

---

## 🚀 功能特性

- ✅ 添加 DNS 记录（A / CNAME）
- ✅ 修改现有记录
- ✅ 删除记录
- ✅ 自动识别记录类型（IP ➜ A 记录 / 域名 ➜ CNAME）
- ✅ 支持多域名管理
- ✅ 用户交互采用按钮 + 文本回复结合，友好直观

---

## 📦 安装与运行

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/cf-dnseditor-telegram.git
cd cf-dnseditor-telegram
