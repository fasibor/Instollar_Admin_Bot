# ⚡ Instollar Admin Bot

> **Automated Community Management for Solar Installation Teams**

A powerful Telegram bot designed to streamline communication, gig distribution, and project updates for the Instollar solar installer community. Centralize announcements, celebrate completed installations, and keep your team engaged—all in one place.

<div align="center">

![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=flat&logo=telegram&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)

</div>

---

## 🎯 What Does This Bot Do?

The Instollar Admin Bot is your **command center** for managing solar installation teams. It automates community updates, tracks daily activity, and makes gig distribution seamless.

### Core Features

| 🎯 Feature | 💻 Command | 👤 User |
|---|---|---|
| 📍 Announce completed installation | `/installation` | Admin |
| 💼 Post new gig opportunity | `/newgig` | Admin |
| 📢 Broadcast announcements | `/announce` | Admin |
| 📸 Share project photos | `/photo` | Admin |
| 📊 View daily performance stats | `/stats` | Admin |
| 🙋 Apply for gigs | `INTERESTED` button | Community |
| 📈 Auto daily summary | Sends at 8 PM (Lagos time) | Bot |

---

## 🚀 Quick Start Guide

## 🚀 Quick Start Guide

### Step 1️⃣ Create Your Bot

1. Open Telegram and message **@BotFather**
2. Send `/newbot` command
3. Choose a name: `Instollar Community` (appears in interface)
4. Choose a username: `instollar_community_bot` (public identifier)
5. 🎉 BotFather sends you a **bot token** — save this securely!

   Example token: `1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2️⃣ Set Up Your Community

#### Create the Main Community Group
1. Create a new Telegram **Group** or **Channel** for your installers
2. Add your bot to the group with **Administrator** permissions
3. Grant permission to **Post Messages**

#### Find the Chat ID
1. Temporarily add `@userinfobot` to the group
2. It displays the group's **Chat ID** (looks like: `-1001234567890`)
3. Remove `@userinfobot` when done

### Step 3️⃣ Create the Admin Group

1. Create a **private** Telegram group for your management team only
2. Add the bot as **Administrator**
3. Get the Chat ID using `@userinfobot` (same process as above)
4. Add all admin staff members to this group

### Step 4️⃣ Collect Admin Telegram IDs

Each admin needs their personal Telegram ID:

1. Message `@userinfobot` directly on Telegram
2. It responds with your personal ID (e.g., `123456789`)
3. Do this for every team member with admin access
4. Compile the list: `123456789,987654321,555555555`

### Step 5️⃣ Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Telegram Bot
BOT_TOKEN=1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
COMMUNITY_CHAT_ID=-1001234567890
ADMIN_GROUP_ID=-1009876543210
ADMIN_IDS=123456789,987654321,555555555

# Database
DB_PATH=./data/instollar.db

# Settings
TZ=Africa/Lagos
DAILY_SUMMARY_CRON=0 20 * * *
```

---

## 🌐 Deployment Options

### 🚀 Railway (Recommended)

Railway auto-detects Docker and handles everything—simplest option!

