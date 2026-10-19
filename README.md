# Discord Staff Apply Website

Staff application website for your Discord server. Users login with Discord, apply for staff positions, and admins can approve/reject applications. Optionally auto-assigns Discord roles via bot.

## Features

- Discord OAuth login
- Application form (position, experience, why join, age, timezone)
- User can see their own application status
- Admin panel – view all applications, approve / reject with notes
- Optional: Auto-assign Discord role when approved
- Optional: Discord webhook notifications for new apps & decisions
- Clean Discord-themed dark UI

## Setup

### 1. Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application → OAuth2
3. Add Redirect URL: `https://YOUR_VERCEL_URL/api/auth/callback/discord` (and `http://localhost:3000/api/auth/callback/discord` for local)
4. Copy **Client ID** and **Client Secret**

### 2. Environment Variables

Copy `.env.example` → `.env.local` and fill:

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_CLIENT_ID` | Yes | From Discord app |
| `DISCORD_CLIENT_SECRET` | Yes | From Discord app |
| `NEXTAUTH_URL` | Yes | Your site URL |
| `NEXTAUTH_SECRET` | Yes | Random string (`openssl rand -base64 32`) |
| `ADMIN_DISCORD_IDS` | Yes | Your Discord user ID(s), comma-separated |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `DISCORD_BOT_TOKEN` | No | Bot token for role assignment |
| `DISCORD_GUILD_ID` | No | Your server ID |
| `DISCORD_STAFF_ROLE_ID` | No | Role ID to assign on approve |
| `DISCORD_WEBHOOK_URL` | No | Webhook for notifications |

### 3. Database (Supabase)

Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_avatar TEXT,
  position TEXT NOT NULL,
  experience TEXT NOT NULL,
  why_join TEXT NOT NULL,
  age INTEGER,
  timezone TEXT,
  extra TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applications_discord_id ON applications(discord_id);
CREATE INDEX idx_applications_status ON applications(status);
```

### 4. Discord Bot (optional – for auto role)

1. In Developer Portal → Bot → Add Bot → Copy token
2. Enable **Server Members Intent**
3. Invite bot with `Manage Roles` permission
4. Put the Staff role **below** the bot's highest role

### 5. Deploy on Vercel

1. Push this repo to GitHub
2. Import project on Vercel
3. Add all environment variables
4. Deploy

## How to get your Discord User ID

Enable Developer Mode in Discord (Settings → Advanced) → right-click your profile → Copy User ID.

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000
