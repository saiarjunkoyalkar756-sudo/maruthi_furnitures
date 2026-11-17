// Standalone background poller for Telegram Bot
const http = require('http')

const POLL_INTERVAL_MS = 2500
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'maruthi-internal-worker-auth'

function poll() {
  const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/security/telegram/poll',
    method: 'GET',
    headers: {
      'x-worker-secret': INTERNAL_SECRET,
    },
    timeout: 5000,
  }

  const req = http.request(options, (res) => {
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

  req.on('timeout', () => {
    req.destroy()
    setTimeout(poll, POLL_INTERVAL_MS)
  })

  req.end()
}

console.log('[Telegram Poller] Starting background polling service...')
poll()

