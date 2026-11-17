// Standalone background poller for Telegram Bot
const http = require('http')

const POLL_INTERVAL_MS = 2500

function poll() {
  const req = http.get('http://127.0.0.1:3000/api/security/telegram/poll', (res) => {
    let raw = ''
    res.on('data', (chunk) => {
      raw += chunk
    })
    res.on('end', () => {
      // Completed poll cycle
      setTimeout(poll, POLL_INTERVAL_MS)
    })
  })

  req.on('error', () => {
    // Server might be starting or momentarily busy, retry shortly
    setTimeout(poll, POLL_INTERVAL_MS * 2)
  })

  req.setTimeout(5000, () => {
    req.destroy()
    setTimeout(poll, POLL_INTERVAL_MS)
  })
}

console.log('[Telegram Poller] Starting background polling service...')
poll()

