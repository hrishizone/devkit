import { describe, expect, it } from 'vitest'
import { runTool } from './engine'

describe('production hardening: input boundaries', () => {
  it('rejects oversized primary and secondary inputs before processing', async () => {
    await expect(runTool('json-formatter', 'x'.repeat(1_000_001), '', {})).rejects.toThrow(/too large/i)
    await expect(runTool('json-diff', '{}', 'x'.repeat(1_000_001), {})).rejects.toThrow(/too large/i)
  })

  it('rejects malformed IPv4 octets and empty octets', async () => {
    await expect(runTool('ipv4-to-integer', '256.1.1.1', '', {})).rejects.toThrow(/IPv4/i)
    await expect(runTool('ipv4-to-integer', '1..2.3', '', {})).rejects.toThrow(/IPv4/i)
    await expect(runTool('ipv4-to-integer', '01.2.3.4', '', {})).rejects.toThrow(/IPv4/i)
  })

  it('bounds integer-to-IPv4 conversion', async () => {
    expect(await runTool('integer-to-ipv4', '0', '', {})).toBe('0.0.0.0')
    expect(await runTool('integer-to-ipv4', '4294967295', '', {})).toBe('255.255.255.255')
    await expect(runTool('integer-to-ipv4', '4294967296', '', {})).rejects.toThrow(/integer/i)
    await expect(runTool('integer-to-ipv4', '-1', '', {})).rejects.toThrow(/integer/i)
  })

  it('validates IPv6 syntax rather than only allowed characters', async () => {
    expect(await runTool('ipv6-validator', '2001:db8::1', '', {})).toBe('Valid IPv6 address.')
    expect(await runTool('ipv6-validator', '::::', '', {})).toBe('Invalid IPv6 address.')
    expect(await runTool('ipv6-validator', 'not:an:ip', '', {})).toBe('Invalid IPv6 address.')
  })
})

describe('production hardening: strict encodings', () => {
  it('rejects malformed Base64 padding and invalid UTF-8', async () => {
    await expect(runTool('base64', 'A===', '', { mode: 'decode' })).rejects.toThrow(/Base64/i)
    await expect(runTool('base64', '/w==', '', { mode: 'decode' })).rejects.toThrow(/UTF-8/i)
    expect(await runTool('base64', 'RGV2S2l0', '', { mode: 'decode' })).toBe('DevKit')
  })

  it('rejects malformed hex and invalid UTF-8', async () => {
    await expect(runTool('hex-converter', '1', '', { mode: 'decode' })).rejects.toThrow(/hexadecimal/i)
    await expect(runTool('hex-converter', '4g', '', { mode: 'decode' })).rejects.toThrow(/hexadecimal/i)
    await expect(runTool('hex-converter', 'ff', '', { mode: 'decode' })).rejects.toThrow(/UTF-8/i)
    expect(await runTool('hex-converter', '4465764b6974', '', { mode: 'decode' })).toBe('DevKit')
  })
})

describe('production hardening: resource bounds', () => {
  it('rejects text expansion above the output budget', async () => {
    await expect(runTool('text-repeater', 'x'.repeat(900_000), '', { count: '6' })).rejects.toThrow(/output is too large/i)
  })

  it('rejects invalid chunk sizes', async () => {
    await expect(runTool('text-splitter', 'abcdef', '', { size: 'Infinity' })).rejects.toThrow(/chunk size/i)
    expect(await runTool('text-splitter', 'abcdef', '', { size: '2' })).toBe('ab\ncd\nef')
  })
})

describe('production hardening: network boundaries', () => {
  it('handles /31 and /32 host counts correctly', async () => {
    expect(await runTool('cidr-calculator', '192.0.2.0/31', '', {})).toContain('Usable hosts (traditional): 2')
    expect(await runTool('cidr-calculator', '192.0.2.1/32', '', {})).toContain('Usable hosts (traditional): 1')
  })

  it('rejects malformed CIDR prefixes', async () => {
    await expect(runTool('cidr-calculator', '192.0.2.1/33', '', {})).rejects.toThrow(/prefix/i)
    await expect(runTool('cidr-calculator', '192.0.2.1/+24', '', {})).rejects.toThrow(/prefix/i)
    await expect(runTool('wildcard-mask-converter', '192.0.2.1/33', '', {})).rejects.toThrow(/prefix/i)
  })
})

