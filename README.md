# DevKit

A browser-first developer utility workspace built with React, TypeScript and Vite. The catalogue contains 221 tools for formatting, conversion, validation, networking, cloud configuration, text processing and developer workflows.

**Production URL:** https://devkit-fawn.vercel.app

## Principles

- Tool inputs are processed in the browser; the included tools do not require a DevKit backend or account.
- No analytics or third-party processing is required for the core tool workflow.
- Input, option and output sizes are bounded by the execution engine.
- Security-sensitive operations fail closed on invalid input rather than silently accepting malformed values.
- Reference and guide tools are labelled as such; they do not pretend to perform external operations.

## Requirements

- Node.js 22.12.x (22.x)
- npm 10.9.2

The exact dependency tree is committed in `package-lock.json`. Use `npm ci` for reproducible installs.

## Local development

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Quality gates

```bash
npm test
npm run typecheck
npm run build
```

The production build runs these gates in order:

1. `npm audit --audit-level=moderate`
2. TypeScript project checks
3. Vitest unit, edge-case and UI integration tests
4. Vite production build
5. Generation of 221 static SEO landing pages
6. Generation of `sitemap.xml` and `robots.txt`
7. Verification of canonical URLs, JSON-LD, page count, sitemap URLs and robots.txt

At this revision, CI passes **357 tests across 3 test files**. The catalogue test matrix executes a representative input through every one of the 221 tool IDs. That matrix is a smoke-coverage guarantee, not a claim that every tool has exhaustive property-based or browser end-to-end coverage.

GitHub Actions runs the quality gate on the hardening branch and on pull requests targeting `main`. Workflow actions are pinned to immutable commit SHAs.

## SEO and deployment

Every tool has a static `/tools/<tool-id>/` landing page with a unique title, description, canonical URL, Open Graph metadata and JSON-LD. The build verifies all generated artifacts.

The default canonical origin is `https://devkit-fawn.vercel.app`. For a future custom domain, set `SITE_URL` to a root HTTPS origin, for example:

```bash
SITE_URL=https://tools.example.com npm run build
```

Do not include credentials, a path, query string or fragment in `SITE_URL`.

When adding or removing a tool, update both `src/tools.ts` and `seo-tools.json`; the build fails if the SEO catalogue contains duplicate or invalid slugs or if generated pages are missing.

Vercel installs with `npm ci`. Production deployments remain connected to `main`. Automatic preview deployments are intentionally disabled for the temporary `production-hardening-pass-1` branch while it is being validated.

## Runtime limits

- Primary and secondary input fields: 1,000,000 characters each
- Tool options: at most 100 keys; each key is limited to 128 characters and each value to 100,000 characters
- Tool output: 5,000,000 characters maximum
- JSON parsing: maximum depth 100 and 100,000 visited values
- Regex tester: pattern length 128, input length 100,000 and 10,000 matches maximum
- UUID generation: 1–100 per request; passphrase generation: 1–20 per request

These are application-level limits, not a substitute for browser memory limits or independent validation of generated commands and configuration.

## Security controls

- Content Security Policy without `unsafe-inline` script or style permissions
- HSTS, `X-Content-Type-Options`, `X-Frame-Options`, Referrer Policy, Permissions Policy, COOP and CORP headers
- Strict runtime input and option validation, JSON depth/node limits, and a 5 MB result cap
- Cryptographically secure random generation with unbiased sampling
- SHA-256, SHA-384 and SHA-512 only; HMAC tools require a non-empty secret
- MySQL string values emitted as UTF-8 hex literals to avoid backslash/quote injection
- Shell arguments quoted in generated Docker and cURL commands
- Header values checked for control characters
- HTML attributes/text escaped in generated markup
- Secret redaction for common authorization headers, private-key blocks and several provider-token formats

All core transformations run locally in the browser. HMAC secrets are used in browser memory for the calculation; they are not sent to a DevKit backend. Do not paste secrets into a website unless you trust the site and the device you are using.

## Known limitations — read before relying on output

Production hardening does not make every utility a standards-complete parser or security product. Important boundaries:

- **JWT tools decode only.** They do not verify signatures, issuer, audience or trust.
- **Regex testing is bounded and heuristic.** Risky quantified groups and other patterns are rejected, but this is not a formal RE2/linear-time regex engine.
- **YAML to JSON supports a documented flat key/value subset.** It is not a complete YAML 1.2 parser.
- **SQL and GraphQL formatters are heuristic formatters**, not AST parsers or syntax validators.
- **Markdown preview tools display source as text**; they do not render or sanitize arbitrary HTML.
- **JSON Schema and TypeScript generators are basic inference tools**, not complete schema/type generators.
- **Credential scanning covers a limited set of common patterns** and is not a complete secret scanner.
- **Password-strength estimation is a local heuristic**, not a breach check or formal entropy calculation.
- **The SHA-256 file-checksum guide is guidance only**; the current text-only interface does not read uploaded files.
- **Security-header output is a baseline reference.** Tailor CSP, HSTS and other headers to the actual deployment and its dependencies.

The passphrase generator creates 16-word phrases using a 137-word list and cryptographically secure unbiased selection (about 113.6 bits of word-selection entropy). The password and token generators use Web Crypto randomness.

## Production build

```bash
npm run build
npm run preview
```

The generated `dist/` directory can be hosted on Vercel or another static host. Review the known limitations above and test representative real-world inputs before relying on any individual utility in a production workflow.
