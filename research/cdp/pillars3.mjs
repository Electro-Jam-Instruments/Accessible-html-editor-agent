import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', PORT=9336
const PAGE=`data:text/html,${encodeURIComponent(`<!doctype html><html><body>
<div id="polite" aria-live="polite"></div>
<input id="txt" value="hello world" />
<p id="para" contenteditable="true">before <a href="#x">link</a> after</p>
</body></html>`)}`
const proc=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--no-sandbox','--disable-gpu','--force-renderer-accessibility','about:blank'],{stdio:['ignore','pipe','pipe']})
let ready=false; proc.stderr.on('data',d=>{if(String(d).includes('DevTools listening'))ready=true})
for(let i=0;i<100&&!ready;i++) await delay(100)
const list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pending=new Map(); let capture=null
ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data)
  if(m.id!==undefined)pending.get(m.id)?.(m); else if(capture)capture.push(m)})
const send=(m,p={})=>new Promise(res=>{const i=++id;pending.set(i,r=>res(r.result));ws.send(JSON.stringify({id:i,method:m,params:p}))})
await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');await send('Accessibility.enable')
await send('Page.navigate',{url:PAGE}); await delay(1200)
async function subscribe(){
  const root=await send('Accessibility.getRootAXNode'); let f=[root.node]
  for(let d=0; d<10 && f.length; d++){ const n=[]
    for(const x of f){ if(!x.childIds?.length) continue
      const r=await send('Accessibility.getChildAXNodes',{id:x.nodeId}).catch(()=>null); if(r?.nodes) n.push(...r.nodes) }
    f=n }
}
await subscribe()
async function scenario(name,js,resub=false){
  capture=[]
  if(js) await send('Runtime.evaluate',{expression:js})
  await delay(500)
  const evs=capture.filter(e=>e.method==='Accessibility.nodesUpdated')
  const nodes=evs.flatMap(e=>e.params.nodes||[]); capture=null
  console.log(`### ${name}`)
  console.log(`  events:${evs.length} nodes:${nodes.length}`)
  for(const n of nodes.slice(0,10)){
    console.log(`    role=${n.role?.value} name="${n.name?.value??''}" ignored=${n.ignored} children=${n.childIds?.length??0}`)
  }
  if(resub) await subscribe()
  console.log()
}
console.log('--- PILLAR 3: can we distinguish append from remove+insert? ---\n')
await scenario('append #1', `document.getElementById('polite').appendChild(Object.assign(document.createElement('div'),{textContent:'one'}))`, true)
await scenario('append #2', `document.getElementById('polite').appendChild(Object.assign(document.createElement('div'),{textContent:'two'}))`, true)
await scenario('append #3', `document.getElementById('polite').appendChild(Object.assign(document.createElement('div'),{textContent:'three'}))`, true)
await scenario('REMOVE FRONT + APPEND (trim pattern)', `const r=document.getElementById('polite');r.removeChild(r.firstChild);r.appendChild(Object.assign(document.createElement('div'),{textContent:'four'}))`, true)
await scenario('WHOLESALE WIPE (textContent="")', `document.getElementById('polite').textContent=''`, true)
console.log('--- PILLAR 4: caret movement ---\n')
await send('Runtime.evaluate',{expression:`document.getElementById('txt').focus()`}); await delay(300); await subscribe()
await scenario('caret setSelectionRange 0->5', `document.getElementById('txt').setSelectionRange(5,5)`)
await scenario('arrow key (real input event)', null)
await send('Input.dispatchKeyEvent',{type:'rawKeyDown',windowsVirtualKeyCode:39,key:'ArrowRight'})
await send('Input.dispatchKeyEvent',{type:'keyUp',windowsVirtualKeyCode:39,key:'ArrowRight'})
capture=[]; await delay(500)
console.log('  after real ArrowRight keypress: events=', capture.filter(e=>e.method==='Accessibility.nodesUpdated').length)
console.log('\n  All CDP event methods seen this session:', [...new Set((capture||[]).map(e=>e.method))].join(', ')||'(none)')
ws.close(); proc.kill()