describe('production hardening: generated SQL and shell commands', () => {
  it('quotes SQL identifiers and escapes string literals', async () => {
    const out = await runTool('sql-insert', '[{"first name":"O\'Reilly"}]', '', { table: 'users' })
    expect(out).toContain('INSERT INTO "users" ("first name")')
    expect(out).toContain("'O''Reilly'")
  })

  it('rejects SQL identifier injection', async () => {
    await expect(runTool('sql-insert', '[{"id":1}]', '', { table: 'users; DROP TABLE users' })).rejects.toThrow(/identifier/i)
  })

  it('shell-quotes curl values containing apostrophes', async () => {
    const input = JSON.stringify({ method: 'POST', url: 'https://example.com/hook', body: "it's safe" })
    const out = await runTool('curl-builder', input, '', {})
    expect(out).toContain("'\\''")
    expect(out).not.toContain("it's safe")
  })

  it('rejects non-http curl schemes', async () => {
    await expect(runTool('curl-builder', JSON.stringify({ url: 'file:///etc/passwd' }), '', {})).rejects.toThrow(/HTTP/i)
  })
})

describe('production hardening: RFC encodings and CSV parsing', () => {
  it.each([
    ['f', 'MY======'],
    ['fo', 'MZXQ===='],
    ['foo', 'MZXW6==='],
    ['foob', 'MZXW6YQ='],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI======'],
  ])('round-trips RFC 4648 Base32 vector %s', async (plain, encoded) => {
    expect(await runTool('base32-reference', plain, '', { mode: 'encode' })).toBe(encoded)
    expect(await runTool('base32-reference', encoded, '', { mode: 'decode' })).toBe(plain)
  })

  it('rejects invalid Base32 padding and non-canonical bits', async () => {
    await expect(runTool('base32-reference', 'MZXW6==', '', { mode: 'decode' })).rejects.toThrow(/padding|length/i)
    await expect(runTool('base32-reference', 'MZXW7===', '', { mode: 'decode' })).rejects.toThrow(/bits/i)
  })

  it('parses quoted commas and escaped quotes in CSV', async () => {
    const out = await runTool('csv-to-json', 'name,note\nAva,"hello, world"\nBen,"say ""hi"""', '', {})
    expect(out).toContain('hello, world')
    expect(out).toContain('say \\"hi\\"')
  })

  it('rejects malformed CSV quoting', async () => {
    await expect(runTool('csv-to-json', 'name,note\nAva,"unterminated', '', {})).rejects.toThrow(/unterminated/i)
    await expect(runTool('csv-to-json', 'name,no"te\nAva,hello', '', {})).rejects.toThrow(/quote/i)
  })
})

describe('production hardening: parser and regex safety', () => {
  it('rejects excessive JSON nesting and node counts', async () => {
    await expect(runTool('json-formatter', '['.repeat(101) + '0' + ']'.repeat(101), '', {})).rejects.toThrow(/nesting/i)
  })

  it('handles regex flags without the global flag', async () => {
    expect(await runTool('regex-tester', 'Alpha beta ALPHA', 'alpha', { flags: 'i' })).toContain('Alpha')
  })

  it('rejects common nested-quantifier ReDoS patterns', async () => {
    await expect(runTool('regex-tester', 'a'.repeat(1000), '(a+)+$', { flags: 'g' })).rejects.toThrow(/quantifier/i)
  })

  it('bounds regex pattern length', async () => {
    await expect(runTool('regex-tester', 'abc', 'a'.repeat(257), { flags: 'g' })).rejects.toThrow(/too long/i)
  })
})