1. Push this repository to GitHub
2. Sign up at [railway.app](https://railway.app)
3. Create a **New Project** and connect your GitHub repo
4. Add environment variables in Railway dashboard
5. Deploy! Railway auto-builds using the Dockerfile

✅ **Pros:** Free tier, auto-scaling, simple UI  
⚠️ **Cons:** Limited free credits

### 🎨 Render

Alternative cloud platform with generous free tier.

1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Build Command:** `npm install --ignore-scripts`
4. Set **Start Command:** `node src/index.js`
5. Add environment variables
6. Deploy

### 🖥️ Self-Hosted (VPS/Ubuntu)

### 🖥️ Self-Hosted (VPS/Ubuntu)

Perfect for maximum control and no deployment limits.

```bash
# Clone and install
git clone https://github.com/fasibor/Instollar_Admin_Bot.git /opt/instollar-bot
cd /opt/instollar-bot
npm install --ignore-scripts

# Create configuration
cp .env.example .env
nano .env  # Edit with your values

# Install PM2 for persistent running
npm install -g pm2
pm2 start src/index.js --name instollar-bot
pm2 save
pm2 startup
```

✅ **Pros:** Full control, unlimited scaling  
⚠️ **Cons:** Requires server knowledge

---

## 📋 Admin Command Reference

### 📍 `/installation` — Share Completed Work

Posts a completed installation to the community channel.

**What the bot asks for:**
- 📌 Location *(e.g., "Lekki, Lagos")*
- 👤 Client Name *(e.g., "ABC Residence")*
- ⚡ System Size *(e.g., "5KVA")*
- 🔋 Battery Capacity *(e.g., "10KWh")*
- 📊 Number of Panels *(e.g., "12")*

💡 **Tip:** Use `/photo` to add a project picture instead!

---

### 💼 `/newgig` — Post an Opportunity

Announces a new installation job to the community.

**What the bot asks for:**
- 📌 Location
- ⏰ Deadline/Timeline *(e.g., "Within 4 Hours")*
- ⚡ System Size
- 🔋 Battery Capacity
- 📊 Number of Panels

✨ **Magic Happens:** The post includes an **INTERESTED** button. When engineers tap it, they enter their details (Name, Phone, Email) in a private form, and you get instant notifications in the admin group!

---

### 📢 `/announce` — Broadcast News

Send important announcements to the whole community.

**How it works:**
1. Send `/announce`
2. Type your message and send
3. 💡 You can also **send a photo with a caption** for visual announcements

---

### 📸 `/photo` — Share Project Images

Posts a professional photo with formatted caption.

**How it works:**
1. Send `/photo`
2. Attach an image and add a description
3. Bot publishes with branded formatting to the community

---

### 📊 `/stats` — Daily Activity Report

View real-time performance metrics (private, admin only):
- ✅ Installations shared today
- 💼 Gigs posted today
- 📋 Engineer applications received today

---

### ❌ `/cancel` — Stop Current Action

Cancels any active wizard (installation, gig, announcement). Useful if you change your mind!

---

## 🎯 How Gig Applications Work

The bot makes recruiting seamless:

```
1. Admin posts a gig with /newgig
   ↓
2. Community sees post + INTERESTED button
   ↓
3. Engineer taps button → private form appears
   - Full Name
   - Phone Number
   - Email Address
   ↓
4. Engineer gets confirmation message
   ↓
5. Admin group gets instant notification:
```

**Example Notification:**
```
NEW GIG APPLICATION
━━━━━━━━━━━━━━━━━━━━━━━
🙋 Name: John Doe
📱 Phone: 08012345678
✉️ Email: john@gmail.com
📍 Applied For: Uselu, Benin City
⏰ Time: 12:43 PM
👤 Telegram: @johndoe
━━━━━━━━━━━━━━━━━━━━━━━
✅ Verify on Instollar platform before assignment
```

---

## ⏰ Daily Summary (Automatic)

Every evening at **8 PM Lagos time**, the bot automatically posts activity summary:

```
📊 INSTOLLAR DAILY SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━
📅 Tuesday, June 10, 2025

📈 Today's Activity

  ✅ Installations Shared: 8
  💼 Gigs Posted: 5
  👥 Engineer Applications: 22

━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for being part of Instollar! 🚀
```

**Customize the time:** Edit `DAILY_SUMMARY_CRON` in `.env` using [cron syntax](https://crontab.guru)  
- `0 20 * * *` = 8:00 PM every day
- `0 8 * * *` = 8:00 AM every day

---

## 📁 Project Structure

```
instollar-bot/
│
├── 📂 src/
│   ├── 📄 index.js                  ← Main entry point & bot setup
│   │
│   ├── 📂 commands/                 ← Admin commands
│   │   ├── installation.js          ← /installation wizard
│   │   ├── gig.js                   ← /newgig wizard
│   │   ├── announce.js              ← /announce command
│   │   ├── photo.js                 ← /photo command
│   │   ├── stats.js                 ← /stats report
│   │   └── help.js                  ← /start, /help messages
│   │
│   ├── 📂 handlers/                 ← Event & action handlers
│   │   ├── application.js           ← INTERESTED button + form submission
│   │   └── scheduler.js             ← Daily summary cron job
│   │
│   ├── 📂 database/                 ← Data persistence
│   │   └── db.js                    ← SQLite via sql.js
│   │
│   └── 📂 utils/                    ← Helper functions
│       ├── helpers.js               ← Admin checks, formatters
│       └── session.js               ← User session management
│
├── 📂 data/                         ← SQLite database (auto-created)
│   └── instollar.db
│
├── 📄 .env.example                  ← Configuration template
├── 📄 .gitignore
├── 📄 Dockerfile                    ← Docker containerization
├── 📄 railway.toml                  ← Railway deployment config
├── 📄 package.json                  ← Dependencies & scripts
└── 📄 README.md                     ← This file! 📖
```

---

## 🐛 Troubleshooting

### ❓ Bot is online but not posting to the community
- ✅ Check: Bot is an Administrator in the community group/channel
- ✅ Verify: `COMMUNITY_CHAT_ID` is correct (negative number)
- ✅ Ensure: Bot has "Send Messages" permission

### ❓ Admin commands not working
- ✅ Verify: Your Telegram ID is in `ADMIN_IDS` (comma-separated, no spaces)
- 💡 Get your ID: Message `@userinfobot` on Telegram

### ❓ Not receiving gig applications in admin group
- ✅ Check: Bot is Administrator in the admin group
- ✅ Verify: `ADMIN_GROUP_ID` is correct

### ❓ Bot crashes on startup
- ✅ Check all environment variables are set correctly
- 🔍 Review deployment logs: Railway/Render dashboard
- 📝 Ensure: `BOT_TOKEN`, `COMMUNITY_CHAT_ID`, `ADMIN_GROUP_ID`, `ADMIN_IDS`

### ❓ Daily summary not sending
- ✅ Bot must be in the community channel
- ✅ Verify cron syntax: Use [crontab.guru](https://crontab.guru) to test

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Bot Framework** | Telegraf v4 (Telegram API) |
| **Runtime** | Node.js 20 |
| **Database** | SQLite via sql.js (pure JavaScript, no native builds) |
| **Scheduling** | node-cron |
| **Hosting Options** | Railway, Render, or Self-Hosted VPS |
| **Containerization** | Docker |

---

## 🤝 Contributing

Found a bug? Have a feature idea? Contributions welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/awesome-feature`
3. Commit changes: `git commit -m 'Add awesome feature'`
4. Push branch: `git push origin feature/awesome-feature`
5. Open a Pull Request

---

## 📞 Support

**Questions about setup?**
- Check the [troubleshooting section](#-troubleshooting) above
- Review the [Quick Start Guide](#-quick-start-guide)

**Issues with the bot?**
- Open an issue on [GitHub](https://github.com/fasibor/Instollar_Admin_Bot/issues)
- Include error logs and your setup details

---

## 📜 License

This project is licensed under the MIT License. See LICENSE file for details.

---

## 🌟 Built With ❤️ for the Instollar Community

**Instollar Admin Bot** helps solar installation teams stay connected, manage gigs efficiently, and celebrate wins together.

<div align="center">

⭐ If this bot helps your team, please star this repository!

[Website](https://instollar.com) • [GitHub](https://github.com/fasibor/Instollar_Admin_Bot) • [Support](https://github.com/fasibor/Instollar_Admin_Bot/issues)

</div>
