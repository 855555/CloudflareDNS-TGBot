# CloudflareDNS-TGBot（1Panel部署教程）
![image](https://github.com/user-attachments/assets/dbbe3d73-2555-4fec-bc38-39a3c51fd397)

在 Linux 系统中，使用以下命令来安装 Git：

## 步骤 1: 安装 git

```bash
```bash
sudo apt update
sudo apt install git -y
```


## 步骤 2: 检验安装是否成功

安装完成后，可以通过以下命令检查 Git 是否已正确安装：

```bash
git --version
```

## 步骤 3: 拉取项目

```bash
git clone https://github.com/Venompool888/CloudflareDNS-TGBot.git
cd CloudflareDNS-TGBot
```
## 步骤 4: 配置环境变量

在项目根目录下创建一个 `.env` 文件(如果有，就不用创建直接打开)，并根据以下模板填写内容：

```env
BOT_TOKEN=your-telegram-bot-token-here
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token-here
ALLOWED_USERS=123456789  # tg user id 多用户用逗号隔开
```
* [✈️ 如何获得 telegram-bot-token？](https://github.com/Venompool888/CloudflareDNS-TGBot/tree/main?tab=readme-ov-file#%EF%B8%8F-%E5%A6%82%E4%BD%95%E8%8E%B7%E5%BE%97-telegram-bot-token)
* [☁️ 如何获得 cloudflare-api-token？](https://github.com/Venompool888/CloudflareDNS-TGBot/tree/main?tab=readme-ov-file#%EF%B8%8F-%E5%A6%82%E4%BD%95%E8%8E%B7%E5%BE%97-cloudflare-api-token)
* [👤 如何获得 telegram-user-id？](https://github.com/Venompool888/CloudflareDNS-TGBot/blob/main/README.md#-%E5%A6%82%E4%BD%95%E8%8E%B7%E5%BE%97-telegram-user-id)

## 步骤 5：1Panel➡️`应用商店`➡️搜索`node`➡️安装`Node.js`
![image](https://github.com/user-attachments/assets/44b54b27-f0c0-4bb1-9603-ad988c819a79)

## 步骤 6：网站➡️`运行环境`➡️`Node.js`➡️`创建运行环境`
![image](https://github.com/user-attachments/assets/d0441643-f5f9-46d7-a8f0-530858d04bf6)

## 步骤 7：✏️填写名称➡️选择源码目录➡️
![image](https://github.com/user-attachments/assets/e831d4d8-e44f-4d6b-8a43-9fefbd5485b7)

## 步骤 8：✅启动！
![image](https://github.com/user-attachments/assets/cd68eea2-7417-4a23-8a3f-b3088fb16f3e)
![image](https://github.com/user-attachments/assets/79b90c54-242b-4cb6-987f-0d9c2dbc1e14)


