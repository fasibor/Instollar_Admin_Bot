# Instollar Admin Bot

Telegram bot for managing solar installation teams. Automates gig distribution, project updates, and community announcements.

## Features

| Feature | Command | User |
|---|---|---|
| Post completed installation | `/installation` | Admin |
| Post new gig opportunity | `/newgig` | Admin |
| Broadcast announcement | `/announce` | Admin |
| Share project photo | `/photo` | Admin |
| View daily stats | `/stats` | Admin |
| Apply for gigs | INTERESTED button | Community |
| Daily summary | Automatic (8 PM Lagos) | Bot |

## Setup

### 1. Create a Telegram Bot

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Choose a name and username
4. Copy the bot token

### 2. Set Up Telegram Groups

Create two groups:
- **Community Group**: Where members see gigs and updates (get Chat ID)
- **Admin Group**: Private group for your team (get Chat ID)

Use @userinfobot to find Chat IDs. Also collect admin user IDs.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
BOT_TOKEN=your_token_here
COMMUNITY_CHAT_ID=-1001234567890
ADMIN_GROUP_ID=-1009876543210
ADMIN_IDS=123456789,987654321
DB_PATH=./data/instollar.db
TZ=Africa/Lagos
DAILY_SUMMARY_CRON=0 20 * * *
```

### 4. Deploy

**Railway** (Recommended):
1. Push to GitHub
2. Connect repo on [railway.app](https://railway.app)
3. Add environment variables
4. Deploy

**Render**:
1. Create Web Service on [render.com](https://render.com)
2. Build: `npm install --ignore-scripts`
3. Start: `node src/index.js`
4. Add environment variables

**Self-Hosted**:
```bash
git clone https://github.com/fasibor/Instollar_Admin_Bot.git
cd Instollar_Admin_Bot
npm install --ignore-scripts
npm install -g pm2
pm2 start src/index.js --name instollar-bot
pm2 startup && pm2 save
```

## Commands

### `/installation`
Posts a completed installation with location, client name, system size, battery capacity, and panel count.

### `/newgig`
Posts a job opportunity. Includes an INTERESTED button for engineers to apply with their contact details.

### `/announce`
Broadcasts announcements to the community. Supports text and photo posts.

### `/photo`
Shares a project photo with formatted caption.

### `/stats`
Shows today's activity (installations, gigs posted, applications received).

### `/cancel`
Stops any active command.

## How Gig Applications Work

1. Admin posts a gig with `/newgig`
2. Engineers tap the INTERESTED button
3. A private form appears asking for Name, Phone, Email
4. Admin receives notifications in the admin group

## Daily Summary

Automatically posts to the community at 8 PM Lagos time:
- Installations shared
- Gigs posted  
- Engineer applications received

Edit `DAILY_SUMMARY_CRON` in `.env` to change the time.

## Troubleshooting

**Bot not posting**: Ensure bot is an Administrator with "Send Messages" permission in the community group.

**Admin commands not working**: Verify your Telegram ID is in `ADMIN_IDS`. Get it from @userinfobot.

**Not receiving gig applications**: Bot must be an Administrator in the admin group. Verify `ADMIN_GROUP_ID` is correct.

**Bot crashes**: Check all required environment variables are set.

## Tech Stack

- Bot Framework: Telegraf v4
- Runtime: Node.js 20
- Database: SQLite
- Scheduler: node-cron
- Hosting: Railway, Render, or VPS