describe('production hardening: JWT and secure generators', () => {
  const encodePart = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, '').replaceAll('+', '-').replaceAll('/', '_')
  const token = (payload: unknown, signature = 'sig') => encodePart({ alg: 'none', typ: 'JWT' }) + '.' + encodePart(payload) + '.' + signature

  it('requires exactly three JWT segments and valid JSON objects', async () => {
    await expect(runTool('jwt-decoder', 'a.b', '', {})).rejects.toThrow(/compact JWT/i)
    await expect(runTool('jwt-decoder', 'a.b.c.d', '', {})).rejects.toThrow(/compact JWT/i)
    await expect(runTool('jwt-decoder', '%%%.' + encodePart({ sub: '1' }) + '.sig', '', {})).rejects.toThrow(/Base64URL/i)
  })

  it('treats exp=0 as expired and validates NumericDate types', async () => {
    expect(await runTool('jwt-expiry-checker', token({ exp: 0 }), '', {})).toContain('(expired by time')
    await expect(runTool('jwt-expiry-checker', token({ exp: 'tomorrow' }), '', {})).rejects.toThrow(/NumericDate/i)
    expect(await runTool('jwt-expiry-checker', token({ sub: '123' }), '', {})).toBe('No exp claim.')
  })

  it('generates tokens only from the documented alphabet and requested length', async () => {
    const result = await runTool('password', '', '', { length: '64' })
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[A-Za-z0-9!@#$%^&*]+$/)
  })
})

describe('production hardening: JSON Pointer and path collisions', () => {
  it('supports escaped JSON Pointer tokens and array indices', async () => {
    expect(await runTool('json-pointer-tester', '{"a/b":[{"~key":"value"}]}', '', { pointer: '/a~1b/0/~0key' })).toContain('value')
  })

  it('rejects malformed or missing JSON Pointer paths', async () => {
    await expect(runTool('json-pointer-tester', '{"a":1}', '', { pointer: '/a~2b' })).rejects.toThrow(/escape/i)
    await expect(runTool('json-pointer-tester', '{"a":1}', '', { pointer: '/missing' })).rejects.toThrow(/does not exist/i)
    await expect(runTool('json-pointer-tester', '{"a":1}', '', { pointer: 'a' })).rejects.toThrow(/start with/i)
  })

  it('keeps prototype-like flattened keys as data without mutating prototypes', async () => {
    const out = await runTool('json-unflatten', '{"__proto__.polluted":true,"safe.value":1}', '', {})
    expect(out).toContain('"__proto__"')
    expect(out).toContain('"polluted": true')
    expect(({} as any).polluted).toBeUndefined()
  })

  it('rejects conflicting flattened paths', async () => {
    await expect(runTool('json-unflatten', '{"a":1,"a.b":2}', '', {})).rejects.toThrow(/conflicting/i)
  })
})

describe('production hardening: generated markup and infrastructure', () => {
  it('escapes HTML attributes and rejects unsafe input types', async () => {
    const out = await runTool('html-input-builder', '" onfocus="alert(1)', '', { type: 'text', name: 'search' })
    expect(out).toContain('&quot;')
    expect(out).not.toContain('onfocus="alert(1)')
    await expect(runTool('html-input-builder', 'x', '', { type: 'text\" onfocus=\"x' })).rejects.toThrow(/input type/i)
  })

  it('rejects executable favicon schemes and escapes URL attributes', async () => {
    await expect(runTool('favicon-html-builder', 'javascript:alert(1)', '', {})).rejects.toThrow(/executable scheme/i)
    expect(await runTool('favicon-html-builder', '/icon?a=1&b=2', '', {})).toContain('&amp;')
  })

  it('quotes Docker command arguments and validates images and ports', async () => {
    const out = await runTool('docker-run', "nginx:latest", '', { name: "web app", ports: '8080:80' }).catch(e => e.message)
    expect(out).toMatch(/container name/i)
    await expect(runTool('docker-run', 'nginx:latest; whoami', '', {})).rejects.toThrow(/Docker image/i)
    await expect(runTool('docker-port-mapper', '70000:80', '', {})).rejects.toThrow(/65,535/i)
    expect(await runTool('docker-port-mapper', '8080:80,8443:443', '', {})).toContain("-p '8443:443'")
    await expect(runTool('docker-port-mapper', '90-80', '', {})).rejects.toThrow(/ascending/i)
  })

  it('validates Kubernetes and Terraform identifiers', async () => {
    await expect(runTool('kubernetes-deployment-starter', 'My App', '', {})).rejects.toThrow(/DNS labels/i)
    expect(await runTool('kubernetes-deployment-starter', 'my-app', '', {})).toContain('name: my-app')
    await expect(runTool('terraform-variable-builder', 'x\" {\n provisioner \"local-exec\" {}\n}', '', {})).rejects.toThrow(/identifiers/i)
  })

  it('rejects multiline systemd descriptions', async () => {
    await expect(runTool('systemd-unit-starter', 'Good\nExecStart=/bin/sh', '', {})).rejects.toThrow(/single line/i)
  })
})

