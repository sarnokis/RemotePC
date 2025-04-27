const TelegramBot = require('node-telegram-bot-api')
const si = require('systeminformation')
const { exec, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const screenshot = require('screenshot-desktop')
const axios = require('axios')

const token = ''
const bot = new TelegramBot(token, { polling: true })

const PASSWORD = ''

const ADMIN_ID = ''

let currentDir = process.cwd()

async function executeCommand(cmd) {
	return new Promise((resolve, reject) => {
		exec(cmd, (error, stdout, stderr) => {
			if (error) {
				reject(stderr || error.message)
			} else {
				resolve(stdout.trim())
			}
		})
	})
}

async function sendLargeMessage(chatId, text) {
	const chunkSize = 4096
	for (let i = 0; i < text.length; i += chunkSize) {
		const chunk = text.substring(i, i + chunkSize)
		await bot.sendMessage(chatId, chunk)
	}
}

async function sendScreenshot(chatId) {
	try {
		const screenshotPath = path.join(__dirname, 'screenshot.png')
		await screenshot({ filename: screenshotPath })

		await bot.sendPhoto(chatId, screenshotPath)
		fs.unlinkSync(screenshotPath)
	} catch (error) {
		bot.sendMessage(chatId, `Failed to take screenshot: ${error.message}`)
	}
}

async function sendSystemInfo(chatId) {
	try {
		const cpu = await si.cpu()
		const mem = await si.mem()
		const os = await si.osInfo()
		const load = await si.currentLoad()
		const temp = await si.cpuTemperature()
		const disks = await si.fsSize()
		const battery = await si.battery()

		let info =
			`*System Information*:\n\n` +
			`*OS*: ${os.distro} ${os.release} (${os.arch})\n` +
			`*Uptime*: ${os.uptime} seconds\n` +
			`*CPU*: ${cpu.manufacturer} ${cpu.brand} (${cpu.cores} cores)\n` +
			`*CPU Load*: ${load.currentLoad.toFixed(2)}%\n` +
			`*CPU Temp*: ${temp.main ? `${temp.main}°C` : 'N/A'}\n` +
			`*Memory*: ${(mem.used / 1024 / 1024 / 1024).toFixed(2)}GB / ${(
				mem.total /
				1024 /
				1024 /
				1024
			).toFixed(2)}GB (${((mem.used / mem.total) * 100).toFixed(2)}%)\n`

		disks.forEach(disk => {
			info += `*Disk ${disk.fs}*: ${(disk.used / 1024 / 1024 / 1024).toFixed(
				2
			)}GB / ${(disk.size / 1024 / 1024 / 1024).toFixed(2)}GB (${disk.use}%)\n`
		})

		if (battery.hasBattery) {
			info += `*Battery*: ${battery.percent}% (${
				battery.isCharging ? 'Charging' : 'Discharging'
			})\n`
		}

		await bot.sendMessage(chatId, info, { parse_mode: 'Markdown' })
	} catch (error) {
		bot.sendMessage(chatId, `Failed to get system info: ${error.message}`)
	}
}

async function listFiles(chatId, dirPath) {
	try {
		const files = fs.readdirSync(dirPath)
		let message = `*Files in ${dirPath}*:\n\n`

		files.forEach(file => {
			const fullPath = path.join(dirPath, file)
			const stat = fs.statSync(fullPath)

			if (stat.isDirectory()) {
				message += `📁 *${file}* (dir)\n`
			} else {
				message += `📄 ${file} (${(stat.size / 1024).toFixed(2)} KB)\n`
			}
		})

		await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
	} catch (error) {
		bot.sendMessage(chatId, `Failed to list files: ${error.message}`)
	}
}

async function downloadFile(chatId, url) {
	try {
		const fileName = path.basename(url)
		const filePath = path.join(currentDir, fileName)

		const response = await axios({
			url,
			method: 'GET',
			responseType: 'stream',
		})

		const writer = fs.createWriteStream(filePath)
		response.data.pipe(writer)

		await new Promise((resolve, reject) => {
			writer.on('finish', resolve)
			writer.on('error', reject)
		})

		await bot.sendMessage(chatId, `File downloaded: ${filePath}`)
	} catch (error) {
		bot.sendMessage(chatId, `Failed to download file: ${error.message}`)
	}
}

bot.onText(/\/start/, msg => {
	const chatId = msg.chat.id
	bot.sendMessage(
		chatId,
		`🖥️ *Remote Computer Control Bot*\n\n` +
			`Available commands:\n` +
			`/screenshot - Take a screenshot\n` +
			`/sysinfo - Get system information\n` +
			`/reboot - Reboot computer\n` +
			`/shutdown - Shutdown computer\n` +
			`/openurl <url> - Open URL in default browser\n` +
			`/run <command> - Execute command\n` +
			`/files - List files in current directory\n` +
			`/cd <path> - Change directory\n` +
			`/download <url> - Download file from URL\n` +
			`/getfile <filename> - Get file from computer\n` +
			`/search - Start file search program\n` +
			`/game - Start search game\n` +
			`/notify <message> - Send notification to computer\n` +
			`/help - Show this help message`,
		{ parse_mode: 'Markdown' }
	)
})

bot.onText(/\/screenshot/, async msg => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	await sendScreenshot(chatId)
})

