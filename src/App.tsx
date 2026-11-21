import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Command, Grid2X2, Braces, Binary, FileText, Database, Globe, Cloud, Network,
  Palette, ShieldCheck, Clock, GitBranch, Star, ChevronRight, Copy, Check, RotateCcw, Menu, X,
  Zap, Lock, Github, ArrowUpRight, PanelLeftClose, Terminal, Code2, Sparkles, SlidersHorizontal
} from 'lucide-react'
import { categories, tools } from './tools'
import { runTool } from './engine'

const iconMap:any={Grid2X2,Braces,Binary,FileText,Database,Globe,Cloud,Network,Palette,ShieldCheck,Clock,GitBranch}
const secondarySamples:Record<string,string>={'json-diff':'{"name":"DevKit","version":2}','text-diff':'The quick brown fox\njumps over the lazy dog!','regex-tester':'[A-Z][a-z]+'};
const samples:Record<string,string>={
  'json-formatter':'{"name":"DevKit","version":1,"features":["format","validate"],"active":true}',
  'json-minifier':'{\n  "name": "DevKit",\n  "active": true\n}',
  'json-validator':'{"valid": true, "count": 42}',
  'json-to-yaml':'{"app":"DevKit","version":1,"enabled":true}',
  'yaml-to-json':'app: DevKit\nversion: 1\nenabled: true',
  'json-diff':'{"name":"DevKit","version":1}',
  'csv-to-json':'name,role,active\nAva,Engineer,true\nNoah,Designer,false',
  'base64':'Hello, developer!',
  'url-encoder':'https://devkit.tools/search?q=hello world',
  'html-entities':'<h1>Hello & welcome</h1>',
  'hex-converter':'DevKit',
  'hash-generator':'Hello, DevKit!',
  'jwt-decoder':'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldktpdCIsImlhdCI6MTUxNjIzOTAyMn0.',
  'text-diff':'The quick brown fox\njumps over the lazy dog.',
  'case-converter':'resource prefix name',
  'regex-tester':'Contact us at hello@example.com or support@example.org',
  'slug-generator':'My Awesome Developer Toolkit',
  'sql-formatter':'SELECT id, name, email FROM users WHERE active = true ORDER BY created_at DESC LIMIT 10;',
  'sql-insert':'[{"id":1,"name":"Ava"},{"id":2,"name":"Noah"}]',
  'cron-builder':'0 9 * * 1-5',
  'env-formatter':'PORT=3000\nDATABASE_URL=postgres://localhost/app\nNODE_ENV=development',
  'docker-run':'nginx:latest',
  'cidr-calculator':'192.168.1.0/24',
  'timestamp':'1735689600',
  'color-converter':'#6366f1',
  'css-gradient':'',
  'html-formatter':'<main><h1>DevKit</h1><p>Build faster.</p></main>',
  'markdown-preview':'# Hello DevKit\n\nA **fast** toolkit for developers.',
  'http-status':'404',
  'curl-builder':'{"query":"devkit"}',
  'header-parser':'Content-Type: application/json\nCache-Control: no-cache\nX-Request-Id: abc123',
  'chmod':'rwxr-xr-x',
  'lorem':'',
  'password':'',
  'json-schema':'{"id":1,"name":"Ava","active":true}',
  'json-pointer-tester':'{"user":{"name":"Ava"}}'
}

