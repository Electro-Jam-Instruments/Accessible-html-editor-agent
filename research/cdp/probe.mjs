// Discovery probe: what does CDP expose for accessibility?
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const PORT = 9333

const proc = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-sandbox',
  '--disable-gpu',
  '--force-renderer-accessibility',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] })

let ready = false
proc.stderr.on('data', d => { if (String(d).includes('DevTools listening')) ready = true })

for (let i = 0; i < 100 && !ready; i++) await delay(100)
if (!ready) { console.error('chrome did not start'); process.exit(1) }

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const target = list.find(t => t.type === 'page')
console.log('target:', target.url)

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))

let id = 0
const pending = new Map()
const events = []
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data)
  if (msg.id !== undefined) pending.get(msg.id)?.(msg)
  else events.push(msg)
})
const send = (method, params = {}) => new Promise(res => {
  const myId = ++id
  pending.set(myId, res)
  ws.send(JSON.stringify({ id: myId, method, params }))
})

// 1. What does the protocol itself say the Accessibility domain supports?
const schema = await send('Schema.getDomains').catch(() => null)
const proto = await (await fetch(`http://127.0.0.1:${PORT}/json/protocol`)).json()
const ax = proto.domains.find(d => d.domain === 'Accessibility')
console.log('\n=== Accessibility domain ===')
console.log('experimental:', ax.experimental)
console.log('COMMANDS:', ax.commands.map(c => c.name + (c.experimental ? '*' : '')).join(', '))
console.log('EVENTS:', (ax.events || []).map(e => e.name + (e.experimental ? '*' : '')).join(', ') || '(none)')

console.log('\n=== AXNode properties available ===')
const axNode = ax.types.find(t => t.id === 'AXNode')
console.log(axNode.properties.map(p => p.name).join(', '))
const propType = ax.types.find(t => t.id === 'AXPropertyName')
console.log('\nAXPropertyName enum:', propType?.enum?.join(', '))

ws.close(); proc.kill()
