# Raganork-MD

A light-weight WhatsApp bot framework with multi-session support and extensive configuration options. This is a complete rewrite of the original Raganork project, built for better stability and performance.

## Features

* Lightweight and fast
* Multi-device WhatsApp Web support
* Single and multi-session capabilities
* Extensive plugin system
* Group management tools
* Media download functionality
* Configurable command system
* Excellent caching and session management
* PM2 process management
* Environment-based configuration

## Prerequisites

* Node.js (version 16 or higher)
* Git
* FFmpeg
* Yarn package manager
* PM2 (for process management)

## Installation

### Step 1: Get Session String

Visit [raganork.site](https://raganork.site) to scan QR code and obtain your session string.

### Step 2: Clone Repository

```bash
git clone https://github.com/souravkl11/raganork-md.git
cd raganork-md
```

### Step 3: Install Dependencies

```bash
yarn install
```

### Step 4: Configuration

Create a `.env` file in the root directory and configure the following variables:

#### Session Configuration

For single session:

```
SESSION=RGNK~d7a5s66
```

For multi-session:

```
SESSION=RGNK~d7a5s66,RGNK~7ad8cW
```

#### Required Configuration Variables

```
# Bot Configuration
BOT_NAME=Your Bot Name
HANDLERS=.,!
SUDO=919876543210

# Database
DATABASE_URL=your_database_url

# Language
LANGUAGE=en

# Timezone
TZ=Asia/Kolkata
```

#### Additional Configuration Options can be found [here]().

## Starting the Bot

```bash
npm start
```

## Process Management

### Stop Bot

```bash
pm2 stop raganork-md
```

### Restart Bot

```bash
pm2 restart raganork-md
```

## Commands

The bot uses a configurable prefix (default: `.`). Basic commands include:

* `.list` – Display available commands
* `.ping` – Check bot response time
* `.restart` – Restart the bot (sudo only)
* `.shutdown` – Stop the bot (sudo only)

## File Structure

```
raganork-md/
├── plugins/              # Bot plugins
├── core/                 # Core libraries
├── output/              # Operational outputs
├── temp/                # Temporary files
├── config.js            # Configuration handler
├── index.js             # Main entry point
└── package.json         # Dependencies
```

## Obfuscation Notice

Some files containing sensitive logic or API interactions have been obfuscated for security and anti-abuse reasons. They handle low-level session management and authentication and are **not intended to be modified or reverse engineered.**

## Support

For support and updates, join our [Telegram group](https://t.me/raganork_in) or visit the [official website](https://raganork.live).

## License

This project is licensed under the GPL License. See the LICENSE file for details.

## Note
> **Powered by [Baileys](https://github.com/WhiskeySockets/Baileys),** an unofficial Wa Web API library.

⚠️ This bot uses an unofficial method to access WhatsApp and **may lead to temporary or permanent bans**. Use it at your own risk.

## Legal

* This code is in no way affiliated, authorized, maintained, sponsored or endorsed by WhatsApp or any of its affiliates.
* WhatsApp is a trademark of WhatsApp Inc., registered in the U.S. and other countries.
* This software is provided for educational and research purposes only.