bot.onText(/\/sysinfo/, async msg => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	await sendSystemInfo(chatId)
})

bot.onText(/\/reboot/, async msg => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	try {
		await bot.sendMessage(chatId, '🔄 Rebooting computer...')
		await executeCommand(
			process.platform === 'win32' ? 'shutdown /r /t 0' : 'sudo reboot'
		)
	} catch (error) {
		bot.sendMessage(chatId, `Failed to reboot: ${error}`)
	}
})

bot.onText(/\/shutdown/, async msg => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	try {
		await bot.sendMessage(chatId, '⏻ Shutting down computer...')
		await executeCommand(
			process.platform === 'win32' ? 'shutdown /s /t 0' : 'sudo shutdown now'
		)
	} catch (error) {
		bot.sendMessage(chatId, `Failed to shutdown: ${error}`)
	}
})

bot.onText(/\/openurl (.+)/, async (msg, match) => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	const url = match[1]
	try {
		const cmd =
			process.platform === 'win32'
				? `start ${url}`
				: process.platform === 'darwin'
				? `open ${url}`
				: `xdg-open ${url}`

		await executeCommand(cmd)
		await bot.sendMessage(chatId, `🌐 Opened URL: ${url}`)
	} catch (error) {
		bot.sendMessage(chatId, `Failed to open URL: ${error}`)
	}
})

bot.onText(/\/run (.+)/, async (msg, match) => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	const command = match[1]
	try {
		const result = await executeCommand(command)
		await sendLargeMessage(chatId, `$ ${command}\n\n${result}`)
	} catch (error) {
		bot.sendMessage(chatId, `Command failed:\n${error}`)
	}
})

bot.onText(/\/files/, async msg => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	await listFiles(chatId, currentDir)
})

bot.onText(/\/cd (.+)/, async (msg, match) => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	const newPath = match[1]
	try {
		const absPath = path.isAbsolute(newPath)
			? newPath
			: path.join(currentDir, newPath)
		if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
			throw new Error('Path does not exist or is not a directory')
		}

		currentDir = absPath
		await bot.sendMessage(chatId, `📂 Current directory: ${currentDir}`)
	} catch (error) {
		bot.sendMessage(chatId, `Failed to change directory: ${error.message}`)
	}
})

bot.onText(/\/download (.+)/, async (msg, match) => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	const url = match[1]
	await downloadFile(chatId, url)
})

