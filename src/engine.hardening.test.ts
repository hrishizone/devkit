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
