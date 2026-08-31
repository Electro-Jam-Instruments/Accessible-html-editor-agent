import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const D='/tmp/claude-0/-home-user-Open-notebook-a11y/0ff464b7-45e8-5b52-8804-f4027d443272/scratchpad/axauto'
const EXT_ID='kdcakfhfchmaalomafmngelcglnibdda'
const PORT=9340
const args=['--headless=new',`--remote-debugging-port=${PORT}`,'--no-sandbox','--disable-gpu',
  '--force-renderer-accessibility',
  `--load-extension=${D}/ext`,
  `--allowlisted-extension-id=${EXT_ID}`,
  `--user-data-dir=${D}/profile`,
  '--enable-logging=stderr','--v=0',
  'about:blank']
const proc=spawn(CHROME,args,{stdio:['ignore','pipe','pipe']})
let ready=false, stderr=''
proc.stderr.on('data',d=>{stderr+=String(d); if(String(d).includes('DevTools listening'))ready=true})
for(let i=0;i<150&&!ready;i++) await delay(100)
if(!ready){ console.log('NO START\n', stderr.slice(0,2000)); process.exit(1) }
await delay(2000)

// find the extension service worker target
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
console.log('TARGETS:')
for(const t of list) console.log(`  ${t.type.padEnd(14)} ${(t.title||'').slice(0,40).padEnd(42)} ${t.url.slice(0,70)}`)
const sw=list.find(t=>t.url.includes(EXT_ID))
if(!sw){ console.log('\n>>> extension target NOT FOUND'); proc.kill(); process.exit(1) }

const ws=new WebSocket(sw.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pending=new Map(); const logs=[]
ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data)
  if(m.id!==undefined) pending.get(m.id)?.(m)
  else if(m.method==='Runtime.consoleAPICalled') logs.push(m.params.args.map(a=>a.value??a.description).join(' '))})
const send=(me,p={})=>new Promise(res=>{const i=++id;pending.set(i,r=>res(r.result));ws.send(JSON.stringify({id:i,method:me,params:p}))})
await send('Runtime.enable')
// re-evaluate the SW body so we capture its startup logs even if it already ran
await delay(500)
console.log('\nSW LOGS SO FAR:'); logs.forEach(l=>console.log('  '+l))

// probe the API directly in the service worker
const probe=await send('Runtime.evaluate',{expression:`(()=>{
  const r={automation: typeof chrome.automation};
  if(chrome.automation){ r.keys=Object.keys(chrome.automation).slice(0,20); }
  return JSON.stringify(r);
})()`,returnByValue:true})
console.log('\nAPI PROBE:', probe?.result?.value ?? JSON.stringify(probe))
ws.close(); proc.kill()
