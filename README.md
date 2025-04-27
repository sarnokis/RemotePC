# 🖥️ RemotePC - Installation Guide

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm (comes with Node.js)
- Telegram bot token from [BotFather](https://t.me/botfather)
- Git (optional, for cloning the repository)

---

## 🛠️ Installation Steps

### All Platforms (Windows/Linux/macOS)

```bash
# Clone repository
git clone [https://github.com/sarnokis/RemotePC](https://github.com/sarnokis/RemotePC.git)
cd RemotePC

# Install dependencies
npm install
```
# 🔧 Platform-Specific Setup
Windows
```bash
# Optional: Enable script execution
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Recommended: Install build tools
npm install --global windows-build-tools

# Run the bot
node index.js
```
Linux (Debian/Ubuntu)
```bash
# Install system dependencies
sudo apt update
sudo apt install -y git build-essential libnotify-bin zenity scrot

# Fix permissions
sudo usermod -a -G video $(whoami)

# Run the bot
node index.js

# Optional: Create systemd service
sudo tee /etc/systemd/system/telegram-bot.service > /dev/null <<EOL
[Unit]
Description=Telegram Remote Control Bot
After=network.target

[Service]
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=$(which node) $(pwd)/index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable telegram-bot
sudo systemctl start telegram-bot
```
macOS
```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Run the bot
node index.js

# Optional: Create launchd service
mkdir -p ~/Library/LaunchAgents
tee ~/Library/LaunchAgents/com.user.telegrambot.plist > /dev/null <<EOL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.telegrambot</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which node)</string>
        <string>$(pwd)/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/stderr.log</string>
</dict>
</plist>
EOL

# Load service
launchctl load ~/Library/LaunchAgents/com.user.telegrambot.plist
```
#🔄 Updating the Bot
```bash
git pull origin main
npm install
# Restart the bot/service
```
#❓ Troubleshooting
Common Issues:
```bash
# Check node version
node -v

# Check logs
tail -n 50 logs/error.log

# Test screenshot functionality manually
npx screenshot-desktop --format=png --filename=test.png
```
Permission Issues:
```bash
# Linux audio/video groups
sudo usermod -a -G audio,video $(whoami)
```
Notification Issues:
```bash
# Linux test
notify-send "Test" "Hello World"
# or
zenity --info --text="Hello World"
```
#🌟 Pro Tip: For production use, consider using PM2 process manager:
```bash
npm install -g pm2
pm2 start index.js --name telegram-bot
pm2 save
pm2 startup
```
