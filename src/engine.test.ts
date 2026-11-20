import { describe, it, expect } from 'vitest'
import { runTool } from './engine'

describe('DevKit utility engine',()=>{
  it('formats valid JSON',async()=>expect(await runTool('json-formatter','{"a":1}','',{})).toContain('\n  "a": 1'))
  it('rejects invalid JSON',async()=>await expect(runTool('json-validator','{bad}','',{})).rejects.toThrow())
  it('encodes and decodes Base64',async()=>{
    expect(await runTool('base64','DevKit','',{mode:'encode'})).toBe('RGV2S2l0')
    expect(await runTool('base64','RGV2S2l0','',{mode:'decode'})).toBe('DevKit')
  })
  it('calculates an IPv4 /24 range',async()=>{
    const result=await runTool('cidr-calculator','192.168.1.0/24','',{})
    expect(result).toContain('Broadcast address: 192.168.1.255')
    expect(result).toContain('Usable hosts (traditional): 254')
  })
  it('converts a timestamp',async()=>expect(await runTool('timestamp','0','',{})).toContain('1970-01-01T00:00:00.000Z'))
  it('creates URL slugs',async()=>expect(await runTool('slug-generator','Hello World!','',{})).toBe('hello-world'))
  it('creates SQL inserts',async()=>expect(await runTool('sql-insert','[{"id":1}]','',{table:'users'})).toContain('INSERT INTO users'))
  it('generates UUID identifiers',async()=>expect((await runTool('uuid-generator','','',{count:'2'})).split('\n')).toHaveLength(2))
})

describe('additional utilities',()=>{
  it('deduplicates lines',async()=>expect(await runTool('line-deduplicator','a\nb\na','',{})).toBe('a\nb'))
  it('extracts email addresses',async()=>expect(await runTool('email-extractor','Reach a@b.com and c@d.org','',{})).toBe('a@b.com\nc@d.org'))
  it('converts IPv4 to integer',async()=>expect(await runTool('ipv4-to-integer','127.0.0.1','',{})).toBe('2130706433'))
  it('redacts likely secrets',async()=>expect(await runTool('secret-redactor','api_key=abc123','',{})).toContain('[REDACTED]'))
  it('creates conventional commits',async()=>expect(await runTool('conventional-commit-builder','add login','',{type:'feat',scope:'auth'})).toBe('feat(auth): add login'))
})


describe('expanded utility coverage',()=>{
  it('converts JSON to YAML',async()=>expect(await runTool('json-to-yaml','{"app":"DevKit","enabled":true}','',{})).toContain('app:'));
  it('converts CSV to JSON',async()=>expect(await runTool('csv-to-json','name,role\nAva,Engineer','',{})).toContain('Engineer'));
  it('minifies XML',async()=>expect(await runTool('xml-minifier','<root>  <item> ok </item> </root>','',{})).toBe('<root><item> ok </item></root>'));
  it('parses AWS ARNs',async()=>expect(await runTool('aws-arn-parser','arn:aws:s3:::my-bucket','',{})).toContain('s3'));
  it('converts IPv4 to integer',async()=>expect(await runTool('ipv4-to-integer','127.0.0.1','',{})).toBe('2130706433'));
  it('creates conventional commits',async()=>expect(await runTool('conventional-commit-builder','add login','',{type:'feat',scope:'auth'})).toBe('feat(auth): add login'));
  it('builds Docker run commands',async()=>expect(await runTool('docker-run','nginx:latest','',{ports:'8080:80'})).toContain('-p 8080:80'));
  it('sorts text lines',async()=>expect(await runTool('line-sorter','zebra\napple','',{})).toBe('apple\nzebra'));
  it('extracts selected CSV columns',async()=>expect(await runTool('csv-column-selector','name,role\nAva,Engineer','',{columns:'name'})).toContain('Ava'));
  it('calculates webhook HMAC signatures',async()=>expect(await runTool('webhook-signature-helper','payload','',{secret:'key'})).toHaveLength(64));
});
