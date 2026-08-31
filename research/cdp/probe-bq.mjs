import { launch } from './driver.mjs'
const d = await launch()
try {
  await d.send('Page.navigate', { url: 'data:text/html,' + encodeURIComponent(`
    <h1>a heading</h1>
    <blockquote>a quotation</blockquote>
    <blockquote cite="https://x">cited quotation</blockquote>
    <div role="blockquote">aria blockquote</div>
    <div class="fake-quote" style="border-left:3px solid">styled div quote</div>
    <ul><li>list item</li></ul>
    <p>plain paragraph</p>
  `)})
  await new Promise(r => setTimeout(r, 600))
  const { nodes } = await d.send('Accessibility.getFullAXTree')
  console.log('role'.padEnd(22) + 'name / text')
  console.log('-'.repeat(70))
  for (const n of nodes) {
    const role = n.role?.value ?? ''
    if (['RootWebArea','none','generic','InlineTextBox'].includes(role)) continue
    const name = n.name?.value ?? ''
    const val = n.value?.value ?? ''
    console.log(role.padEnd(22) + JSON.stringify(name || val).slice(0, 46))
  }
} finally { await d.close() }
