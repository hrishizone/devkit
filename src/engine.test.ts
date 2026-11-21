import { describe, it, expect } from 'vitest'
import { runTool } from './engine'
import { tools } from './tools'

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
  it('creates SQL inserts',async()=>expect(await runTool('sql-insert','[{"id":1}]','',{table:'users'})).toContain('INSERT INTO \"users\"'))
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
  it('builds Docker run commands',async()=>expect(await runTool('docker-run','nginx:latest','',{ports:'8080:80'})).toContain("-p '8080:80'"));
  it('sorts text lines',async()=>expect(await runTool('line-sorter','zebra\napple','',{})).toBe('apple\nzebra'));
  it('extracts selected CSV columns',async()=>expect(await runTool('csv-column-selector','name,role\nAva,Engineer','',{columns:'name'})).toContain('Ava'));
  it('calculates webhook HMAC signatures',async()=>expect(await runTool('webhook-signature-helper','payload','',{secret:'key'})).toHaveLength(64));
});



const sampleForTool = (id: string): [string,string,Record<string,string>] => {
  const jsonObj = '{"name":"DevKit","count":2,"active":true,"nested":{"x":1}}'
  const jsonArr = '[{"name":"Ava","role":"Engineer"},{"name":"Ben","role":"Designer"}]'
  const csvText = 'name,role\nAva,Engineer\nBen,Designer'
  const url = 'https://example.com/path?x=1&y=two'
  const date = '2024-01-15T12:30:00Z'
  const jwt = btoa('{"alg":"none"}').replace(/=/g,'')+'.'+btoa('{"sub":"123","exp":4102444800}').replace(/=/g,'')+'.signature'
  if (['json-to-csv','json-to-html-table','sql-insert','json-to-postgresql','json-to-mysql'].includes(id)) return [jsonArr,'',{table:'sample'}]
  if (id.startsWith('json-lines')) return ['{"a":1}\n{"b":2}','',{}]
  if (['json-formatter','json-validator','json-minifier','json-schema','json-to-typescript','json-to-yaml','json-flatten','json-type-inspector'].includes(id)) return [jsonObj,'',{name:'Sample'}]
  if (['yaml-to-json'].includes(id)) return ['name: DevKit\nactive: true','',{}]
  if (id==='json-diff') return [jsonObj,'{"name":"DevKit 2","count":3}',{}]
  if (id==='json-pointer-tester') return [jsonObj,'',{pointer:'/nested/x'}]
  if (id==='json-array-sorter'||id==='json-array-chunker') return [jsonArr,'',{key:'name',size:'1'}]
  if (['json-key-remover','json-key-picker','json-value-search','json-key-renamer','json-unflatten'].includes(id)) return [jsonObj,'',{keys:'nested',query:'DevKit',from:'name',to:'project'}]
  if (id==='csv-to-json'||id==='csv-formatter'||id==='csv-validator'||id==='csv-column-selector') return [csvText,'',{columns:'name'}]
  if (id==='tsv-to-csv'||id==='sql-to-json') return ['name\trole\nAva\tEngineer','',{}]
  if (id==='xml-minifier'||id==='html-formatter') return ['<root>  <item> ok </item> </root>','',{}]
  if (id==='base64') return ['DevKit','',{mode:'encode'}]
  if (id==='url-encoder') return ['hello world','',{mode:'encode'}]
  if (id==='html-entities') return ['<p>hello</p>','',{mode:'encode'}]
  if (id==='hex-converter') return ['DevKit','',{mode:'encode'}]
  if (id==='binary-to-text') return ['0100100001101001','',{}]
  if (id==='text-to-binary') return ['Hi','',{}]
  if (id==='octal-converter') return ['42','',{mode:'encode'}]
  if (id==='decimal-to-hex') return ['255','',{}]
  if (id==='hex-to-decimal') return ['ff','',{}]
  if (id==='rot13-converter') return ['Hello','',{}]
  if (id==='morse-code-converter') return ['hello world','',{mode:'encode'}]
  if (['jwt-decoder','jwt-claims-inspector','jwt-expiry-checker'].includes(id)) return [jwt,'',{}]
  if (id==='hash-generator') return ['DevKit','',{algorithm:'SHA-256'}]
  if (id==='hmac-sha-256'||id==='webhook-signature-helper') return ['payload','',{secret:'secret'}]
  if (id==='uuid-validator') return ['550e8400-e29b-41d4-a716-446655440000','',{}]
  if (['uuid-generator','uuid-v7-generator','nano-id-generator','random-token-generator','random-hex-generator','password','passphrase-generator'].includes(id)) return ['', '',{count:'2',length:'16'}]
  if (id==='base58-encoder'||id==='base32-reference') return ['DevKit','',{mode:'encode'}]
  if (id==='unicode-escape-converter') return ['hello','',{mode:'encode'}]
  if (id==='percent-encoding-inspector') return ['hello world','',{}]
  if (id==='text-diff') return ['one\ntwo','one\nthree',{}]
  if (id==='case-converter') return ['hello world','',{mode:'PascalCase'}]
  if (id==='regex-tester') return ['hello 123','\\d+',{}]
  if (id==='slug-generator'||id==='text-to-slug-batch') return ['Hello World\nSecond Line','',{}]
  if (id==='word-counter'||id==='line-counter'||id==='duplicate-line-finder'||id==='line-deduplicator'||id==='line-sorter'||id==='line-reverser'||id==='text-trimmer'||id==='whitespace-visualizer'||id==='sentence-counter'||id==='paragraph-counter'||id==='text-frequency-analyzer'||id==='email-extractor'||id==='email-validator'||id==='url-extractor'||id==='ip-extractor'||id==='phone-number-cleaner'||id==='html-tag-stripper'||id==='unicode-inspector'||id==='lorem'||id==='text-repeater'||id==='text-joiner'||id==='text-splitter') return ['Hello world.\nHello a@example.com https://example.com 192.168.1.1\n','',{count:'2',size:'5',separator:', '}]
  if (id==='sql-in-list-builder'||id==='sql-column-list-builder') return ['alpha\nbeta\ngamma','',{}]
  if (id==='sql-create-table-builder') return [jsonArr,'',{table:'sample'}]
  if (id==='sql-formatter'||id==='graphql-formatter'||id==='sql-query-minifier') return ['select id, name from users where active = true','',{}]
  if (id==='sql-identifier-quoter') return ['users,id','',{dialect:'postgres'}]
  if (id==='sql-literal-escaper') return ["O'Reilly",'',{}]
  if (id==='sql-table-name-validator') return ['valid_table','',{}]
  if (id==='sql-explain-guide') return ['select 1','',{}]
  if (['postgresql-url-parser','mysql-url-parser','mongodb-uri-parser','redis-url-parser','database-url-masker'].includes(id)) return [id==='postgresql-url-parser'?'postgresql://user:pass@localhost:5432/app':id==='mysql-url-parser'?'mysql://user:pass@localhost:3306/app':id==='mongodb-uri-parser'?'mongodb://user:pass@localhost:27017/app':id==='redis-url-parser'?'redis://user:pass@localhost:6379/0':'postgresql://user:pass@localhost:5432/app','',{}]
  if (id==='http-method-lookup') return ['GET','',{}]
  if (id==='http-status'||id==='status-code-reference') return ['200','',{}]
  if (id==='mime-type-lookup') return ['json','',{}]
  if (id==='content-type-builder') return ['application/json','',{}]
  if (id==='header-parser') return ['Content-Type: application/json\nAuthorization: Bearer abc','',{}]
  if (id==='query-string-parser'||id==='url-query-editor') return [url,'',{}]
  if (id==='query-string-builder') return ['name,Ava\nrole,Engineer','',{}]
  if (id==='http-basic-auth-builder') return ['user:pass','',{}]
  if (id==='bearer-header-builder') return ['token','',{}]
  if (id==='http-authorization-redactor') return ['Authorization: Bearer secret','',{}]
  if (id==='http-accept-header-builder') return ['application/json,text/plain','',{}]
  if (id==='http-cache-header-helper') return ['no-cache','',{}]
  if (id==='cors-header-guide') return ['','',{origin:'https://example.com'}]
  if (id==='graphql-variables-validator') return ['{"id":1}','',{}]
  if (id==='http-date-converter') return [date,'',{}]
  if (id==='curl-builder') return ['{"method":"POST","url":"https://example.com","body":{"a":1}}','',{}]
  if (id==='chmod') return ['755','',{}]
  if (id==='cron-builder') return ['0 9 * * 1-5','',{}]
  if (id==='env-formatter') return ['B=2\nA=1','',{}]
  if (id==='docker-run') return ['nginx:latest','',{ports:'8080:80'}]
  if (id==='dockerfile-starter') return ['node:22-alpine','',{}]
  if (id==='docker-compose-starter') return ['nginx:latest','',{}]
  if (id==='docker-tag-builder') return ['registry.example.com/app:1.0','',{source:'app:latest'}]
  if (id==='docker-port-mapper') return ['8080:80','',{}]
  if (id==='kubernetes-deployment-starter'||id==='kubernetes-service-starter') return ['sample-app','',{}]
  if (id==='kubernetes-configmap-builder') return ['ENV=prod\nREGION=ap-south-1','',{}]
  if (id==='kubernetes-label-builder') return ['app=web,team=platform','',{}]
  if (id==='terraform-variable-builder'||id==='terraform-output-builder') return ['resource_id','',{}]
  if (id==='terraform-resource-address-parser') return ['aws_instance.web.id','',{}]
  if (id==='aws-arn-parser') return ['arn:aws:s3:::my-bucket','',{}]
  if (id==='aws-s3-uri-parser'||id==='aws-s3-key-url-encoder') return ['s3://my-bucket/folder/file name.txt','',{}]
  if (id==='iam-policy-json-formatter') return ['{"Version":"2012-10-17","Statement":[]}','',{}]
  if (id==='systemd-unit-starter') return ['example service','',{}]
  if (id==='environment-variable-diff') return ['A=1\nB=2','A=1\nB=3',{}]
  if (id==='ipv4-address-class-lookup') return ['192.168.1.1','',{}]
  if (id==='ipv4-validator'||id==='ipv4-private-range-checker'||id==='ipv4-to-integer'||id==='ip-extractor') return ['192.168.1.1','',{}]
  if (id==='integer-to-ipv4') return ['3232235777','',{}]
  if (id==='cidr-calculator'||id==='subnet-range-finder'||id==='ipv4-cidr-to-netmask'||id==='ipv4-broadcast-calculator') return ['192.168.1.0/24','',{}]
  if (id==='wildcard-mask-converter') return ['192.168.1.0/24','',{}]
  if (id==='ipv6-validator') return ['2001:db8::1','',{}]
  if (id==='mac-address-formatter') return ['00-1A-2B-3C-4D-5E','',{}]
  if (id==='port-number-reference') return ['443','',{}]
  if (id==='tcp-port-range-checker') return ['1000-2000','',{}]
  if (id==='dns-record-reference') return ['A','',{}]
  if (id==='url-parser'||id==='url-hostname-inspector') return [url,'',{}]
  if (id==='domain-name-extractor') return [url,'',{}]
  if (id==='color-converter'||id==='hex-to-rgb'||id==='rgb-to-hex'||id==='color-contrast-calculator') return ['#336699','',{}]
  if (id==='css-gradient') return ['#6366f1, #06b6d4','',{}]
  if (id==='css-minifier') return ['/* note */ .x { color: red; }','',{}]
  if (id==='css-grid-builder') return ['repeat(3, 1fr)','',{gap:'1rem'}]
  if (id==='css-transform-builder') return ['translateX(0)','',{}]
  if (id==='css-box-shadow-builder'||id==='css-border-radius-builder'||id==='css-flexbox-playground'||id==='css-unit-converter'||id==='css-clamp-builder'||id==='css-animation-builder') return ['16px','',{direction:'row',min:'1rem',preferred:'2vw',max:'3rem'}]
  if (id==='svg-data-uri-encoder') return ['<svg></svg>','',{}]
  if (id==='markdown-preview'||id==='github-markdown-preview') return ['# Hello\nA paragraph','',{}]
  if (id==='html-meta-tag-builder'||id==='open-graph-tag-builder'||id==='meta-description-counter') return ['A useful page description','',{title:'Sample'}]
  if (id==='favicon-html-builder') return ['/favicon.ico','',{}]
  if (id==='css-specificity-calculator') return ['#app .card:hover','',{}]
  if (id==='html-input-builder') return ['Enter name','',{name:'name',label:'Name',type:'text'}]
  if (id==='password-strength-estimator') return ['CorrectHorseBatteryStaple!2024','',{}]
  if (id==='credential-pattern-scanner') return ['AWS key AKIA1234567890ABCDEF','',{}]
  if (id==='secret-redactor') return ['api_key=abc123','',{}]
  if (id==='csp-header-builder') return ["default-src 'self'",'',{}]
  if (id==='security-headers-reference'||id==='tls-version-reference'||id==='sha-256-file-checksum-guide') return ['','',{}]
  if (id==='timestamp'||id==='date-to-unix-timestamp'||id==='iso-date-converter'||id==='rfc-3339-formatter') return [date,'',{}]
  if (id==='unix-milliseconds-converter') return ['1700000000000','',{}]
  if (id==='current-utc-time') return ['','',{}]
  if (id==='timezone-offset-helper') return [date,'',{}]
  if (id==='time-duration-calculator'||id==='business-days-between-dates') return ['2024-01-01,2024-01-10','',{}]
  if (id==='duration-to-seconds') return ['1d 2h 30m 10s','',{}]
  if (id==='seconds-to-duration') return ['93784','',{}]
  if (id==='week-number-calculator'||id==='date-to-iso-week') return [date,'',{}]
  if (id==='leap-year-checker') return ['2024','',{}]
  if (id==='gitignore-generator') return ['node,python,vscode','',{}]
  if (id==='git-branch-name-helper') return ['Add Login Page','',{type:'feature'}]
  if (id==='conventional-commit-builder') return ['add login','',{type:'feat',scope:'auth'}]
  if (id==='semantic-version-helper') return ['1.2.3','',{}]
  if (id==='changelog-starter'||id==='github-readme-starter'||id==='github-issue-template'||id==='pull-request-template') return ['Add a useful feature','',{}]
  if (id==='github-actions-starter') return ['','',{}]
  if (id==='git-remote-url-converter'||id==='git-remote-ssh-to-https') return ['git@github.com:octocat/hello-world.git','',{}]
  if (id==='git-remote-https-to-ssh') return ['https://github.com/octocat/hello-world.git','',{}]
  if (id==='github-markdown-preview') return ['# Hello','',{}]
  if (id==='git-command-cheat-sheet') return ['','',{}]
  if (id==='git-tag-formatter') return ['1.2.3','',{}]
  if (id==='log-level-filter') return ['INFO startup\nERROR failed','',{level:'ERROR'}]
  return ['sample input','sample secondary',{}]
}
describe('complete catalogue execution matrix',()=>{
  it.each(tools)('$id executes its own handler',async ({id})=>{
    const [input,secondary,opts]=sampleForTool(id)
    const result=await runTool(id,input,secondary,opts)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('algorithm-specific correctness',()=>{
  it('encodes and decodes RFC 4648 Base32',async()=>{
    expect(await runTool('base32-reference','foo','',{mode:'encode'})).toBe('MZXW6===')
    expect(await runTool('base32-reference','MZXW6===','',{mode:'decode'})).toBe('foo')
  })
  it('encodes Base58 bytes',async()=>{
    expect(await runTool('base58-encoder','Hello World','',{})).toBe('JxF12TrwUP45BMd')
  })
  it('generates RFC 9562 version 7 UUIDs',async()=>{
    const ids=(await runTool('uuid-v7-generator','','',{count:'3'})).split('\n')
    expect(ids).toHaveLength(3)
    for(const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })
  it('returns the CIDR broadcast and traditional host labels',async()=>{
    const out=await runTool('cidr-calculator','192.168.1.0/24','',{})
    expect(out).toContain('Broadcast address: 192.168.1.255')
    expect(out).toContain('Usable hosts (traditional): 254')
  })
})
