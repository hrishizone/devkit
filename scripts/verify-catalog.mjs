import fs from 'node:fs'

const source = fs.readFileSync('src/tools.ts', 'utf8')
const marker = 'export const tools:Tool[]='
const start = source.indexOf(marker)
const end = source.indexOf('\nexport const categories', start)
if (start < 0 || end < 0) throw new Error('Could not locate the source tool catalogue.')
const sourceTools = JSON.parse(source.slice(start + marker.length, end).trim().replace(/;$/, ''))
const seoTools = JSON.parse(fs.readFileSync('seo-tools.json', 'utf8'))
const sourceById = new Map()
for (const tool of sourceTools) {
  if (sourceById.has(tool.id)) throw new Error(`Duplicate source tool ID: ${tool.id}`)
  sourceById.set(tool.id, tool)
}
const seoById = new Map()
for (const tool of seoTools) {
  if (seoById.has(tool.id)) throw new Error(`Duplicate SEO tool ID: ${tool.id}`)
  seoById.set(tool.id, tool)
}
if (sourceTools.length !== 221 || seoTools.length !== sourceTools.length) {
  throw new Error(`Catalogue count mismatch: source=${sourceTools.length}, SEO=${seoTools.length}`)
}
for (const [id, tool] of sourceById) {
  const seo = seoById.get(id)
  if (!seo) throw new Error(`Missing SEO metadata for ${id}`)
  for (const key of ['name', 'description', 'category']) {
    if (seo[key] !== tool[key]) throw new Error(`SEO ${key} is out of sync for ${id}`)
  }
}
for (const id of seoById.keys()) if (!sourceById.has(id)) throw new Error(`Unknown SEO tool ID: ${id}`)
console.log(`Verified ${sourceTools.length} source and SEO catalogue entries are synchronized.`)
