import fs from 'node:fs'
const tools=JSON.parse(fs.readFileSync('seo-tools.json','utf8'))
const siteUrl=new URL(process.env.SITE_URL || 'https://devkit-fawn.vercel.app')
if(siteUrl.protocol!=='https:'||siteUrl.username||siteUrl.password||siteUrl.pathname!=='/'||siteUrl.search||siteUrl.hash)throw new Error('SITE_URL must be a root HTTPS origin without credentials, path, query or fragment.')
const base=siteUrl.origin
for(const tool of tools)if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id))throw new Error(`Invalid sitemap tool slug: ${tool.id}`)
const urls=tools.map(t=>`  <url><loc>${base}/tools/${t.id}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join('\n')
fs.writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n${urls}\n</urlset>\n`)
fs.writeFileSync('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`)
console.log('Generated sitemap.xml and robots.txt')