describe('production hardening: YAML subset', () => {
  it('serializes nested objects and arrays without losing structure', async () => {
    const input = JSON.stringify({ app: 'DevKit', features: ['format', 'validate'], nested: { enabled: true, count: 2 } })
    const out = await runTool('json-to-yaml', input, '', {})
    expect(out).toContain('features:')
    expect(out).toContain('- "format"')
    expect(out).toContain('enabled: true')
  })

  it('parses flat YAML scalar types and quoted strings', async () => {
    const out = await runTool('yaml-to-json', 'app: DevKit\nenabled: true\ncount: 2\nlabel: "hello: world"', '', {})
    expect(out).toContain('"enabled": true')
    expect(out).toContain('"count": 2')
    expect(out).toContain('hello: world')
  })

  it('rejects nested YAML instead of silently discarding it', async () => {
    await expect(runTool('yaml-to-json', 'app:\n  name: DevKit', '', {})).rejects.toThrow(/Nested YAML/i)
  })

  it('rejects duplicate YAML keys', async () => {
    await expect(runTool('yaml-to-json', 'app: one\napp: two', '', {})).rejects.toThrow(/Duplicate YAML key/i)
  })
})

describe('production hardening: numeric, byte and date boundaries', () => {
  it('rejects malformed binary and invalid UTF-8 bytes', async () => {
    await expect(runTool('binary-to-text', '0101', '', {})).rejects.toThrow(/eight/i)
    await expect(runTool('binary-to-text', '11111111', '', {})).rejects.toThrow(/UTF-8/i)
    expect(await runTool('binary-to-text', '0100100001101001', '', {})).toBe('Hi')
  })

  it('uses exact integer arithmetic for octal and hexadecimal conversions', async () => {
    expect(await runTool('octal-converter', '42', '', { mode: 'encode' })).toBe('52')
    expect(await runTool('octal-converter', '52', '', { mode: 'decode' })).toBe('42')
    await expect(runTool('octal-converter', '89', '', { mode: 'decode' })).rejects.toThrow(/octal/i)
    expect(await runTool('decimal-to-hex', '255', '', {})).toBe('FF')
    await expect(runTool('decimal-to-hex', '2x', '', {})).rejects.toThrow(/decimal integer/i)
    expect(await runTool('hex-to-decimal', '0xfffffffffffff', '', {})).toBe('4503599627370495')
    await expect(runTool('hex-to-decimal', '0xzz', '', {})).rejects.toThrow(/hexadecimal/i)
  })

  it('counts business days regardless of date order', async () => {
    const forward = await runTool('business-days-between-dates', '2024-01-01,2024-01-10', '', {})
    const reverse = await runTool('business-days-between-dates', '2024-01-10,2024-01-01', '', {})
    expect(reverse).toBe(forward)
  })

  it('rejects malformed duration strings and invalid seconds', async () => {
    expect(await runTool('duration-to-seconds', '1d 2h 30m 10s', '', {})).toBe('95410')
    await expect(runTool('duration-to-seconds', 'abc', '', {})).rejects.toThrow(/duration/i)
    await expect(runTool('seconds-to-duration', '-1', '', {})).rejects.toThrow(/non-negative/i)
    await expect(runTool('seconds-to-duration', 'NaN', '', {})).rejects.toThrow(/safe integer/i)
  })
})

