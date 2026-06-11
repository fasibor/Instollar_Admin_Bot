# Instollar Community Bot

Telegram community bot for the Instollar solar installer platform. Keeps the community updated with completed installations, available gigs, and company announcements.

---

## Features

| Feature | Command | Who |
|---|---|---|
| Post installation update | `/installation` | Admin |
| Post new gig opportunity | `/newgig` | Admin |
| Post announcement | `/announce` | Admin |
| Post project photo | `/photo` | Admin |
| View today's stats | `/stats` | Admin |
| Apply for a gig | INTERESTED button | Community |
| Daily activity summary | Automatic (8 PM Lagos) | Bot |

---

## Setup — Step by Step

### 1. Create the Bot

1. Open Telegram and message **@BotFather**
2. Send `/newbot`
3. Choose a name: `Instollar Community`
4. Choose a username: `instollar_community_bot` (or similar)
5. Copy the **bot token** — you'll need it for `.env`

### 2. Create the Community Group/Channel

1. Create a Telegram group or channel for your community
2. Add your bot to the group as an **Administrator**
3. Give the bot permission to **Post Messages**
4. Get the Chat ID:
   - Add `@userinfobot` to the group temporarily
   - It will show the group's Chat ID (negative number like `-1001234567890`)
   - Remove `@userinfobot` after

### 3. Create the Admin Group

1. Create a **private** Telegram group for your operations team
2. Add the bot as Administrator
3. Get the Chat ID the same way as above
4. Add all admin staff to this group

### 4. Get Your Admin Telegram IDs

1. Message `@userinfobot` directly
2. It returns your personal Telegram ID (a number like `123456789`)
3. Collect the IDs for all admins

### 5. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
BOT_TOKEN=1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
COMMUNITY_CHAT_ID=-1001234567890
ADMIN_GROUP_ID=-1009876543210
ADMIN_IDS=123456789,987654321
DB_PATH=./data/instollar.db
TZ=Africa/Lagos
DAILY_SUMMARY_CRON=0 20 * * *
```

### 6. Deploy

#### Option A — Railway (Recommended)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Connect your GitHub repo
4. Add all environment variables in the Railway dashboard
5. Deploy — Railway auto-detects the Dockerfile

#### Option B — Render

1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Build Command**: `npm install --ignore-scripts`
4. Set **Start Command**: `node src/index.js`
5. Add all environment variables
6. Deploy

#### Option C — VPS (Ubuntu)

```bash
# Clone and install
git clone <your-repo> /opt/instollar-bot
cd /opt/instollar-bot
npm install --ignore-scripts

# Create .env
cp .env.example .env
nano .env

# Run with PM2
npm install -g pm2
pm2 start src/index.js --name instollar-bot
pm2 save
pm2 startup
```

---

## Admin Command Reference

### `/installation`

Posts a completed installation to the community channel.

The bot will ask for (one question at a time):
- Location *(e.g. Lekki, Lagos)*
- Client Name *(e.g. ABC Residence)*
- System Size *(e.g. 5KVA)*
- Battery Capacity *(e.g. 10KWh)*
- Number of Panels *(e.g. 12)*

**To attach a photo:** Use `/photo` instead (see below).

---

### `/newgig`

Posts a new installation opportunity to the community.

The bot asks for:
- Location
- Deadline/Timeline *(e.g. Within 4 Hours)*
- System Size
- Battery Capacity
- Number of Panels

The post will include an **INTERESTED** button. When engineers tap it, they complete a short form and you receive their details instantly in the admin group.

---

### `/announce`

Posts a general announcement.

After the command, type your announcement text and send it.
You can also send a **photo with a caption** to post a visual announcement.

---

### `/photo`

Posts a project photo with a formatted caption.

1. Send `/photo`
2. Attach an image and add a caption describing the project
3. Bot publishes to the community with branded formatting

---

### `/stats`

Shows today's activity summary privately (admin only):
- Installations shared
- Gigs posted
- Engineer applications received

---

### `/cancel`

Cancels any active wizard (installation, gig, announce).

---

## How Gig Applications Work

1. Admin posts a gig with `/newgig`
2. Community members see the post with an **INTERESTED** button
3. Tapping the button starts a private 3-question form:
   - Full Name
   - Phone Number
   - Email Address
4. On submission, the engineer receives a confirmation message
5. Your **admin group** receives an instant notification with all details:

```
NEW GIG APPLICATION
━━━━━━━━━━━━━━━━━━━━━━━

Name: John Doe
Phone: 08012345678
Email: john@gmail.com
Applied For: Uselu, Benin City
Time: 12:43 PM
Telegram: @johndoe

━━━━━━━━━━━━━━━━━━━━━━━
Verify this installer on the Instollar platform before assignment.
```

---

## Daily Summary

Every evening at 8 PM Lagos time the bot automatically posts to the community:

```
INSTOLLAR DAILY SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━
Tuesday, June 10, 2025

Today's Activity

  Installations Shared: 8
  New Gigs Posted: 5
  Engineer Applications: 22

━━━━━━━━━━━━━━━━━━━━━━━
Thank you for being part of the Instollar Community.
```

To change the time, edit `DAILY_SUMMARY_CRON` in `.env` using standard cron syntax.
`0 20 * * *` = 8:00 PM every day.

---

## File Structure

```
instollar-bot/
├── src/
│   ├── index.js                  # Entry point
│   ├── commands/
│   │   ├── installation.js       # /installation wizard
│   │   ├── gig.js                # /newgig wizard
│   │   ├── announce.js           # /announce command
│   │   ├── photo.js              # /photo command
│   │   ├── stats.js              # /stats command
│   │   └── help.js               # /start, /help
│   ├── handlers/
│   │   ├── application.js        # INTERESTED button + form
│   │   └── scheduler.js          # Daily summary cron
│   ├── database/
│   │   └── db.js                 # SQLite via sql.js (pure JS)
│   └── utils/
│       └── helpers.js            # Admin check, formatters
├── data/                         # SQLite DB file (auto-created)
├── .env.example
├── Dockerfile
├── railway.toml
└── package.json
```

---

## Troubleshooting

**Bot is online but not posting to the community**
- Ensure the bot is an Administrator in the community group/channel
- Confirm `COMMUNITY_CHAT_ID` is the correct negative number
- Check that the bot has "Send Messages" permission

**Admin commands not working**
- Confirm your Telegram user ID is in `ADMIN_IDS` (comma-separated, no spaces)
- Get your ID by messaging `@userinfobot`

**Not receiving gig applications in the admin group**
- Bot must be an Administrator in the admin group too
- Confirm `ADMIN_GROUP_ID` is correct

**Bot crashes on startup**
- Check all required env vars are set: `BOT_TOKEN`, `COMMUNITY_CHAT_ID`, `ADMIN_GROUP_ID`, `ADMIN_IDS`
- Check Railway/Render logs for the specific error

---

## Tech Stack

| Component | Technology |
|---|---|
| Bot Framework | Telegraf v4 |
| Runtime | Node.js 20 |
| Database | SQLite via sql.js (pure JS, no native builds) |
| Scheduler | node-cron |
| Hosting | Railway / Render / VPS |
