# Raganork-MD

<p align="center">
  <a href="https://raganork.site">
    <img src="https://i.ibb.co/QL4BQQ6/Untitled-1.png" alt="Get Session" width="300"/>
  </a>
</p>

A lightweight WhatsApp bot framework with multi-session support and extensive configuration options. Complete rewrite of the original Raganork project for better stability and performance.

## Get Started

#### 1. Get Your Session String

<p align="center">
  <a href="https://raganork.site">
    <img src="https://i.ibb.co/fVWcycPc/get-session.png" alt="Get Session" width="200"/>
  </a>
</p>

**Important for Cloud Deployments:** If you're deploying on platforms like Render, Koyeb, Railway, or similar cloud services, you'll need a `DATABASE_URL` (PostgreSQL) for persistent storage. VPS deployments can use local file storage.

#### 2. Deploy and setup your bot

<p align="center">
  <a href="https://raganork.site">
    <img src="https://i.ibb.co/fVsfPsjk/deploy-bot.png" alt="Get Session" width="200"/>
  </a>
</p>

## Features

- Lightweight and fast performance
- Single and multi-session capabilities
- Extensive plugin system
- Group management tools
- Media download functionality
- Excellent caching and session management

## Prerequisites

- Node.js (version 24 or higher)
- Git
- FFmpeg
- Yarn package manager
- PM2 (for process management)
- Database URL (postgreSQL - for cloud deployments)

## Installation

### Clone Repository

```bash
npm install -g yarn pm2
git clone https://github.com/souravkl11/raganork-md.git
cd raganork-md
```

### Install Dependencies

```bash
yarn install
```

### Configuration

Create a `config.env` file in the root directory (on hosting platforms, set the same names as environment variables):

#### Session Configuration

Single session:

```
SESSION=RGNK~d7a5s66
```

Multi-session:

```
SESSION=RGNK~d7a5s66,RGNK~7ad8cW
```

#### Required Variables

```
# Bot Configuration
BOT_NAME=Your Bot Name
HANDLERS=.,!
SUDO=919876543210

# Database (Required for cloud platforms)
DATABASE_URL=your_database_url

# Localization
LANGUAGE=en
TZ=Asia/Kolkata
```

## Running the Bot

```bash
npm start
```

## Process Management

```bash
# Stop bot
pm2 stop raganork-md

# Restart bot
pm2 restart raganork-md
```

## Performance Tuning (optional)

```
MAX_HEAP=512              # V8 heap cap in MB used by npm start (lower = earlier GC, less RAM)
FFMPEG_CONCURRENCY=2      # max ffmpeg jobs at once
FFMPEG_TIMEOUT=600        # seconds before a stuck ffmpeg job is killed
MAX_RECONNECT_ATTEMPTS=10 # fast reconnects (with backoff) before switching to one retry every ~10 min
CMD_CONCURRENCY=8         # chats that may run a command at the same time (commands of one chat run in order)
CMD_TIMEOUT=300           # seconds before a running command stops holding its queue slot (it is not killed)
LOG_LEVEL=warn            # bot log level (silent|error|warn|info|debug), default warn
BAILEYS_LOG_LEVEL=silent  # WhatsApp library log level, separate from LOG_LEVEL, default silent
SELF_RESTART=false        # without pm2 or a hosting platform, true makes .restart/.update start a new copy itself
WA_VERSION=2.3000.x       # pin a WhatsApp web version (default: latest published)
```

#### Other optional settings

```
DATABASE_SSL=true         # set false for a PostgreSQL server without SSL (default true)
SQLITE_PATH=./bot.db      # where the SQLite file lives when DATABASE_URL is not set
PLUGIN_FETCH_TIMEOUT=15000 # milliseconds to wait for each `.install`ed plugin download at start
TEMP_DIR=temp             # folder for temporary files (default: a raganork folder in the system temp dir)
USE_SERVER=true           # set false to skip the built-in web server (health and status pages)
PORT=3000                 # port of that web server
RENDER_API_KEY=           # Render only: lets `.update` redeploy the service
```

Use `.mem` to see the bot's memory usage. On container platforms where every MB counts, running `node --max-old-space-size=384 index.js` directly instead of `npm start` skips the PM2 daemon (~50-70 MB).

## Health and status

The built-in web server answers on `PORT`:

- `/health` always returns `OK` (liveness probe for hosting platforms).
- `/status` returns JSON with each session's state (`connected`, `lastOpenAt`, `reconnectAttempts`, `loggedOut`), uptime, memory and the message queue length. It shows no phone numbers and no session ids.

## Commands

Default prefix: `.`

- `.list` – Show available commands
- `.ping` – Check response time
- `.restart` – Restart bot (sudo only)
- `.shutdown` – Stop bot (sudo only)
- `.mem` – Show memory usage (sudo only)

## File Structure

```
raganork-md/
├── plugins/          # Bot commands, one file each (also where `.install` puts plugins)
│   ├── utils/        # Helpers plugins share (media, downloads, language files)
│   └── sql/          # Plugin installer table
├── core/             # Everything the plugins run on
│   ├── app.js        # Boot sequence and the /health and /status server
│   ├── handler.js    # Entry point for incoming messages
│   ├── pipeline/     # Message pipeline: middleware (antibot, antispam, filters, ...) and the command dispatcher
│   ├── session/      # One WhatsApp session: socket, reconnects, manager, features (albums, anti-delete, calls)
│   ├── plugins/      # Command registry and plugin loader
│   ├── db/           # Sequelize setup, models and per-session scoping
│   ├── config/       # Typed settings: schema, store, derived values
│   ├── services/     # Updater and the Render API client
│   ├── constructors/ # Message objects handed to plugins
│   └── private.js    # Private service layer (obfuscated on deploy)
├── config.js         # Settings object plugins read (config.X)
├── main.js           # Module() and commands, for plugins
├── index.js          # Main entry point
├── temp/             # Temporary files (when TEMP_DIR=temp)
└── package.json      # Dependencies
```

## Support

- [Telegram Group](https://t.me/raganork_in)
- [Official Website](https://raganork.site)

## Legal Notice

⚠️ **Use at your own risk.** This bot uses unofficial WhatsApp Web API methods and may result in temporary or permanent account bans.

- This code is in no way affiliated, authorized, maintained, sponsored or endorsed by WhatsApp or any of its affiliates.
- WhatsApp is a trademark of WhatsApp Inc., registered in the U.S. and other countries.
- This software is provided for educational and research purposes only
- Powered by [Baileys](https://github.com/WhiskeySockets/Baileys)

## License

GPL License - See LICENSE file for details.

---

**Note:** `core/private.js` is obfuscated because it contains the maintainer's private backend endpoints and keys. Everything else is regular source.