describe('production hardening: data format and credential safety', () => {
  it('rejects duplicate CSV headers and inconsistent rows', async () => {
    await expect(runTool('csv-to-json', 'name,name\nAva,Ben', '', {})).rejects.toThrow(/unique header/i)
    await expect(runTool('csv-to-json', 'name,role\nAva', '', {})).rejects.toThrow(/column counts/i)
    expect(await runTool('csv-validator', 'name,role\nAva', '', {})).toContain('Invalid CSV')
  })

  it('quotes SQL identifiers for both standard and MySQL dialects', async () => {
    expect(await runTool('sql-identifier-quoter', 'users,id', '', {})).toBe('"users", "id"')
    expect(await runTool('sql-identifier-quoter', 'users,id', '', { dialect: 'mysql' })).toBe('`users`, `id`')
    await expect(runTool('sql-identifier-quoter', 'users; DROP TABLE users', '', {})).rejects.toThrow(/identifier/i)
  })

  it('does not expose database URL credentials or secret query values', async () => {
    const url = 'postgresql://alice:secret@db.example.com:5432/app?token=topsecret&sslmode=require'
    const parsed = await runTool('postgresql-url-parser', url, '', {})
    expect(parsed).not.toContain('alice')
    expect(parsed).not.toContain('secret')
    expect(parsed).not.toContain('topsecret')
    const masked = await runTool('database-url-masker', url, '', {})
    expect(masked).not.toContain('alice')
    expect(masked).not.toContain('secret')
    expect(masked).not.toContain('topsecret')
    expect(masked).toContain('REDACTED')
  })

  it('quotes Kubernetes ConfigMap values and validates label keys', async () => {
    const config = await runTool('kubernetes-configmap-builder', 'MESSAGE=hello "world"\nREGION=ap-south-1', '', {})
    expect(config).toContain('"hello \\"world\\""')
    await expect(runTool('kubernetes-configmap-builder', 'BAD KEY=value', '', {})).rejects.toThrow(/ConfigMap key/i)
    await expect(runTool('kubernetes-label-builder', 'app=web,app=api', '', {})).rejects.toThrow(/unique/i)
  })
})

describe('production hardening: HTTP header injection', () => {
  it('rejects CRLF in header values and malformed MIME types', async () => {
    await expect(runTool('content-type-builder', 'application/json\r\nX-Evil: yes', '', {})).rejects.toThrow(/CR, LF/i)
    await expect(runTool('content-type-builder', 'not-a-mime-type', '', {})).rejects.toThrow(/MIME/i)
    expect(await runTool('content-type-builder', 'application/json; charset=utf-8', '', {})).toBe('Content-Type: application/json; charset=utf-8')
  })

  it('validates bearer tokens and basic credentials', async () => {
    await expect(runTool('bearer-header-builder', 'abc\r\nX-Evil: yes', '', {})).rejects.toThrow(/CR, LF/i)
    expect(await runTool('bearer-header-builder', 'eyJhbGciOiJIUzI1NiJ9.signature', '', {})).toContain('Bearer eyJ')
    await expect(runTool('http-basic-auth-builder', 'username-only', '', {})).rejects.toThrow(/username:password/i)
  })

  it('validates CORS origins and methods', async () => {
    await expect(runTool('cors-header-guide', '', '', { origin: 'https://example.com\r\nX-Evil: yes' })).rejects.toThrow(/CR, LF/i)
    await expect(runTool('cors-header-guide', '', '', { origin: 'javascript:alert(1)' })).rejects.toThrow(/HTTP\(S\) scheme/i)
    expect(await runTool('cors-header-guide', '', '', { origin: 'https://example.com' })).toContain('Access-Control-Allow-Origin: https://example.com')
  })

  it('validates Accept media ranges and HTTP dates', async () => {
    expect(await runTool('http-accept-header-builder', 'text/html, application/json', '', {})).toBe('Accept: text/html, application/json')
    await expect(runTool('http-accept-header-builder', 'javascript:alert(1)', '', {})).rejects.toThrow(/media ranges/i)
    await expect(runTool('http-date-converter', 'not a date', '', {})).rejects.toThrow(/valid date/i)
  })

  it('preserves repeated parsed headers rather than overwriting them', async () => {
    const out = await runTool('header-parser', 'Set-Cookie: a=1\nSet-Cookie: b=2', '', {})
    expect(out).toContain('a=1')
    expect(out).toContain('b=2')
  })
})

