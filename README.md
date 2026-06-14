# Instollar Community Bot 
**Telegram automation system for solar installation communities — gigs, updates, and announcements in one place.**

---

## About the Project

The **Instollar Community Bot** is a production-grade Telegram bot designed to streamline communication within a solar installation ecosystem. It helps administrators publish installation updates, post job opportunities (gigs), manage announcements, and track community engagement — all directly inside Telegram.

Built for speed, clarity, and automation, it removes manual coordination overhead and keeps field engineers and admins perfectly in sync.

---

## Features

- Automated Announcements System (`/announce`)
- Installation Reporting Wizard (`/installation`)
- Gig Posting & Application Flow (`/newgig`)
- Photo-based Project Updates (`/photo`)
- Weekly and Monthly (Auto 8PM Lagos Time)
- Engineer Application System (INTERESTED button flow)
- Admin-only stats dashboard (`/stats`)
- Safe cancel/reset flow (`/cancel`)
- Role-based access control (Admins vs Community users)
- Interactive step-by-step wizards for data collection

---

## Tech Stack

| Layer | Technology |
|------|------------|
| Runtime | Node.js (v18+) |
| Bot Framework | Telegraf v4 |
| Database | SQLite (sql.js / file-based) |
| Scheduler | node-cron |
| Deployment | Railway / Render / VPS (PM2) |
| Environment | dotenv |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/instollar-bot.git
cd instollar-bot