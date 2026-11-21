import fs from 'node:fs'
import path from 'node:path'
const root = process.cwd()
const dist = path.join(root, 'dist')
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const tools = JSON.parse(fs.readFileSync(path.join(root, 'seo-tools.json'), 'utf8'))
const siteUrl = new URL(process.env.SITE_URL || 'https://devkit-fawn.vercel.app')
if (siteUrl.protocol !== 'https:' || siteUrl.username || siteUrl.password || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) throw new Error('SITE_URL must be a root HTTPS origin without credentials, path, query or fragment.')
const base = siteUrl.origin
for (const tool of tools) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id)) throw new Error(`Invalid SEO tool slug: ${tool.id}`)
  const title = `${tool.name} — Free Online Developer Tool | DevKit`
  const description = `${tool.description} Use DevKit's free, fast, browser-based ${tool.name.toLowerCase()} utility.`
  const canonical = `${base}/tools/${tool.id}`
  const escaped = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  const fallback = `<main class="seo-fallback"><h1>${escaped(tool.name)}</h1><p>${escaped(description)}</p><p>DevKit provides browser-based developer utilities for formatting, converting, validating and debugging common development tasks. This tool is designed to run locally in your browser where possible.</p><p><a href="/">Explore all DevKit tools</a></p><h2>How to use ${escaped(tool.name)}</h2><ol><li>Paste or enter your input in the tool workspace.</li><li>Run the tool to process your data.</li><li>Copy the result when it is ready.</li></ol><p>DevKit is a browser-first developer toolkit. Do not paste production secrets or private credentials into websites you do not trust.</p></main>`
  const jsonLd = JSON.stringify({"@context":"https://schema.org","@type":"WebApplication","name":tool.name,"applicationCategory":"DeveloperApplication","operatingSystem":"Any","description":description,"url":canonical}).replaceAll('&','\\u0026').replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029')
  let html = template
    .replace('<div id="root"></div>', `<div id="root">${fallback}</div>`)
    .replace(/<title>.*?<\/title>/, `<title>${escaped(title)}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${escaped(description)}" />`)
    .replace('</head>', `<link rel="canonical" href="${canonical}" />\n<meta property="og:type" content="website" />\n<meta property="og:title" content="${escaped(title)}" />\n<meta property="og:description" content="${escaped(description)}" />\n<meta property="og:url" content="${canonical}" />\n<script type="application/ld+json">${jsonLd}</script>\n</head>`)
  const dir = path.join(dist, 'tools', tool.id)
  fs.mkdirSync(dir, {recursive:true})
  fs.writeFileSync(path.join(dir,'index.html'), html)
}
console.log(`Generated ${tools.length} SEO landing pages.`)
