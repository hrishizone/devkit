import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const tools = JSON.parse(fs.readFileSync(path.join(root, 'seo-tools.json'), 'utf8'))
const site = new URL(process.env.SITE_URL || 'https://devkit-fawn.vercel.app')
if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
  throw new Error('SITE_URL must be a root HTTPS origin without credentials, path, query or fragment.')
}
const base = site.origin
const ids = new Set()
for (const tool of tools) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id)) throw new Error(`Invalid SEO slug: ${tool.id}`)
  if (ids.has(tool.id)) throw new Error(`Duplicate SEO slug: ${tool.id}`)
  ids.add(tool.id)
  const file = path.join(dist, 'tools', tool.id, 'index.html')
  if (!fs.existsSync(file)) throw new Error(`Missing SEO page: ${tool.id}`)
  const html = fs.readFileSync(file, 'utf8')
  const canonical = `<link rel="canonical" href="${base}/tools/${tool.id}" />`
  if (!html.includes(canonical)) throw new Error(`Incorrect canonical URL: ${tool.id}`)
  if (html.includes('devkit.example')) throw new Error(`Placeholder domain found in SEO page: ${tool.id}`)
  const match = html.match(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/)
  if (!match) throw new Error(`Missing JSON-LD metadata: ${tool.id}`)
  let structured
  try { structured = JSON.parse(match[1]) } catch { throw new Error(`Invalid JSON-LD metadata: ${tool.id}`) }
  if (structured.name !== tool.name || structured.url !== `${base}/tools/${tool.id}`) {
    throw new Error(`Mismatched JSON-LD metadata: ${tool.id}`)
  }
}
if (tools.length !== 221) throw new Error(`Expected 221 SEO pages, found ${tools.length}`)
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8')
const locCount = (sitemap.match(/<loc>/g) || []).length
if (locCount !== tools.length + 1 || !sitemap.includes(`<loc>${base}/</loc>`)) {
  throw new Error(`Sitemap should contain ${tools.length + 1} URLs, found ${locCount}`)
}
if (sitemap.includes('devkit.example')) throw new Error('Placeholder domain found in sitemap.')
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8')
if (!robots.includes(`Sitemap: ${base}/sitemap.xml`)) throw new Error('robots.txt sitemap URL is incorrect.')
console.log(`Verified ${tools.length} SEO pages and ${locCount} sitemap URLs for ${base}.`)