describe('production hardening: code generation and structural JSON', () => {
  it('quotes unsafe TypeScript property names and validates interface names', async () => {
    const out = await runTool('json-to-typescript', '{"safe":1,"bad key":2}', '', { name: 'Payload' })
    expect(out).toContain('"bad key": number')
    await expect(runTool('json-to-typescript', '{"x":1}', '', { name: 'Bad Name' })).rejects.toThrow(/identifier/i)
    await expect(runTool('json-to-typescript', '[1,2]', '', {})).rejects.toThrow(/JSON object/i)
  })

  it('escapes HTML table content and validates row shapes', async () => {
    const out = await runTool('json-to-html-table', '[{"name":"<script>alert(1)</script>"}]', '', {})
    expect(out).toContain('&lt;script&gt;')
    expect(out).not.toContain('<script>')
    await expect(runTool('json-to-html-table', '[null]', '', {})).rejects.toThrow(/array of JSON objects/i)
  })

  it('rejects malformed JSON-to-CSV rows and non-object values', async () => {
    await expect(runTool('json-to-csv', '[{"a":1},null]', '', {})).rejects.toThrow(/array of JSON objects/i)
    await expect(runTool('json-to-csv', '["not an object"]', '', {})).rejects.toThrow(/array of JSON objects/i)
  })

  it('rejects JSON key renames that would overwrite existing values', async () => {
    await expect(runTool('json-key-renamer', '{"oldKey":1,"newKey":2}', '', { from: 'oldKey', to: 'newKey' })).rejects.toThrow(/duplicate key/i)
  })

  it('round-trips nested objects, arrays and empty containers through flattening', async () => {
    const original = '{"nested":{"value":true},"empty":{},"items":[1,2]}'
    const flattened = await runTool('json-flatten', original, '', {})
    const restored = await runTool('json-unflatten', flattened, '', {})
    expect(JSON.parse(restored)).toEqual(JSON.parse(original))
    await expect(runTool('json-flatten', '{"a.b":1}', '', {})).rejects.toThrow(/cannot contain dots/i)
  })

  it('validates array sorter and chunk sizes', async () => {
    await expect(runTool('json-array-sorter', '{"a":1}', '', {})).rejects.toThrow(/JSON array/i)
    await expect(runTool('json-array-chunker', '[1,2]', '', { size: '0' })).rejects.toThrow(/between 1 and 100,000/i)
    await expect(runTool('json-array-chunker', '[1,2]', '', { size: '1.5' })).rejects.toThrow(/between 1 and 100,000/i)
  })
})

describe('production hardening: regex, HMAC and hash algorithms', () => {
  it('rejects quantified groups and dangerous log filter patterns', async () => {
    await expect(runTool('regex-tester', 'a'.repeat(1000), '(a|aa)+$', { flags: 'g' })).rejects.toThrow(/Quantified groups/i)
    await expect(runTool('log-level-filter', 'ERROR hello', '', { level: '(a|aa)+$' })).rejects.toThrow(/Quantified groups/i)
  })

  it('rejects invalid regex flags and oversized patterns', async () => {
    await expect(runTool('regex-tester', 'abc', 'a', { flags: 'gg' })).rejects.toThrow(/flags/i)
    await expect(runTool('regex-tester', 'abc', 'a'.repeat(129), { flags: 'g' })).rejects.toThrow(/128 characters/i)
  })

  it('matches a known HMAC-SHA-256 test vector and requires a secret', async () => {
    const result = await runTool('hmac-sha-256', 'The quick brown fox jumps over the lazy dog', '', { secret: 'key' })
    expect(result).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8')
    await expect(runTool('hmac-sha-256', 'payload', '', { secret: '' })).rejects.toThrow(/non-empty HMAC secret/i)
    await expect(runTool('webhook-signature-helper', 'payload', '', { secret: '' })).rejects.toThrow(/non-empty webhook signing secret/i)
  })

  it('restricts digest algorithms to modern SHA-2 variants', async () => {
    await expect(runTool('hash-generator', 'payload', '', { algorithm: 'SHA-1' })).rejects.toThrow(/SHA-256, SHA-384 or SHA-512/i)
    expect(await runTool('hash-generator', 'payload', '', { algorithm: 'SHA-512' })).toHaveLength(128)
  })
})

