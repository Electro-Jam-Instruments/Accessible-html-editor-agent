import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', PORT=9335
const PAGE=`data:text/html,${encodeURIComponent(`<!doctype html><html><body>
<button id="b1">First</button><button id="b2" aria-pressed="false">Toggle</button>
<button id="b3">Will disable</button>
<div id="polite" aria-live="polite"></div>
<input id="txt" value="hello world" /></body></html>`)}`
const proc=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--no-sandbox','--disable-gpu','--force-renderer-accessibility','about:blank'],{stdio:['ignore','pipe','pipe']})
let ready=false; proc.stderr.on('data',d=>{if(String(d).includes('DevTools listening'))ready=true})
for(let i=0;i<100&&!ready;i++) await delay(100)
const list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pending=new Map(); let capture=null
ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data)
  if(m.id!==undefined)pending.get(m.id)?.(m); else if(capture)capture.push(m)})
const send=(method,params={})=>new Promise(res=>{const i=++id;pending.set(i,r=>res(r.result));ws.send(JSON.stringify({id:i,method,params}))})

await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('Accessibility.enable')
await send('Page.navigate',{url:PAGE}); await delay(1200)

// HYPOTHESIS: nodesUpdated only reports nodes the client has already loaded.
// Walk the whole tree via getRootAXNode + getChildAXNodes to "subscribe" to everything.
const root=await send('Accessibility.getRootAXNode')
let frontier=[root.node], loaded=0
for(let depth=0; depth<8 && frontier.length; depth++){
  const next=[]
  for(const n of frontier){
    loaded++
    if(!n.childIds?.length) continue
    const r=await send('Accessibility.getChildAXNodes',{id:n.nodeId}).catch(()=>null)
    if(r?.nodes) next.push(...r.nodes)
  }
  frontier=next
}
console.log(`Subscribed by walking ${loaded} nodes\n`)

async function scenario(name,js){
  capture=[]
  await send('Runtime.evaluate',{expression:js}); await delay(500)
  const evs=capture.filter(e=>e.method==='Accessibility.nodesUpdated')
  const nodes=evs.flatMap(e=>e.params.nodes||[]); capture=null
  console.log(`### ${name}\n  events:${evs.length} nodes:${nodes.length}`)
  for(const n of nodes.slice(0,6)){
    const p=Object.fromEntries((n.properties||[]).map(x=>[x.name,x.value?.value]))
    const keep={}
    for(const k of ['focused','disabled','pressed','live','atomic','busy'])
      if(p[k]!==undefined) keep[k]=p[k]
    console.log('   ',JSON.stringify({role:n.role?.value,name:n.name?.value,ignored:n.ignored,...keep}))
  }
  console.log()
}
await scenario('P1 focus b1',`document.getElementById('b1').focus()`)
await scenario('P1 focus b2',`document.getElementById('b2').focus()`)
await scenario('P2 aria-pressed true',`document.getElementById('b2').setAttribute('aria-pressed','true')`)
await scenario('P2 focused button disabled',`const b=document.getElementById('b3');b.focus();b.disabled=true`)
await scenario('P3 live append #1',`document.getElementById('polite').appendChild(Object.assign(document.createElement('div'),{textContent:'first'}))`)
await scenario('P3 live append #2',`document.getElementById('polite').appendChild(Object.assign(document.createElement('div'),{textContent:'second'}))`)
await scenario('P3 live REMOVE+INSERT (trim)',`const r=document.getElementById('polite');r.removeChild(r.firstChild);r.appendChild(Object.assign(document.createElement('div'),{textContent:'third'}))`)
await scenario('P4 caret in input',`const t=document.getElementById('txt');t.focus();t.setSelectionRange(3,3)`)
ws.close(); proc.kill()
