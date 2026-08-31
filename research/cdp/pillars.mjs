import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const PORT = 9334

const PAGE = `data:text/html,${encodeURIComponent(`<!doctype html><html><body>
<button id="b1">First</button>
<button id="b2" aria-pressed="false">Toggle</button>
<button id="b3">Will disable</button>
<div id="polite" aria-live="polite" aria-atomic="false"></div>
<input id="txt" value="hello world" />
<p id="para">before <a href="#x">a link</a> after</p>
</body></html>`)}`

const proc = spawn(CHROME, ['--headless=new',`--remote-debugging-port=${PORT}`,'--no-sandbox','--disable-gpu','--force-renderer-accessibility','about:blank'], {stdio:['ignore','pipe','pipe']})
let ready=false; proc.stderr.on('data',d=>{if(String(d).includes('DevTools listening'))ready=true})
for(let i=0;i<100&&!ready;i++) await delay(100)

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const ws = new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))

let id=0; const pending=new Map(); let capture=null
ws.addEventListener('message',ev=>{
  const m=JSON.parse(ev.data)
  if(m.id!==undefined) pending.get(m.id)?.(m)
  else if(capture) capture.push(m)
})
const send=(method,params={})=>new Promise(res=>{const i=++id;pending.set(i,r=>res(r.result));ws.send(JSON.stringify({id:i,method,params}))})

await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable')
await send('Accessibility.enable')
await send('Page.navigate',{url:PAGE})
await delay(1200)
await send('Accessibility.getFullAXTree')  // prime the tree

// helper: run an action, collect nodesUpdated, summarise interesting props
async function scenario(name, js){
  capture=[]
  await send('Runtime.evaluate',{expression:js})
  await delay(600)
  const evs=capture.filter(e=>e.method==='Accessibility.nodesUpdated')
  const nodes=evs.flatMap(e=>e.params.nodes||[])
  capture=null
  const interesting=nodes.map(n=>{
    const p=Object.fromEntries((n.properties||[]).map(x=>[x.name,x.value?.value]))
    const keep={}
    for(const k of ['focused','disabled','pressed','checked','expanded','live','atomic','busy','relevant'])
      if(p[k]!==undefined) keep[k]=p[k]
    return {role:n.role?.value, name:n.name?.value, ignored:n.ignored, ...keep}
  }).filter(n=>n.role)
  console.log(`\n### ${name}`)
  console.log(`  events: ${evs.length}, nodes: ${nodes.length}`)
  for(const n of interesting.slice(0,8)) console.log('   ', JSON.stringify(n))
}

await scenario('PILLAR 1 — focus moves to button b1', `document.getElementById('b1').focus()`)
await scenario('PILLAR 1 — focus moves to button b2', `document.getElementById('b2').focus()`)
await scenario('PILLAR 2 — aria-pressed false->true', `document.getElementById('b2').setAttribute('aria-pressed','true')`)
await scenario('PILLAR 2 — FOCUSED button becomes disabled', `document.getElementById('b3').focus(); document.getElementById('b3').disabled=true`)
await scenario('PILLAR 3 — live region: append node', `document.getElementById('polite').appendChild(Object.assign(document.createElement('div'),{textContent:'first message'}))`)
await scenario('PILLAR 3 — live region: append second', `document.getElementById('polite').appendChild(Object.assign(document.createElement('div'),{textContent:'second message'}))`)
await scenario('PILLAR 3 — live region: REMOVE+INSERT same tick (the trim pattern)', `const r=document.getElementById('polite'); r.removeChild(r.firstChild); r.appendChild(Object.assign(document.createElement('div'),{textContent:'third message'}))`)
await scenario('PILLAR 4 — caret into text input', `const t=document.getElementById('txt'); t.focus(); t.setSelectionRange(3,3)`)
await scenario('PILLAR 4 — caret moves within input', `document.getElementById('txt').setSelectionRange(7,7)`)

ws.close(); proc.kill()
