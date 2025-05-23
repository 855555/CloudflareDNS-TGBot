# CloudflareDNS-TGBot
![image](https://github.com/user-attachments/assets/dbbe3d73-2555-4fec-bc38-39a3c51fd397)

[1Panel部署请点这里](https://github.com/Venompool888/CloudflareDNS-TGBot/blob/main/1panel-readme.md)
[Docker部署请点这里](https://github.com/Venompool888/CloudflareDNS-TGBot/blob/main/docker-readme.md)

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

在项目根目录下创建一个 `.env` 文件（如果已经有了，就直接打开），并根据以下模板填写内容：

```env
BOT_TOKEN=your-telegram-bot-token-here
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token-here
ALLOWED_USERS=123456789  # tg user id 多用户用逗号隔开
```

确保将 `your-telegram-bot-token-here` 和 `your-cloudflare-api-token-here` 替换为实际的 Telegram Bot Token 和 Cloudflare API Token。

* [✈️ 如何获得 telegram-bot-token？](https://github.com/Venompool888/CloudflareDNS-TGBot/tree/main?tab=readme-ov-file#%EF%B8%8F-%E5%A6%82%E4%BD%95%E8%8E%B7%E5%BE%97-telegram-bot-token)
* [☁️ 如何获得 cloudflare-api-token？](https://github.com/Venompool888/CloudflareDNS-TGBot/tree/main?tab=readme-ov-file#%EF%B8%8F-%E5%A6%82%E4%BD%95%E8%8E%B7%E5%BE%97-cloudflare-api-token)
* [👤 如何获得 telegram-user-id？](https://github.com/Venompool888/CloudflareDNS-TGBot/blob/main/README.md#-%E5%A6%82%E4%BD%95%E8%8E%B7%E5%BE%97-telegram-user-id)

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

## 🧩额外补充

### ✈️ 如何获得 telegram-bot-token？

* 搜索或直接访问 [https://t.me/BotFather](https://t.me/BotFather)  
![image](https://github.com/user-attachments/assets/cd4c71d0-094b-4be8-91fa-7126c23148e0)  

* 使用 `/newbot` 创建一个新的机器人  
![image](https://github.com/user-attachments/assets/bdd5fcb8-9028-4e7a-b0f0-0e3690b5df4b)

* 依次输入`机器人的昵称`和`user name`, 然后复制`bot_token`
![image](https://github.com/user-attachments/assets/6431b548-b2fb-48c4-bbdd-02638639df92)

### ☁️ 如何获得 cloudflare-api-token？

* 访问 [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
* 点击 `创建令牌`
  ![image](https://github.com/user-attachments/assets/e6998060-da89-489d-a405-4f51a6fd677a)

* 选择 `编辑区域 DNS`
  ![image](https://github.com/user-attachments/assets/0094eba2-fe4b-4f31-ac1a-6d0f8ed7e689)

* 选择 `所有区域`, 然后点击 `继续以显示摘要`
  ![image](https://github.com/user-attachments/assets/140e69b2-53a0-4ddf-82ce-c237c3b2dd97)

* 点击 `创建令牌`
  ![image](https://github.com/user-attachments/assets/5d0920c9-e321-49ec-84e8-afaa4144e1b5)

* 点击 `Copy`
  > ⚠️注意：此页面只能显示一次，关闭此页面后将不会再次显示
  
  ![image](https://github.com/user-attachments/assets/2c8a4111-5642-4cb0-b13e-e7277707d291)

### 👤 如何获得 telegram-user-id？
* 搜索或直接访问[https://t.me/userinfobot](https://t.me/userinfobot)
  可以直接获得你自己的 user id
  ![image](https://github.com/user-attachments/assets/e2d532c1-6e99-44e5-8569-3c1b1399f8c1)


* 部分第三方菜 telegram 客户端可以直接获得别的用户的 user id (这里使用的是 [Nekogram](https://nekogram.app/) )
  ![image](https://github.com/user-attachments/assets/86281e1d-e8c9-4319-8e9e-c39d2fc87f9b)


---

  