bot.onText(/\/getfile (.+)/, async (msg, match) => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	const fileName = match[1]
	const filePath = path.join(currentDir, fileName)

	try {
		if (!fs.existsSync(filePath)) {
			throw new Error('File does not exist')
		}

		const stats = fs.statSync(filePath)
		if (stats.size > 50 * 1024 * 1024) {
			throw new Error('File is too large (max 50MB)')
		}

		await bot.sendDocument(chatId, filePath)
	} catch (error) {
		bot.sendMessage(chatId, `Failed to send file: ${error.message}`)
	}
})

bot.onText(/\/search/, async msg => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	try {
		const cmd =
			process.platform === 'win32'
				? 'start explorer.exe "search-ms:"'
				: process.platform === 'darwin'
				? 'open /System/Library/CoreServices/Finder.app'
				: 'nautilus --search'

		await executeCommand(cmd)
		await bot.sendMessage(chatId, '🔍 Started file search program')
	} catch (error) {
		bot.sendMessage(chatId, `Failed to start search: ${error}`)
	}
})

bot.onText(/\/game/, async msg => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	try {
		const cmd =
			process.platform === 'win32'
				? 'start steam://rungameid/123456'
				: process.platform === 'darwin'
				? 'open -a "Game Name"'
				: 'steam steam://rungameid/123456'

		await executeCommand(cmd)
		await bot.sendMessage(chatId, '🎮 Started search game')
	} catch (error) {
		bot.sendMessage(chatId, `Failed to start game: ${error}`)
	}
})

bot.onText(/\/notify (.+)/, async (msg, match) => {
	const chatId = msg.chat.id
	if (ADMIN_ID && chatId.toString() !== ADMIN_ID.toString()) {
		return bot.sendMessage(chatId, '⛔ Unauthorized access!')
	}

	const message = match[1]
	try {
		let cmd
		switch (process.platform) {
			case 'win32':
				try {
					await executeCommand(`msg * "${message}"`)
					return await bot.sendMessage(
						chatId,
						`📢 Notification sent: ${message}`
					)
				} catch (e) {
					await executeCommand(
						`powershell -command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${message}', 'Bot Notification')}"`
					)
					return await bot.sendMessage(
						chatId,
						`📢 Notification sent: ${message}`
					)
				}

			case 'darwin':
				cmd = `osascript -e 'display notification "${message}" with title "Bot Notification"'`
				break

			case 'linux':
				try {
					await executeCommand(`notify-send "Bot Notification" "${message}"`)
				} catch (e) {
					await executeCommand(
						`zenity --info --text="${message}" --title="Bot Notification"`
					)
				}
				return await bot.sendMessage(chatId, `📢 Notification sent: ${message}`)

			default:
				throw new Error('Unsupported platform')
		}

		await executeCommand(cmd)
		await bot.sendMessage(chatId, `📢 Notification sent: ${message}`)
	} catch (error) {
		bot.sendMessage(
			chatId,
			`Failed to send notification: ${error.message}\n\nNote: On Linux, you may need to install libnotify-bin or zenity for notifications.`
		)
	}
})

bot.onText(/\/help/, msg => {
	const chatId = msg.chat.id
	bot.sendMessage(
		chatId,
		`🖥️ *Remote Computer Control Bot*\n\n` +
			`Available commands:\n` +
			`/screenshot - Take a screenshot\n` +
			`/sysinfo - Get system information\n` +
			`/reboot - Reboot computer\n` +
			`/shutdown - Shutdown computer\n` +
			`/openurl <url> - Open URL in default browser\n` +
			`/run <command> - Execute command\n` +
			`/files - List files in current directory\n` +
			`/cd <path> - Change directory\n` +
			`/download <url> - Download file from URL\n` +
			`/getfile <filename> - Get file from computer\n` +
			`/search - Start file search program\n` +
			`/game - Start search game\n` +
			`/notify <message> - Send notification to computer\n` +
			`/help - Show this help message`,
		{ parse_mode: 'Markdown' }
	)
})

console.log('Bot is running...')
