const enc=(s:string)=>btoa(unescape(encodeURIComponent(s)));
const dec=(s:string)=>decodeURIComponent(escape(atob(s.trim())));
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const lines=(s:string)=>s.replace(/\r/g,'').split('\n');
const words=(s:string)=>s.trim().match(/\S+/g)||[];
const json=(s:string)=>JSON.parse(s);
const pretty=(x:unknown)=>JSON.stringify(x,null,2);
const slug=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const csv=(s:string,d=',')=>{const out:string[][]=[];let row:string[]=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'&&q&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=!q;else if(c===d&&!q){row.push(v);v=''}else if(c==='\n'&&!q){row.push(v);out.push(row);row=[];v=''}else if(c!=='\r')v+=c}if(v||row.length){row.push(v);out.push(row)}return out};
const csvOut=(r:unknown[][])=>r.map(row=>row.map(x=>{const s=String(x??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(',')).join('\n');
const ipN=(s:string)=>{const a=s.split('.').map(Number);if(a.length!==4||a.some(x=>!Number.isInteger(x)||x<0||x>255))throw Error('Enter a valid IPv4 address.');return a.reduce((n,x)=>(n*256+x)>>>0,0)>>>0};
const ipS=(n:number)=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
const qsql=(x:any)=>x===null?'NULL':typeof x==='number'||typeof x==='boolean'?String(x):"'"+String(x??'').replace(/'/g,"''")+"'";
const statuses:Record<string,string>={'200':'OK','201':'Created','204':'No Content','301':'Moved Permanently','302':'Found','304':'Not Modified','400':'Bad Request','401':'Unauthorized','403':'Forbidden','404':'Not Found','405':'Method Not Allowed','409':'Conflict','422':'Unprocessable Content','429':'Too Many Requests','500':'Internal Server Error','502':'Bad Gateway','503':'Service Unavailable','504':'Gateway Timeout'};
const mime:Record<string,string>={html:'text/html',css:'text/css',js:'text/javascript',json:'application/json',xml:'application/xml',txt:'text/plain',csv:'text/csv',pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',zip:'application/zip',yaml:'application/yaml'};
export async function runTool(id:string,input:string,secondary:string,opts:Record<string,string>):Promise<string>{
const mode=opts.mode||'encode',v=input;
if(['json-formatter','json-validator','json-lines-formatter','json-lines-validator'].includes(id))return id.startsWith('json-lines')?lines(v).filter(x=>x.trim()).map(x=>pretty(json(x))).join('\n'):pretty(json(v));
if(id==='xml-minifier')return v.replace(/<!--[\\s\\S]*?-->/g,'').replace(/>\\s+</g,'><').replace(/\\s{2,}/g,' ').trim();
if(id==='csv-column-selector'){const r=csv(v),keys=(opts.columns||secondary).split(/[ ,]+/).filter(Boolean);return csvOut([r[0].filter((k,i)=>keys.includes(k)||keys.includes(String(i+1))),...r.slice(1).map(row=>row.filter((_,i)=>keys.includes(r[0][i])||keys.includes(String(i+1))) )])}
if(id==='ipv4-address-class-lookup'){const n=ipN(v),a=n>>>24;return a<=127?'Class A (legacy)':a<=191?'Class B (legacy)':a<=223?'Class C (legacy)':a<=239?'Class D multicast':'Class E reserved'}
if(id==='webhook-signature-helper'){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(opts.secret||secondary),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(v));return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,'0')).join('')}
if(id==='json-minifier')return JSON.stringify(json(v));
if(id==='json-to-yaml'){const walk=(x:any,n=0):string=>x&&typeof x==='object'?Object.entries(x).map(([k,y])=>' '.repeat(n)+k+': '+(y&&typeof y==='object'?'\n'+walk(y,n+2):JSON.stringify(y))).join('\n'):String(x);return walk(json(v))}
if(id==='yaml-to-json'){const o:any={};for(const l of lines(v)){const m=l.match(/^\s*([^:#]+):\s*(.*)$/);if(m){const x=m[2];o[m[1].trim()]=x==='true'?true:x==='false'?false:/^-?\d+(\.\d+)?$/.test(x)?Number(x):x.replace(/^['"]|['"]$/g,'')}}return pretty(o)}
if(id==='json-diff'){const a=json(v),b=json(secondary);return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>k+': '+JSON.stringify(a[k])+' → '+JSON.stringify(b[k])).join('\n')||'No differences found.'}
if(['csv-to-json','csv-formatter','csv-validator','tsv-to-csv'].includes(id)){const r=csv(v,id==='tsv-to-csv'?'\t':',');if(id==='tsv-to-csv'||id==='csv-formatter')return csvOut(r);if(id==='csv-validator'){const n=r[0]?.length||0;return r.every(x=>x.length===n)?'Valid CSV: '+(r.length-1)+' data rows.':'Invalid CSV: inconsistent column counts.'}return pretty(r.slice(1).map(row=>Object.fromEntries(r[0].map((k,i)=>[k,row[i]??'']))))}
if(id==='json-to-csv'){const a=json(v);if(!Array.isArray(a))throw Error('Provide a JSON array.');const h=[...new Set(a.flatMap((x:any)=>Object.keys(x)))];return csvOut([h,...a.map((x:any)=>h.map(k=>x[k]))])}
if(id==='json-schema'){const infer=(x:any):any=>x===null?{type:'null'}:Array.isArray(x)?{type:'array',items:x.length?infer(x[0]):{}}:typeof x==='object'?{type:'object',properties:Object.fromEntries(Object.entries(x).map(([k,y])=>[k,infer(y)])),required:Object.keys(x)}:{type:typeof x};return pretty({$schema:'https://json-schema.org/draft/2020-12/schema',...infer(json(v))})}
if(id==='json-to-typescript'){const o=json(v);return 'export interface '+(opts.name||'Root')+' {\n'+Object.entries(o).map(([k,x])=>'  '+k+': '+(x===null?'unknown':Array.isArray(x)?'unknown[]':typeof x==='object'?'Record<string, unknown>':typeof x)+';').join('\n')+'\n}'}
if(id==='json-to-html-table'){const a=json(v),h=[...new Set(a.flatMap((x:any)=>Object.keys(x)))];return '<table><thead><tr>'+h.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead><tbody>'+a.map((x:any)=>'<tr>'+h.map(k=>'<td>'+esc(String(x[k]??''))+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
if(id==='json-pointer-tester'){let x=json(v);for(const k of (opts.pointer||secondary).split('/').slice(1))x=x?.[k.replace(/~1/g,'/').replace(/~0/g,'~')];return pretty(x)}
if(id==='json-array-sorter'){const a=json(v),k=opts.key||'name';return pretty(a.slice().sort((x:any,y:any)=>String(x[k]).localeCompare(String(y[k]),undefined,{numeric:true})))}
if(id==='json-key-remover'||id==='json-key-renamer'){const keys=(opts.keys||secondary).split(/[ ,\s]+/);const walk=(x:any):any=>Array.isArray(x)?x.map(walk):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>id!=='json-key-remover'||!keys.includes(k)).map(([k,y])=>[id==='json-key-renamer'&&k===(opts.from||'oldKey')?(opts.to||'newKey'):k,walk(y)])):x;return pretty(walk(json(v)))}
if(id==='json-flatten'){const o:any={};const f=(x:any,p='')=>x&&typeof x==='object'?Object.entries(x).forEach(([k,y])=>f(y,p?p+'.'+k:k)):o[p]=x;f(json(v));return pretty(o)}
if(id==='json-unflatten'){const o:any={};for(const [p,x] of Object.entries(json(v))){let c=o;const a=p.split('.');a.forEach((k,i)=>{if(i===a.length-1)c[k]=x;else c=c[k]??={}})}return pretty(o)}
if(id==='json-sample-generator')return pretty({id:1,name:'Example',active:true,createdAt:'2026-01-01T00:00:00Z',metadata:{source:'sample'}});
if(id==='json-value-search'){const q=(opts.query||secondary).toLowerCase(),hits:string[]=[];const f=(x:any,p='$')=>{if(String(x).toLowerCase().includes(q))hits.push(p+': '+JSON.stringify(x));if(x&&typeof x==='object')Object.entries(x).forEach(([k,y])=>f(y,p+'.'+k))};f(json(v));return hits.join('\n')||'No matches.'}
if(id==='json-key-picker'){const o=json(v);return (opts.keys||secondary||Object.keys(o).join(',')).split(/[ ,\s]+/).map(k=>k+': '+JSON.stringify(o[k])).join('\n')}
if(id==='json-array-chunker'){const a=json(v),n=Math.max(1,Number(opts.size)||10);return pretty(Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,(i+1)*n)))}
if(id==='json-type-inspector'){const out:string[]=[];const f=(x:any,p='$')=>{out.push(p+': '+(x===null?'null':Array.isArray(x)?'array':typeof x));if(x&&typeof x==='object')Object.entries(x).forEach(([k,y])=>f(y,p+'.'+k))};f(json(v));return out.join('\n')}
if(['base64','url-encoder','html-entities','hex-converter'].includes(id)){if(id==='base64')return mode==='decode'?dec(v):enc(v);if(id==='url-encoder')return mode==='decode'?decodeURIComponent(v):encodeURIComponent(v);if(id==='html-entities')return mode==='decode'?v.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&'):esc(v);return mode==='decode'?(v.replace(/\s/g,'').match(/.{1,2}/g)||[]).map(x=>String.fromCharCode(parseInt(x,16))).join(''):Array.from(new TextEncoder().encode(v)).map(x=>x.toString(16).padStart(2,'0')).join(' ')}
if(id==='binary-to-text')return (v.match(/[01]{8}/g)||[]).map(x=>String.fromCharCode(parseInt(x,2))).join('');
if(id==='text-to-binary')return Array.from(new TextEncoder().encode(v)).map(x=>x.toString(2).padStart(8,'0')).join(' ');
if(id==='octal-converter')return mode==='decode'?String(parseInt(v,8)):Number(v).toString(8);
if(id==='decimal-to-hex')return Number(v).toString(16).toUpperCase();
if(id==='hex-to-decimal')return String(parseInt(v.replace(/^0x/i,''),16));
if(id==='rot13-converter')return v.replace(/[a-z]/gi,c=>String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<'n'?13:-13)));
if(id==='morse-code-converter'){const a=['.-','-...','-.-.','-..','.','..-.','--.','....','..','.---','-.-','.-..','--','-.','---','.--.','--.-','.-.','...','-','..-','...-','.--','-..-','-.--','--..'];const m:Record<string,string>={};'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c,i)=>m[c]=a[i]);return mode==='decode'?v.split(' ').map(x=>Object.keys(m).find(k=>m[k]===x)||'').join(''):v.toLowerCase().split('').map(c=>c===' '?' / ':m[c]||'').join(' ')}
if(['jwt-decoder','jwt-claims-inspector','jwt-expiry-checker'].includes(id)){const p=v.split('.');if(p.length<2)throw Error('Enter JWT header.payload.signature.');const b=(s:string)=>JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')))));const h=b(p[0]),x=b(p[1]);if(id==='jwt-expiry-checker')return x.exp?new Date(x.exp*1000).toISOString()+(x.exp*1000>Date.now()?' (valid time)':' (expired)'):'No exp claim.';return pretty({header:h,payload:x,signaturePresent:!!p[2],note:'Decoded only; signature not verified.'})}
if(id==='hash-generator'||id==='hmac-sha-256'){const alg=(opts.algorithm||'SHA-256').toUpperCase();let data:ArrayBuffer;if(id==='hmac-sha-256'){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(opts.secret||secondary),{name:'HMAC',hash:'SHA-256'},false,['sign']);data=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(v))}else data=await crypto.subtle.digest(alg,new TextEncoder().encode(v));return [...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,'0')).join('')}
if(id==='uuid-generator'||id==='uuid-v7-generator')return Array.from({length:Math.min(100,Math.max(1,Number(opts.count)||1))},()=>crypto.randomUUID()).join('\n');
if(id==='uuid-validator')return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim())?'Valid UUID.':'Invalid UUID.';
if(['random-token-generator','random-hex-generator','nano-id-generator','password'].includes(id)){const n=Math.min(256,Math.max(8,Number(opts.length)||32)),b=crypto.getRandomValues(new Uint8Array(n));return id==='random-hex-generator'?[...b].map(x=>x.toString(16).padStart(2,'0')).join(''):id==='nano-id-generator'?Array.from({length:Math.min(100,Number(opts.count)||1)},()=>Array.from(crypto.getRandomValues(new Uint8Array(21)),x=>'_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[x%64]).join('')).join('\n'):[...b].map(x=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'[x%64]).join('')}
if(id==='base32-reference')return 'RFC 4648 Base32 alphabet: ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
if(id==='base58-encoder')return 'Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
if(id==='unicode-escape-converter')return mode==='decode'?v.replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))):Array.from(v).map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('');
if(id==='percent-encoding-inspector')return [...v].map((c,i)=>i+': '+c+' → '+encodeURIComponent(c)).join('\n');
if(id==='text-diff'){const a=lines(v),b=lines(secondary);return Array.from({length:Math.max(a.length,b.length)},(_,i)=>a[i]===b[i]?'':`Line ${i+1}\n- ${a[i]??'(missing)'}\n+ ${b[i]??'(missing)'}`).filter(Boolean).join('\n\n')||'No differences found.'}
if(id==='case-converter'){const p=words(v.replace(/([a-z])([A-Z])/g,'$1 $2')),m=opts.mode||'camelCase';return m==='PascalCase'?p.map(x=>x[0].toUpperCase()+x.slice(1).toLowerCase()).join(''):m==='snake_case'?slug(v).replace(/-/g,'_'):m==='kebab-case'?slug(v):m==='UPPER_CASE'?slug(v).replace(/-/g,'_').toUpperCase():p.map((x,i)=>i?x[0].toUpperCase()+x.slice(1).toLowerCase():x.toLowerCase()).join('')}
if(id==='regex-tester'){const r=new RegExp(secondary||opts.pattern||'.',opts.flags||'g');return [...v.matchAll(r)].map(x=>x[0]+' @ '+x.index).join('\n')||'No matches.'}
if(['slug-generator','text-to-slug-batch'].includes(id))return lines(v).map(slug).join('\n');
if(id==='word-counter')return `Words: ${words(v).length}\nCharacters: ${v.length}\nCharacters without spaces: ${v.replace(/\s/g,'').length}\nLines: ${v?lines(v).length:0}`;
if(id==='line-counter')return `Lines: ${v?lines(v).length:0}\nNon-empty: ${lines(v).filter(x=>x.trim()).length}`;
if(id==='duplicate-line-finder')return [...new Set(lines(v).filter((x,i,a)=>a.indexOf(x)!==i))].join('\n')||'No duplicates.';
if(id==='line-deduplicator')return [...new Set(lines(v))].join('\n');
if(id==='line-sorter')return lines(v).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join('\n');
if(id==='line-reverser')return lines(v).reverse().join('\n');
if(id==='text-trimmer')return lines(v).map(x=>x.trim()).join('\n');
if(id==='whitespace-visualizer')return v.replace(/ /g,'·').replace(/\t/g,'→   ').replace(/\n/g,'↵\n');
if(id==='text-repeater')return v.repeat(Math.min(1000,Math.max(1,Number(opts.count)||3)));
if(id==='text-joiner')return lines(v).join(opts.separator||', ');
if(id==='text-splitter'){const n=Math.max(1,Number(opts.size)||100);return v.match(new RegExp('.{1,'+n+'}','gs'))?.join('\n')||''}
if(id==='sentence-counter')return 'Sentences: '+(v.match(/[.!?]+(?:\s|$)/g)||[]).length;
if(id==='paragraph-counter')return 'Paragraphs: '+(v.trim()?v.trim().split(/\n\s*\n/).length:0);
if(id==='text-frequency-analyzer'){const f:Record<string,number>={};words(v.toLowerCase()).forEach(w=>f[w]=(f[w]||0)+1);return Object.entries(f).sort((a,b)=>b[1]-a[1]).map(([k,n])=>k+': '+n).join('\n')}
if(id==='email-extractor')return [...new Set(v.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[])].join('\n');
if(id==='email-validator')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())?'Valid email.':'Invalid email.';
if(id==='url-extractor')return [...new Set(v.match(/https?:\/\/[^\s<>"']+/gi)||[])].join('\n');
if(id==='ip-extractor')return [...new Set(v.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)||[])].filter(x=>{try{ipN(x);return true}catch{return false}}).join('\n');
if(id==='phone-number-cleaner')return v.replace(/[^\d+]/g,'');
if(id==='html-tag-stripper')return v.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ');
if(id==='unicode-inspector')return Array.from(v).map(c=>c+' U+'+c.codePointAt(0)!.toString(16).toUpperCase()).join('\n');
if(['sql-insert','json-to-postgresql','json-to-mysql'].includes(id)){const a=json(v);if(!Array.isArray(a)||!a.length)throw Error('Provide a non-empty JSON array.');const h=[...new Set(a.flatMap((x:any)=>Object.keys(x)))],q=id==='json-to-mysql'?'`':'"';return `INSERT INTO ${opts.table||'your_table'} (${h.map(k=>q+k+q).join(', ')}) VALUES\n${a.map((x:any)=>'('+h.map(k=>qsql(x[k])).join(', ')+')').join(',\n')};`}
if(id==='sql-formatter'||id==='graphql-formatter')return v.replace(/\s+/g,' ').replace(/\s*,\s*/g,',\n  ').replace(/\b(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|VALUES|SET|UNION)\b/gi,'\n$1').trim();
if(id==='sql-query-minifier')return v.replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim();
if(id==='sql-in-list-builder')return 'IN ('+lines(v).filter(x=>x.trim()).map(qsql).join(', ')+')';
if(id==='sql-column-list-builder')return lines(v).filter(x=>x.trim()).join(', ');
if(id==='sql-create-table-builder'){const a=json(v);return `CREATE TABLE ${opts.table||'your_table'} (\n${Object.entries(a[0]||{}).map(([k,x])=>'  '+k+' '+(typeof x==='number'?'INTEGER':typeof x==='boolean'?'BOOLEAN':'TEXT')).join(',\n')}\n);`}
if(id==='sql-to-json'){const a=csv(v,'\t');return pretty(a.slice(1).map(r=>Object.fromEntries(a[0].map((k,i)=>[k,r[i]??'']))))}
if(id==='sql-identifier-quoter')return v.split(',').map(x=>(opts.dialect==='mysql'?'`'+x.trim()+'`':'"'+x.trim().replace(/"/g,'""')+'"')).join(', ');
if(id==='sql-literal-escaper')return "'"+v.replace(/'/g,"''")+"'";
if(id==='sql-table-name-validator')return /^[A-Za-z_][\w$]*$/.test(v.trim())?'Valid identifier.':'Invalid identifier.';
if(id==='sql-explain-guide')return 'EXPLAIN displays the query plan. PostgreSQL EXPLAIN (ANALYZE, BUFFERS) includes actual execution metrics and executes the query.';
if(['postgresql-url-parser','mysql-url-parser','mongodb-uri-parser','redis-url-parser','database-url-masker'].includes(id)){const u=new URL(v);if(id==='database-url-masker'){u.password='REDACTED';return u.toString()}return pretty({protocol:u.protocol,hostname:u.hostname,port:u.port,username:u.username,password:u.password?'[present]':'',database:u.pathname.slice(1),query:Object.fromEntries(u.searchParams)})}
if(id==='http-method-lookup')return ({GET:'Read; safe and idempotent.',POST:'Submit/create; not generally idempotent.',PUT:'Replace; idempotent.',PATCH:'Partial update.',DELETE:'Delete; intended to be idempotent.',HEAD:'GET without response body.',OPTIONS:'Describe supported communication options.'} as Record<string,string>)[v.toUpperCase()]||'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS';
if(id==='http-status'||id==='status-code-reference')return v.trim()+' '+(statuses[v.trim()]||'Unknown status code');
if(id==='mime-type-lookup'){const ext=v.trim().toLowerCase().replace(/^\./,'');return mime[ext]||'Unknown MIME type.'}
if(id==='content-type-builder')return 'Content-Type: '+(v.trim()||'application/json');
if(id==='header-parser'){const o:any={};lines(v).forEach(l=>{const i=l.indexOf(':');if(i>0)o[l.slice(0,i).trim().toLowerCase()]=l.slice(i+1).trim()});return pretty(o)}
if(id==='query-string-parser'||id==='url-query-editor'){const u=new URL(v.includes('://')?v:'https://local/?'+v.replace(/^\?/,'').replace(/^.*\?/,'') );return pretty(Object.fromEntries(u.searchParams))}
if(id==='query-string-builder')return '?'+new URLSearchParams(Object.fromEntries(csv(v).map(r=>[r[0],r[1]||'']))).toString();
if(id==='http-basic-auth-builder')return 'Authorization: Basic '+enc(v);
if(id==='bearer-header-builder')return 'Authorization: Bearer '+v.trim();
if(id==='http-authorization-redactor')return v.replace(/(authorization\s*:\s*).+/gi,'$1[REDACTED]');
if(id==='http-accept-header-builder')return 'Accept: '+v.split(',').map(x=>x.trim()).join(', ');
if(id==='http-cache-header-helper')return 'Cache-Control: '+(v.trim()||'no-store');
if(id==='cors-header-guide')return `Access-Control-Allow-Origin: ${opts.origin||'*'}\nAccess-Control-Allow-Methods: ${opts.methods||'GET, POST, PUT, DELETE, OPTIONS'}\nAccess-Control-Allow-Headers: ${opts.headers||'Content-Type, Authorization'}`;
if(id==='graphql-variables-validator')return pretty(json(v));
if(id==='http-date-converter')return new Date(v).toUTCString();
if(id==='curl-builder'){const o=json(v||'{}');return `curl -X ${o.method||'GET'} '${o.url||'https://api.example.com'}'`+(o.headers?Object.entries(o.headers).map(([k,x])=>` -H '${k}: ${x}'`).join(''):'')+(o.body?` -d '${JSON.stringify(o.body)}'`:'')}
if(id==='chmod'){const n=/^[rwx-]{9}$/.test(v.trim())?v.trim().match(/.{3}/g)!.map(g=>g.split('').reduce((s,c)=>s+(c==='r'?4:c==='w'?2:c==='x'?1:0),0)).join(''):Number(v).toString(8);return 'chmod '+n+' your-file'}
if(id==='cron-builder')return 'Cron: '+v+'\nFields: minute hour day-of-month month day-of-week\nExample: 0 9 * * 1-5 = weekdays at 09:00';
if(id==='env-formatter')return lines(v).filter(x=>x.trim()&&!x.trim().startsWith('#')).map(x=>{const i=x.indexOf('=');return i<0?x.trim():x.slice(0,i).trim()+'='+x.slice(i+1).trim()}).sort().join('\n');
if(id==='docker-run')return 'docker run --rm '+(opts.name?'--name '+opts.name+' ':'')+(opts.ports?'-p '+opts.ports+' ':'')+v.trim();
if(id==='dockerfile-starter')return `FROM ${v||'node:22-alpine'}\nWORKDIR /app\nCOPY . .\nRUN npm ci\nEXPOSE 3000\nCMD ["npm","start"]`;
if(id==='docker-compose-starter')return `services:\n  app:\n    image: ${v||'nginx:latest'}\n    ports: ["8080:80"]\n    restart: unless-stopped`;
if(id==='docker-tag-builder')return 'docker tag '+(opts.source||'local:latest')+' '+v;
if(id==='docker-port-mapper')return '-p '+(v||'8080:80');
if(id==='kubernetes-deployment-starter')return `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${v||'app'}\nspec:\n  replicas: 2\n  selector:\n    matchLabels: {app: ${v||'app'}}\n  template:\n    metadata:\n      labels: {app: ${v||'app'}}\n    spec:\n      containers:\n        - name: app\n          image: nginx:latest`;
if(id==='kubernetes-service-starter')return `apiVersion: v1\nkind: Service\nmetadata:\n  name: ${v||'app'}\nspec:\n  selector: {app: ${v||'app'}}\n  ports: [{port: 80, targetPort: 80}]`;
if(id==='kubernetes-configmap-builder')return 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: app-config\ndata:\n'+lines(v).filter(x=>x.includes('=')).map(x=>'  '+x.replace(/=(.*)/,'="$1"')).join('\n');
if(id==='kubernetes-label-builder')return v.split(',').map(x=>{const [k,y]=x.split('=');return k.trim()+': '+(y||'true')}).join('\n');
if(id==='terraform-variable-builder')return `variable "${v||'name'}" {\n  type = string\n  default = ""\n}`;
if(id==='terraform-output-builder')return `output "${v||'resource_id'}" {\n  value = var.${v||'resource_id'}\n}`;
if(id==='terraform-resource-address-parser')return v.split('.').map((x,i)=>(i+1)+'. '+x).join('\n');
if(id==='aws-arn-parser'){const a=v.split(':');if(a.length<6||a[0]!=='arn')throw Error('Expected arn:partition:service:region:account:resource');return pretty({partition:a[1],service:a[2],region:a[3],accountId:a[4],resource:a.slice(5).join(':')})}
if(id==='aws-s3-uri-parser'||id==='aws-s3-key-url-encoder'){const s=v.replace(/^s3:\/\//,''),i=s.indexOf('/'),bucket=i<0?s:s.slice(0,i),key=i<0?'':s.slice(i+1);return id==='aws-s3-uri-parser'?pretty({bucket,key,uri:'s3://'+bucket+'/'+key}):'https://'+bucket+'.s3.amazonaws.com/'+key.split('/').map(encodeURIComponent).join('/')}
if(id==='iam-policy-json-formatter')return pretty(json(v));
if(id==='systemd-unit-starter')return `[Unit]\nDescription=${v||'Example service'}\nAfter=network.target\n\n[Service]\nType=simple\nExecStart=/usr/bin/app\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target`;
if(id==='environment-variable-diff'){const f=(s:string)=>Object.fromEntries(lines(s).filter(x=>x.includes('=')).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));const a=f(v),b=f(secondary);return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>a[k]!==b[k]).map(k=>k+': '+a[k]+' → '+b[k]).join('\n')||'No differences.'}
if(id==='ipv4-validator'||id==='ipv4-private-range-checker'){const n=ipN(v),a=n>>>24,b=n>>>16&255;return id==='ipv4-validator'?'Valid IPv4 address.':a===10||a===127||a===192&&b===168||a===172&&b>=16&&b<=31||a===169&&b===254?'Private/special-use IPv4.':'Public IPv4.'}
if(id==='ipv4-to-integer')return String(ipN(v));
if(id==='integer-to-ipv4')return ipS(Number(v)>>>0);
if(['cidr-calculator','subnet-range-finder','ipv4-cidr-to-netmask','ipv4-broadcast-calculator'].includes(id)){const [ip,p0]=v.split('/'),p=Number(p0),n=ipN(ip);if(!Number.isInteger(p)||p<0||p>32)throw Error('Enter CIDR such as 192.168.1.0/24');const mask=p===0?0:(0xffffffff<<(32-p))>>>0,net=(n&mask)>>>0,bc=(net|(~mask>>>0))>>>0;return `Network: ${ipS(net)}/${p}\nNetmask: ${ipS(mask)}\nWildcard: ${ipS(~mask>>>0)}\nBroadcast: ${ipS(bc)}\nTotal addresses: ${2**(32-p)}\nUsable hosts: ${p>=31?2:Math.max(0,2**(32-p)-2)}`}
if(id==='wildcard-mask-converter'){const p=Number(v.split('/')[1]);if(p<0||p>32)throw Error('Enter CIDR with prefix.');return ipS(~(p===0?0:(0xffffffff<<(32-p))>>>0)>>>0)}
if(id==='ipv6-validator')return /^[0-9a-f:]{2,39}$/i.test(v)&&v.includes(':')?'IPv6 format looks valid.':'Invalid IPv6 format.';
if(id==='mac-address-formatter'){const s=v.replace(/[^a-f0-9]/gi,'').toLowerCase();if(s.length!==12)throw Error('Enter 12 hex digits.');return s.match(/.{2}/g)!.join(':')}
if(id==='port-number-reference'||id==='tcp-port-range-checker'){const [a,b]=v.split('-').map(Number);return Number.isInteger(a)&&a>=0&&a<=65535&&(id!=='tcp-port-range-checker'||Number.isInteger(b)&&b>=a&&b<=65535)?'Valid port number/range.':'Invalid port number/range.'}
if(id==='dns-record-reference')return 'A: IPv4\nAAAA: IPv6\nCNAME: Alias\nMX: Mail exchanger\nTXT: Text/SPF/DKIM\nNS: Name server\nSRV: Service record\nCAA: Certificate authority authorization';
if(id==='url-parser'||id==='url-hostname-inspector'){const u=new URL(v);return pretty({protocol:u.protocol,hostname:u.hostname,port:u.port,pathname:u.pathname,search:u.search,hash:u.hash,origin:u.origin})}
if(id==='domain-name-extractor')return [...new Set(v.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi)||[])].join('\n');
if(['color-converter','hex-to-rgb','rgb-to-hex','color-contrast-calculator'].includes(id)){const m=v.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);let r:number,g:number,b:number;if(m){const h=m[1].length===3?m[1].split('').map(x=>x+x).join(''):m[1];r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16)}else{const x=v.match(/(\d+)\D+(\d+)\D+(\d+)/);if(!x)throw Error('Enter HEX or RGB.');r=+x[1];g=+x[2];b=+x[3]}const h='#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');const L=(x:number)=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4};const lum=.2126*L(r)+.7152*L(g)+.0722*L(b);return id==='rgb-to-hex'?h:id==='color-contrast-calculator'?`Contrast white: ${(1.05/(lum+.05)).toFixed(2)}:1\nContrast black: ${((lum+.05)/.05).toFixed(2)}:1`:`HEX: ${h}\nRGB: rgb(${r}, ${g}, ${b})`}
if(id==='css-gradient')return 'background: linear-gradient(135deg, '+(v||'#6366f1, #06b6d4')+');';
if(id==='css-minifier')return v.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s*([{}:;,])\s*/g,'$1').replace(/;}/g,'}');
if(id==='css-box-shadow-builder')return `box-shadow: ${opts.x||0}px ${opts.y||4}px ${opts.blur||12}px ${opts.spread||0}px ${opts.color||'rgba(0,0,0,.15)'};`;
if(id==='css-border-radius-builder')return 'border-radius: '+(v||'8px')+';';
if(id==='css-flexbox-playground')return `.container {\n display: flex;\n flex-direction: ${opts.direction||'row'};\n justify-content: ${opts.justify||'center'};\n align-items: ${opts.align||'center'};\n gap: ${opts.gap||'1rem'};\n}`;
if(id==='css-grid-builder')return `.container { display: grid; grid-template-columns: ${v||'repeat(3, 1fr)'}; gap: ${opts.gap||'1rem'}; }`;
if(id==='css-unit-converter'){const m=v.match(/(-?\d+(?:\.\d+)?)\s*(px|rem|em|pt)/i);if(!m)throw Error('Enter a value like 16px.');const n=+m[1],u=m[2];return `Pixels: ${u==='px'?n:u==='pt'?n*96/72:n*16}\nREM: ${u==='rem'||u==='em'?n:u==='px'?n/16:n*96/72/16}`}
if(id==='svg-data-uri-encoder')return 'data:image/svg+xml,'+encodeURIComponent(v);
if(id==='html-formatter')return v.replace(/>\s*</g,'>\n<').trim();
if(id==='markdown-preview'||id==='github-markdown-preview')return v;
if(id==='html-meta-tag-builder')return `<title>${esc(opts.title||'Page title')}</title>\n<meta name="description" content="${esc(v)}">`;
if(id==='open-graph-tag-builder')return `<meta property="og:title" content="${esc(opts.title||'Page title')}">\n<meta property="og:description" content="${esc(v)}">`;
if(id==='favicon-html-builder')return '<link rel="icon" href="'+(v||'/favicon.ico')+'">';
if(id==='css-specificity-calculator'){const a=(v.match(/#[\w-]+/g)||[]).length,b=(v.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g)||[]).length,c=(v.match(/(^|[\s>+~])([a-z][\w-]*)/gi)||[]).length;return `Specificity: ${a},${b},${c}`}
if(id==='css-clamp-builder')return `clamp(${opts.min||'1rem'}, ${opts.preferred||'2vw'}, ${opts.max||'3rem'})`;
if(id==='css-transform-builder')return 'transform: '+(v||'translateX(0)')+';';
if(id==='css-animation-builder')return `@keyframes fadeIn { from {opacity:0} to {opacity:1} }\n.element { animation: fadeIn ${opts.duration||'300ms'} ease both; }`;
if(id==='html-input-builder')return `<label>${esc(opts.label||'Label')}</label>\n<input type="${opts.type||'text'}" name="${opts.name||'field'}" placeholder="${esc(v)}">`;
if(id==='meta-description-counter')return `Characters: ${v.length}\n${v.length<=160?'Within 160 characters.':'Over 160 characters.'}`;
if(id==='password-strength-estimator'){const s=(v.length>=12?1:0)+(v.length>=16?1:0)+(/[a-z]/.test(v)&&/[A-Z]/.test(v)?1:0)+(/\d/.test(v)?1:0)+(/[^A-Za-z0-9]/.test(v)?1:0);return ['Very weak','Weak','Fair','Good','Strong','Very strong'][s]+' (estimated)'}
if(id==='passphrase-generator'){const bank='amber bridge cactus drift ember forest galaxy harbor island jungle kernel lantern meadow nebula ocean planet quartz rocket sunset timber'.split(' ');return Array.from({length:Math.min(20,Number(opts.count)||1)},()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),x=>bank[x%bank.length]).join('-')).join('\n')}
if(id==='credential-pattern-scanner'){const a=[/AKIA[0-9A-Z]{16}/g,/-----BEGIN [A-Z ]*PRIVATE KEY-----/g,/gh[pousr]_[A-Za-z0-9]{20,}/g,/password\s*[:=]\s*\S+/gi];return a.flatMap(r=>[...v.matchAll(r)].map(m=>'Potential secret: '+m[0].slice(0,8)+'…')).join('\n')||'No common credential patterns found.'}
if(id==='secret-redactor')return v.replace(/(password|token|secret|api[_-]?key|authorization)(\s*[:=]\s*)([^\s,;]+)/gi,'$1$2[REDACTED]');
if(id==='csp-header-builder')return 'Content-Security-Policy: '+(v||"default-src 'self'; object-src 'none'; base-uri 'self'");
if(id==='security-headers-reference')return 'Strict-Transport-Security: max-age=31536000; includeSubDomains\nX-Content-Type-Options: nosniff\nReferrer-Policy: strict-origin-when-cross-origin\nContent-Security-Policy: default-src self';
if(id==='tls-version-reference')return 'Recommended: TLS 1.3; minimum TLS 1.2. Avoid SSLv2, SSLv3, TLS 1.0 and TLS 1.1.';
if(id==='sha-256-file-checksum-guide')return 'For files, read the File as an ArrayBuffer and pass it to crypto.subtle.digest("SHA-256", buffer). This text-only tool does not upload or read local files.';
if(['timestamp','date-to-unix-timestamp','unix-milliseconds-converter','iso-date-converter','rfc-3339-formatter'].includes(id)){const n=Number(v),d=/^\d+(\.\d+)?$/.test(v.trim())?new Date(id==='unix-milliseconds-converter'?n:n*1000):new Date(v);if(isNaN(d.getTime()))throw Error('Enter a valid date or timestamp.');return id==='date-to-unix-timestamp'?String(Math.floor(d.getTime()/1000)):id==='unix-milliseconds-converter'?`Milliseconds: ${d.getTime()}\nSeconds: ${Math.floor(d.getTime()/1000)}`:id==='iso-date-converter'||id==='rfc-3339-formatter'?d.toISOString():`UTC: ${d.toISOString()}\nLocal: ${d.toString()}`}
if(id==='current-utc-time')return new Date().toISOString();
if(id==='timezone-offset-helper'){const d=new Date(v||Date.now());return `UTC: ${d.toISOString()}\nTimezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\nOffset: ${d.getTimezoneOffset()} minutes`}
if(id==='time-duration-calculator'||id==='business-days-between-dates'){const [a,b]=v.split(/,|\n| to /),d1=new Date(a),d2=new Date(b||secondary);if(isNaN(d1.getTime())||isNaN(d2.getTime()))throw Error('Enter two dates separated by comma or newline.');if(id==='business-days-between-dates'){let n=0;for(const d=new Date(d1);d<=d2;d.setDate(d.getDate()+1))if(d.getDay()%6)n++;return 'Business days: '+n}return 'Duration milliseconds: '+Math.abs(d2.getTime()-d1.getTime())}
if(id==='duration-to-seconds'){const m=v.match(/(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i);return String((+m?.[1]||0)*86400+(+m?.[2]||0)*3600+(+m?.[3]||0)*60+(+m?.[4]||0))}
if(id==='seconds-to-duration'){let n=Math.max(0,Number(v)),d=Math.floor(n/86400);n%=86400;const h=Math.floor(n/3600);n%=3600;return `${d}d ${h}h ${Math.floor(n/60)}m ${Math.floor(n%60)}s`}
if(id==='week-number-calculator'||id==='date-to-iso-week'){const d=new Date(v),x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));return 'ISO week: '+Math.ceil((((x.getTime()-Date.UTC(x.getUTCFullYear(),0,1))/86400000)+1)/7)+'\nISO year: '+x.getUTCFullYear()}
if(id==='leap-year-checker'){const y=Number(v);return y%4===0&&(y%100!==0||y%400===0)?y+' is a leap year.':y+' is not a leap year.'}
if(id==='gitignore-generator'){const m:Record<string,string[]>={node:['node_modules/','.env','dist/'],python:['__pycache__/','*.py[cod]','.venv/'],java:['*.class','target/'],macos:['.DS_Store'],windows:['Thumbs.db'],terraform:['.terraform/','*.tfstate*'],vscode:['.vscode/']};return ['# Generated by DevKit',...v.split(/[ ,\s]+/).flatMap(x=>m[x.toLowerCase()]||[])].join('\n')}
if(id==='git-branch-name-helper')return (opts.type||'feature')+'/'+slug(v);
if(id==='conventional-commit-builder')return (opts.type||'feat')+(opts.scope?'('+opts.scope+')':'')+': '+v.trim();
if(id==='semantic-version-helper'){const m=v.match(/(\d+)\.(\d+)\.(\d+)/);if(!m)throw Error('Enter version like 1.2.3');const a=+m[1],b=+m[2],c=+m[3];return `Patch: ${a}.${b}.${c+1}\nMinor: ${a}.${b+1}.0\nMajor: ${a+1}.0.0`}
if(id==='changelog-starter')return `# Changelog\n\n## [Unreleased]\n### Added\n- ${v||'Describe changes'}\n\n### Changed\n\n### Fixed`;
if(id==='github-readme-starter')return `# ${v||'Project'}\n\nProject description.\n\n## Installation\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n## Contributing\n\n## License`;
if(id==='github-actions-starter')return 'name: CI\non: [push, pull_request]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: {node-version: 22}\n      - run: npm ci\n      - run: npm test';
if(['git-remote-url-converter','git-remote-ssh-to-https','git-remote-https-to-ssh'].includes(id)){const m=v.match(/(?:https:\/\/github\.com\/|git@github\.com:)([^/]+\/[^/.]+)/);if(!m)throw Error('Enter a GitHub HTTPS or SSH remote.');return id==='git-remote-https-to-ssh'||id==='git-remote-url-converter'&&v.startsWith('https')?'git@github.com:'+m[1]+'.git':'https://github.com/'+m[1]+'.git'}
if(id==='github-markdown-preview')return v;
if(id==='git-command-cheat-sheet')return 'git status\ngit add .\ngit commit -m "feat: describe change"\ngit pull --rebase origin main\ngit push -u origin HEAD\ngit log --oneline --graph --decorate';
if(id==='github-issue-template')return `## Description\n${v||'Describe the issue'}\n\n## Steps to reproduce\n1.\n\n## Expected behavior\n\n## Actual behavior`;
if(id==='pull-request-template')return `## Summary\n${v||'Describe change'}\n\n## Changes\n-\n\n## Testing\n- [ ] Tests pass`;
if(id==='git-tag-formatter')return 'v'+v.trim().replace(/^v/,'');
if(id==='lorem')return Array.from({length:Math.min(20,Math.max(1,Number(opts.count)||3))},()=>'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.').join('\n\n');
if(id==='log-level-filter')return lines(v).filter(x=>new RegExp(opts.level||'ERROR|WARN|FATAL','i').test(x)).join('\n');
if(id==='port-number-reference')return v+': '+(({22:'SSH',53:'DNS',80:'HTTP',443:'HTTPS',3306:'MySQL',5432:'PostgreSQL',6379:'Redis',27017:'MongoDB'} as Record<number,string>)[Number(v)]||'Port reference');
throw Error('No implementation exists for this tool yet.');
}