function App(){
  const [activeCategory,setActiveCategory]=useState('All tools')
  const initialTool = window.location.pathname.match(/\/tools\/([^/]+)/)?.[1]
  const [activeTool,setActiveTool]=useState(tools.some(t=>t.id===initialTool)?initialTool!:'json-formatter')
  const [query,setQuery]=useState('')
  const [input,setInput]=useState(samples[initialTool??'json-formatter']??'')
  const [secondary,setSecondary]=useState(secondarySamples[initialTool??'']??'')
  const [output,setOutput]=useState('')
  const [error,setError]=useState('')
  const [copied,setCopied]=useState(false)
  const [sidebarOpen,setSidebarOpen]=useState(true)
  const [mobileNav,setMobileNav]=useState(false)
  const [mode,setMode]=useState('encode')
  const [options,setOptions]=useState<Record<string,string>>({})
  const [running,setRunning]=useState(false)
  const executionId=useRef(0)
  useEffect(()=>()=>{executionId.current++},[])
  useEffect(()=>{executionId.current++;setRunning(false)},[activeTool,input,secondary,mode,options])
  useEffect(()=>{const handle=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();document.querySelector<HTMLInputElement>('[aria-label="Search tools and categories"]')?.focus()}};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)},[])
  useEffect(()=>{
    const onPop=()=>{
      const slug=window.location.pathname.match(/\/tools\/([^/]+)/)?.[1]
      const next=slug&&tools.some(t=>t.id===slug)?slug:tools[0].id
      executionId.current++;setRunning(false);setActiveTool(next);setInput(samples[next]??'');setSecondary(secondarySamples[next]??'');setOutput('');setError('');setOptions({});setMode('encode')
    }
    window.addEventListener('popstate',onPop)
    return ()=>window.removeEventListener('popstate',onPop)
  },[])
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault(); document.querySelector<HTMLInputElement>('.top-search input')?.focus()
      }
      if(event.key==='Escape'){setQuery('');(document.activeElement as HTMLElement)?.blur()}
    }
    window.addEventListener('keydown',onKey)
    return ()=>window.removeEventListener('keydown',onKey)
  },[])
  const [favorites,setFavorites]=useState<string[]>(['json-formatter','jwt-decoder','cidr-calculator'])
  const [showFavorites,setShowFavorites]=useState(false)
  const tool=tools.find(t=>t.id===activeTool)!
  useEffect(()=>{
    document.title = `${tool.name} — Free Online Developer Tool | DevKit`
    const meta=document.querySelector('meta[name="description"]')
    if(meta) meta.setAttribute('content', `${tool.description} Free, fast and browser-based with DevKit.`)
  },[tool.id])
  const filtered=useMemo(()=>tools.filter(t=>(activeCategory==='All tools'||t.category===activeCategory)&&(!showFavorites||favorites.includes(t.id))&&(!query||[t.name,t.description,t.category,...t.tags].join(' ').toLowerCase().includes(query.toLowerCase()))),[activeCategory,query,showFavorites,favorites])
  const selectTool=(id:string)=>{
    const t=tools.find(x=>x.id===id); if(!t)return
    executionId.current++;setRunning(false);setActiveTool(id);window.history.pushState({},'',`/tools/${id}`);setInput(samples[id]??'');setSecondary(secondarySamples[id]??'');setOutput('');setError('');setOptions({});setMode('encode');setCopied(false);setMobileNav(false)
  }
  const execute=async()=>{
    const request=++executionId.current
    const toolId=activeTool,inputValue=input,secondaryValue=secondary,toolOptions={...options,mode}
    setRunning(true);setError('');setOutput('')
    try { const result=await runTool(toolId,inputValue,secondaryValue,toolOptions);if(request===executionId.current)setOutput(result) }
    catch(e:any){if(request===executionId.current)setError(e?.message||'Something went wrong. Check your input and try again.')}
    finally{if(request===executionId.current)setRunning(false)}
  }
  const copy=async()=>{
    if(!output)return
    try{if(!navigator.clipboard?.writeText)throw Error('Clipboard API unavailable');await navigator.clipboard.writeText(output);setCopied(true);window.setTimeout(()=>setCopied(false),1400)}
    catch{setError('Could not access the clipboard. Check browser permissions or copy the result manually.')}
  }
  const reset=()=>{executionId.current++;setRunning(false);setInput(samples[activeTool]??'');setSecondary(secondarySamples[activeTool]??'');setOptions({});setMode('encode');setOutput('');setError('');setCopied(false)}
  const isDual=['json-diff','text-diff'].includes(activeTool)
  const option=(key:string,value:string)=>setOptions(v=>({...v,[key]:value}))
  const categoryIcon=(name:string)=>{const C=iconMap[categories.find(c=>c.name===name)?.icon||'Grid2X2']||Grid2X2;return <C size={16}/>}
  const nav=<div className="nav-content">
    <div className="nav-label">WORKSPACE</div>
    <button className={`nav-item ${showFavorites?'selected':''}`} onClick={()=>{setShowFavorites(true);setActiveCategory('All tools')}}><Star size={16}/> Favorites <span>{favorites.length}</span></button>
    <button className={`nav-item ${!showFavorites&&activeCategory==='All tools'?'selected':''}`} onClick={()=>{setShowFavorites(false);setActiveCategory('All tools')}}><Grid2X2 size={16}/> All tools <span>{tools.length}</span></button>
    <div className="nav-label nav-label-gap">CATEGORIES</div>
    {categories.filter(c=>c.name!=='All tools').map(c=><button key={c.name} className={`nav-item ${activeCategory===c.name&&!showFavorites?'selected':''}`} onClick={()=>{setShowFavorites(false);setActiveCategory(c.name)}}>{categoryIcon(c.name)} {c.name}<span>{tools.filter(t=>t.category===c.name).length}</span></button>)}
    <div className="sidebar-bottom"><div className="privacy-card"><Lock size={15}/><div><b>Private by design</b><p>Most tools run locally in your browser. Your input stays on your device.</p></div></div><div className="version">DEVKIT · VERSION 1.0.0</div></div>
  </div>
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-area">
        <button className="icon-button mobile-menu" onClick={()=>setMobileNav(!mobileNav)}><Menu size={19}/></button>
        <div className="brand-mark"><Terminal size={19}/></div><span className="brand-name">devkit<span>.</span></span><span className="brand-badge">BETA</span>
      </div>
      <div className="top-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search tools and categories" placeholder="Search tools, categories..." /><kbd>⌘ K</kbd></div>
      <div className="top-actions"><span className="local-badge"><span/> Browser-based</span><a className="icon-button" href="https://github.com/hrishizone/devkit" target="_blank" rel="noreferrer" aria-label="DevKit GitHub repository"><Github size={18}/></a><span className="avatar" aria-hidden="true">D</span></div>
    </header>
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen?'':'collapsed'} ${mobileNav?'mobile-open':''}`}>
        <div className="sidebar-head"><span>DEVELOPER TOOLS</span><button className="icon-button subtle" onClick={()=>setSidebarOpen(!sidebarOpen)}><PanelLeftClose size={16}/></button></div>
        {nav}
      </aside>
      {mobileNav&&<div className="mobile-scrim" onClick={()=>setMobileNav(false)}/>}
      <main className="main-area">
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={13}/><span>{tool.category}</span><ChevronRight size={13}/><b>{tool.name}</b></div>
        <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><Sparkles size={13}/> THE DEVELOPER TOOLBOX</div><h1>Build faster.<br/><span>Debug smarter.</span></h1><p>Essential utilities for developers, all in one workspace. Fast, free, and private by design.</p></div>
          <div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><div className="code-window"><div className="window-dots"><i/><i/><i/></div><div className="code-line"><span className="code-purple">const</span> <span className="code-blue">developer</span> = {'{'}</div><div className="code-line indent"><span className="code-cyan">focus</span>: <span className="code-green">'building'</span>,</div><div className="code-line indent"><span className="code-cyan">workflow</span>: <span className="code-green">'optimized'</span></div><div className="code-line">{'}'}<span className="cursor">▍</span></div><div className="code-footer"><Zap size={12}/> {tools.length} TOOLS · ONE WORKSPACE</div></div></div>
        </section>
        <section className="stats-row"><div><b>{tools.length}</b><span>Developer tools</span></div><div><b>{categories.length-1}</b><span>Categories</span></div><div><b>100%</b><span>Browser-first</span></div><div><b>0</b><span>Sign-ups required</span></div></section>
        <section className="tool-browser">
          <div className="section-heading"><div><div className="eyebrow muted">EXPLORE TOOLBOX</div><h2>{showFavorites?'Your favorites':activeCategory}</h2><p>Pick a utility and get straight to work.</p></div><div className="result-count"><SlidersHorizontal size={14}/>{filtered.length} tools</div></div>
          <div className="tool-grid">
            {filtered.map(t=><div key={t.id} className={`tool-card ${activeTool===t.id?'active':''}`}><div className="tool-card-top"><div className="tool-icon">{categoryIcon(t.category)}</div><button className={`favorite ${favorites.includes(t.id)?'on':''}`} onClick={e=>{e.stopPropagation();setFavorites(v=>v.includes(t.id)?v.filter(x=>x!==t.id):[...v,t.id])}} aria-label={`Toggle ${t.name} favorite`}><Star size={15} fill={favorites.includes(t.id)?'currentColor':'none'}/></button></div><a className="tool-title-link" href={`/tools/${t.id}`} onClick={e=>{e.preventDefault();selectTool(t.id)}}>{t.name}</a><p>{t.description}</p><div className="tool-card-bottom"><span>{t.category}</span><ArrowUpRight size={14}/></div></div>)}
            {filtered.length===0&&<div className="empty-state"><Search size={25}/><b>No tools found</b><span>Try another search or category.</span><button onClick={()=>{setQuery('');setActiveCategory('All tools');setShowFavorites(false)}}>Clear filters</button></div>}
          </div>
        </section>
        <section className="workspace">
          <div className="workspace-head"><div><div className="eyebrow muted">TOOL WORKSPACE</div><h2>{tool.name}</h2><p>{tool.description}</p></div><div className="workspace-actions"><button className="secondary-button" onClick={reset}><RotateCcw size={14}/> Reset</button><button className="secondary-button" onClick={()=>setFavorites(v=>v.includes(tool.id)?v.filter(x=>x!==tool.id):[...v,tool.id])}><Star size={14} fill={favorites.includes(tool.id)?'currentColor':'none'}/>{favorites.includes(tool.id)?'Saved':'Save'}</button></div></div>
          <div className="editor-grid">
            <div className="editor-panel"><div className="panel-head"><span>INPUT</span><div className="panel-tools"><span className="format-label">TEXT</span><button onClick={()=>setInput(samples[activeTool]??'')}>Load sample</button></div></div>
              {activeTool==='base64'||activeTool==='url-encoder'||activeTool==='html-entities'||activeTool==='hex-converter'?<div className="control-row"><button className={mode==='encode'?'mode-active':''} onClick={()=>setMode('encode')}>Encode</button><button className={mode==='decode'?'mode-active':''} onClick={()=>setMode('decode')}>Decode</button></div>:null}
              {activeTool==='hash-generator'?<div className="control-row"><label>Algorithm</label><select value={options.algorithm||'SHA-256'} onChange={e=>option('algorithm',e.target.value)}><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option></select></div>:null}
              {activeTool==='case-converter'?<div className="control-row"><label>Output case</label><select value={options.mode||'camelCase'} onChange={e=>option('mode',e.target.value)}><option>camelCase</option><option>PascalCase</option><option>snake_case</option><option>kebab-case</option><option>UPPER_CASE</option></select></div>:null}
              {activeTool==='regex-tester'?<div className="control-row"><label>Pattern</label><input className="inline-option" aria-label="Regex pattern" value={secondary} onChange={e=>setSecondary(e.target.value)} placeholder="Enter regex pattern"/><select value={options.flags||'g'} onChange={e=>option('flags',e.target.value)}><option>g</option><option>gi</option><option>im</option></select></div>:null}
              {activeTool==='json-pointer-tester'?<div className="control-row"><label>JSON Pointer</label><input className="inline-option" aria-label="JSON Pointer" value={options.pointer||''} onChange={e=>option('pointer',e.target.value)} placeholder="/user/name"/></div>:null}
              {activeTool==='csv-column-selector'?<div className="control-row"><label>Columns</label><input className="inline-option" aria-label="Columns" value={options.columns||''} onChange={e=>option('columns',e.target.value)} placeholder="name, email or 1, 2"/></div>:null}
              {activeTool==='json-key-picker'||activeTool==='json-key-remover'?<div className="control-row"><label>Keys</label><input className="inline-option" aria-label="Keys" value={options.keys||''} onChange={e=>option('keys',e.target.value)} placeholder="name, email"/></div>:null}
              {activeTool==='json-key-renamer'?<div className="control-row"><label>From</label><input className="inline-option" aria-label="Rename from" value={options.from||'oldKey'} onChange={e=>option('from',e.target.value)} placeholder="oldKey"/><label>To</label><input className="inline-option" aria-label="Rename to" value={options.to||'newKey'} onChange={e=>option('to',e.target.value)} placeholder="newKey"/></div>:null}
              {activeTool==='json-array-sorter'?<div className="control-row"><label>Sort key</label><input className="inline-option" aria-label="Sort key" value={options.key||'name'} onChange={e=>option('key',e.target.value)} placeholder="name"/></div>:null}
              {activeTool==='json-array-chunker'?<div className="control-row"><label>Chunk size</label><input className="inline-option" aria-label="Chunk size" value={options.size||'10'} onChange={e=>option('size',e.target.value)} inputMode="numeric"/></div>:null}
              {activeTool==='json-to-typescript'?<div className="control-row"><label>Interface name</label><input className="inline-option" aria-label="Interface name" value={options.name||'Root'} onChange={e=>option('name',e.target.value)} placeholder="Root"/></div>:null}
              {['sql-insert','sql-create-table-builder','json-to-postgresql','json-to-mysql'].includes(activeTool)?<div className="control-row"><label>Table</label><input className="inline-option" aria-label="Table name" value={options.table||'your_table'} onChange={e=>option('table',e.target.value)} placeholder="your_table"/></div>:null}
              {activeTool==='hmac-sha-256'||activeTool==='webhook-signature-helper'?<div className="control-row"><label>Secret</label><input type="password" className="inline-option" aria-label="HMAC secret" value={options.secret||''} onChange={e=>option('secret',e.target.value)} placeholder="Enter signing secret" autoComplete="off"/></div>:null}
              {activeTool==='docker-run'?<div className="control-row"><label>Name</label><input className="inline-option" aria-label="Container name" value={options.name||''} onChange={e=>option('name',e.target.value)} placeholder="optional"/><label>Ports</label><input className="inline-option" aria-label="Port mappings" value={options.ports||''} onChange={e=>option('ports',e.target.value)} placeholder="8080:80"/></div>:null}
              {['random-token-generator','random-hex-generator','password'].includes(activeTool)?<div className="control-row"><label>Length</label><input className="inline-option" aria-label="Generated length" value={options.length||'32'} onChange={e=>option('length',e.target.value)} inputMode="numeric"/></div>:null}
              {['nano-id-generator','passphrase-generator','uuid-generator','uuid-v7-generator','lorem'].includes(activeTool)?<div className="control-row"><label>Count</label><input className="inline-option" aria-label="Output count" value={options.count||'1'} onChange={e=>option('count',e.target.value)} inputMode="numeric"/></div>:null}
              {activeTool==='log-level-filter'?<div className="control-row"><label>Level pattern</label><input className="inline-option" aria-label="Log level pattern" value={options.level||'ERROR|WARN|FATAL'} onChange={e=>option('level',e.target.value)} placeholder="ERROR|WARN|FATAL"/></div>:null}
              {activeTool==='git-branch-name-helper'?<div className="control-row"><label>Branch type</label><input className="inline-option" aria-label="Branch type" value={options.type||'feature'} onChange={e=>option('type',e.target.value)} placeholder="feature"/></div>:null}
              {activeTool==='conventional-commit-builder'?<div className="control-row"><label>Type</label><input className="inline-option" aria-label="Commit type" value={options.type||'feat'} onChange={e=>option('type',e.target.value)} placeholder="feat"/><label>Scope</label><input className="inline-option" aria-label="Commit scope" value={options.scope||''} onChange={e=>option('scope',e.target.value)} placeholder="optional"/></div>:null}
              {activeTool==='json-diff'||activeTool==='text-diff'?<><textarea aria-label="Tool input" spellCheck={false} value={input} onChange={e=>setInput(e.target.value)} placeholder="Paste first input..."/><div className="second-input-label">SECOND INPUT</div><textarea aria-label="Second comparison input" spellCheck={false} className="secondary-editor" value={secondary} onChange={e=>setSecondary(e.target.value)} placeholder="Paste second input..."/></>:<textarea aria-label="Tool input" spellCheck={false} value={input} onChange={e=>setInput(e.target.value)} placeholder="Paste or type your input here..."/>}
              <div className="panel-foot"><span>{input.length.toLocaleString()} characters</span><span><Lock size={11}/> Stays in your browser</span></div>
            </div>
            <div className="editor-panel output-panel"><div className="panel-head"><span>OUTPUT</span><div className="panel-tools"><span className="format-label">{error?'ERROR':'RESULT'}</span><button onClick={copy} disabled={!output}>{copied?<><Check size={13}/> Copied</>:<><Copy size={13}/> Copy</>}</button></div></div>
              <pre aria-live="polite" className={error?'output-error':''}>{error||output||'Your result will appear here after you run the tool.'}</pre>
              <div className="panel-foot"><span>{output.length.toLocaleString()} characters</span><span>{output?'Ready':'Waiting for input'}</span></div>
            </div>
          </div>
          <div className="run-row"><span><Lock size={13}/> Processed locally · No upload</span><button className="run-button" onClick={execute} disabled={running}>{running?'Processing...':<>Run tool <ChevronRight size={16}/></>}</button></div>
        </section>
        <footer><span>© {new Date().getFullYear()} DevKit. Built for developers.</span><span>Privacy-first · No account required · <a href="https://github.com/hrishizone/devkit/issues" target="_blank" rel="noreferrer">Feedback</a></span></footer>
      </main>
    </div>
  </div>
}
export default App