describe('production hardening: date and Unicode boundaries', () => {
  it('counts business days in large ranges without day-by-day iteration', async () => {
    const result = await runTool('business-days-between-dates', '0001-01-01,9999-12-31', '', {})
    expect(result).toMatch(/^Business days: \d+$/)
    expect(await runTool('business-days-between-dates', '2024-01-06,2024-01-07', '', {})).toBe('Business days: 0')
  })

  it('rejects invalid ISO week dates and invalid leap-year input', async () => {
    await expect(runTool('week-number-calculator', 'not-a-date', '', {})).rejects.toThrow(/valid date/i)
    await expect(runTool('leap-year-checker', '20.24', '', {})).rejects.toThrow(/year between 1 and 9999/i)
    await expect(runTool('leap-year-checker', '0', '', {})).rejects.toThrow(/year between 1 and 9999/i)
  })

  it('round-trips Unicode supplementary characters as UTF-16 escapes', async () => {
    const encoded = await runTool('unicode-escape-converter', 'A😀', '', {})
    expect(encoded).toBe('\\u0041\\ud83d\\ude00')
    expect(await runTool('unicode-escape-converter', encoded, '', { mode: 'decode' })).toBe('A😀')
  })

  it('rejects blank seconds rather than treating them as zero', async () => {
    await expect(runTool('seconds-to-duration', '   ', '', {})).rejects.toThrow(/non-negative safe integer/i)
  })
})
, { flags: 'g' })).rejects.toThrow(/Quantified groups/i)
    await expect(runTool('log-level-filter', 'ERROR hello', '', { level: '(a|aa)+$' })).rejects.toThrow(/Quantified groups/i)
  })

  it('rejects invalid regex flags and oversized patterns', async () => {
    await expect(runTool('regex-tester', 'abc', 'a', { flags: 'gg' })).rejects.toThrow(/flags/i)
    await expect(runTool('regex-tester', 'abc', 'a'.repeat(129), { flags: 'g' })).rejects.toThrow(/128 characters/i)
  })

  it('matches a known HMAC-SHA-256 test vector and requires a secret', async () => {
    const result = await runTool('hmac-sha-256', 'The quick brown fox jumps over the lazy dog', '', { secret: 'key' })
    expect(result).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8')
    await expect(runTool('hmac-sha-256', 'payload', '', { secret: '' })).rejects.toThrow(/non-empty HMAC secret/i)
    await expect(runTool('webhook-signature-helper', 'payload', '', { secret: '' })).rejects.toThrow(/non-empty webhook signing secret/i)
  })

  it('restricts digest algorithms to modern SHA-2 variants', async () => {
    await expect(runTool('hash-generator', 'payload', '', { algorithm: 'SHA-1' })).rejects.toThrow(/SHA-256, SHA-384 or SHA-512/i)
    expect(await runTool('hash-generator', 'payload', '', { algorithm: 'SHA-512' })).toHaveLength(128)
  })
})

describe('production hardening: date and Unicode boundaries', () => {
  it('counts business days in large ranges without day-by-day iteration', async () => {
    const result = await runTool('business-days-between-dates', '0001-01-01,9999-12-31', '', {})
    expect(result).toMatch(/^Business days: \d+$/)
    expect(await runTool('business-days-between-dates', '2024-01-06,2024-01-07', '', {})).toBe('Business days: 0')
  })

  it('rejects invalid ISO week dates and invalid leap-year input', async () => {
    await expect(runTool('week-number-calculator', 'not-a-date', '', {})).rejects.toThrow(/valid date/i)
    await expect(runTool('leap-year-checker', '20.24', '', {})).rejects.toThrow(/year between 1 and 9999/i)
    await expect(runTool('leap-year-checker', '0', '', {})).rejects.toThrow(/year between 1 and 9999/i)
  })

  it('round-trips Unicode supplementary characters as UTF-16 escapes', async () => {
    const encoded = await runTool('unicode-escape-converter', 'A😀', '', {})
    expect(encoded).toBe('\\u0041\\ud83d\\ude00')
    expect(await runTool('unicode-escape-converter', encoded, '', { mode: 'decode' })).toBe('A😀')
  })

  it('rejects blank seconds rather than treating them as zero', async () => {
    await expect(runTool('seconds-to-duration', '   ', '', {})).rejects.toThrow(/non-negative safe integer/i)
  })
})
