# CloudflareDNS-TGBot


在 Linux 系统中，使用以下命令来安装 Git：

## 步骤 1: 安装 git

```bash
```bash
sudo apt update
sudo apt install git -y && sudo apt install nodejs npm
```

> 提示：这可能会花点时间，尤其是在性能不太突出的 VPS 上。

## 步骤 2: 检验安装是否成功

安装完成后，可以通过以下命令检查 Git 和 Node.js 是否已正确安装：

```bash
git --version
node -v
npm -v
```

如果这些命令返回了相应的版本号，说明安装成功。  
![image](https://github.com/user-attachments/assets/d6f68ba9-3a09-4517-b1ca-9bba2550d17b)


## 步骤 3: 拉取项目

```bash
git clone https://github.com/Venompool888/CloudflareDNS-TGBot.git
cd CloudflareDNS-TGBot
```

## 步骤 4: 安装依赖

进入项目目录后，运行以下命令安装所需的依赖：

```bash
npm install
```
![image](https://github.com/user-attachments/assets/89e4509f-d179-4e2d-a333-d1f91a516e5a)

## 步骤 5: 配置环境变量

在项目根目录下创建一个 `.env` 文件，并根据以下模板填写内容：

```env
BOT_TOKEN=your-telegram-bot-token-here
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token-here
ALLOWED_USERS=123456789  # 多用户用逗号隔开
```

确保将 `your-telegram-bot-token-here` 和 `your-cloudflare-api-token-here` 替换为实际的 Telegram Bot Token 和 Cloudflare API Token。

## 步骤 6: 启动项目

运行以下命令启动项目：

### 正式模式
```bash
npm start
```

### 开发模式（自动重启）
```bash
npm run dev
```

## 步骤 7: 使用机器人

在 Telegram 中找到你的机器人，发送 `/start` 命令开始使用。

---

## 常见问题

### 1. 如何获取 Telegram Bot Token？
请参考 [Telegram BotFather](https://core.telegram.org/bots#botfather) 的官方文档，创建一个新的机器人并获取 Token。

### 2. 如何获取 Cloudflare API Token？
登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **My Profile**，在 **API Tokens** 页面创建一个具有 Zone 权限的 Token。

### 3. 启动时报错 `Error: Missing API Token`
请检查 `.env` 文件是否正确配置，并确保 `CLOUDFLARE_API_TOKEN` 已填写。

---

