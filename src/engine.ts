const enc=(s:string)=>btoa(unescape(encodeURIComponent(s)))
const dec=(s:string)=>decodeURIComponent(escape(atob(s.trim())))
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export async function runTool(id:string,input:string,secondary:string,opts:Record<string,string>):Promise<string>{
 switch(id){
 case 'json-formatter':case 'json-validator':return JSON.stringify(JSON.parse(input),null,2)
 case 'json-minifier':return JSON.stringify(JSON.parse(input))
 case 'base64':return opts.mode==='decode'?dec(input):enc(input)
 case 'url-encoder':return opts.mode==='decode'?decodeURIComponent(input):encodeURIComponent(input)
 case 'html-entities':return opts.mode==='decode'?input.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&'):esc(input)
 case 'slug-generator':return input.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
 case 'timestamp':{const n=Number(input);const d=new Date(Math.abs(n)<1e12?n*1000:n);if(!Number.isFinite(n)||isNaN(d.getTime()))throw Error('Enter a valid Unix timestamp.');return `UTC: ${d.toISOString()}\nLocal: ${d.toString()}`}
 case 'cidr-calculator':{const [ip,pS]=input.trim().split('/');const p=Number(pS);const a=ip.split('.').map(Number);if(a.length!==4||a.some(n=>!Number.isInteger(n)||n<0||n>255)||!Number.isInteger(p)||p<0||p>32)throw Error('Enter IPv4 CIDR, e.g. 192.168.1.0/24');const n=a.reduce((x,y)=>(x*256+y)>>>0,0)>>>0,mask=p===0?0:(0xffffffff<<(32-p))>>>0,net=(n&mask)>>>0,bc=(net|(~mask>>>0))>>>0,fmt=(v:number)=>[v>>>24,(v>>>16)&255,(v>>>8)&255,v&255].join('.');return `Network: ${fmt(net)}/${p}\nNetmask: ${fmt(mask)}\nBroadcast address: ${fmt(bc)}\nUsable hosts (traditional): ${p>=31?2:Math.max(0,2**(32-p)-2)}`}
 case 'text-diff':{const a=input.split(/\r?\n/),b=secondary.split(/\r?\n/);return a.map((v,i)=>v===b[i]?null:`Line ${i+1}\n- ${v??'(missing)'}\n+ ${b[i]??'(missing)'}`).filter(Boolean).join('\n\n')||'No differences found.'}
 case 'json-diff':{const a=JSON.parse(input),b=JSON.parse(secondary);return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>`${k}: ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`).join('\n')||'No differences found.'}
 case 'hash-generator':{const digest=await crypto.subtle.digest((opts.algorithm||'SHA-256') as AlgorithmIdentifier,new TextEncoder().encode(input));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
 case 'uuid-generator':return Array.from({length:Math.min(100,Math.max(1,Number(opts.count)||1))},()=>crypto.randomUUID()).join('\n')
 case 'word-counter':return `Words: ${(input.trim().match(/\S+/g)||[]).length}\nCharacters: ${input.length}\nLines: ${input?input.split(/\r?\n/).length:0}`
 case 'line-deduplicator':return [...new Set(input.split(/\r?\n/))].join('\n')
 case 'email-extractor':return [...new Set(input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[])].join('\n')
 case 'secret-redactor':return input.replace(/(password|token|secret|api[_-]?key|authorization)(\s*[:=]\s*)([^\s,;]+)/gi,'$1$2[REDACTED]')
 case 'sql-insert':{const rows=JSON.parse(input);if(!Array.isArray(rows)||!rows.length)throw Error('Provide a non-empty JSON array.');const cols=Object.keys(rows[0]);return `INSERT INTO ${opts.table||'your_table'} (${cols.join(', ')}) VALUES\n${rows.map((r:any)=>'('+cols.map(c=>typeof r[c]==='number'?r[c]:r[c]===null?'NULL':"'"+String(r[c]??'').replace(/'/g,"''")+"'").join(', ')+')').join(',\n')};`}
 default:throw Error('This utility is not implemented yet.')
 }
}