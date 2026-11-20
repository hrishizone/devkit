# DevKit

A browser-first developer utility workspace built with React, TypeScript and Vite.

## Features

- Searchable tool catalogue with categories and favorites
- Responsive dark developer interface
- Client-side processing for implemented utilities
- Copyable output, sample inputs, reset controls and error states
- No account required and no backend required for the included tools

## Quick start

Requirements: Node.js 20+

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

```bash
npm test
npm run typecheck
```

The test suite covers core transformations, validation/error behavior and a UI smoke test. Keyboard support includes Ctrl/Cmd+K to focus search, Escape to clear search, Enter/Space on tool cards, and visible focus indicators.

## SEO landing pages

Every catalogued tool gets a static `/tools/<tool-id>/` page during production build with a unique title, description, canonical URL, Open Graph metadata and WebApplication JSON-LD. The build also writes `sitemap.xml` and `robots.txt`. Update `seo-tools.json` and `src/tools.ts` together when adding or removing tools. Set `SITE_URL` to your deployed domain when building (for example `SITE_URL=https://yourdomain.com npm run build`). Without it, generated canonical URLs use the reserved `devkit.example` placeholder.

## Production build

```bash
npm run typecheck
npm run build
npm run preview
```

Deploy the generated `dist/` directory to any static host (Cloudflare Pages, Netlify, Vercel or S3 + CloudFront).

## Tool catalogue and implementation status

The catalogue contains 221 tool entries, of which approximately 90 have working transformations in this MVP. The engine implements the core formatting, conversion, hashing, comparison, networking, text, CSS and generator utilities. Some specialist catalogue entries are still roadmap entries and intentionally return an explicit not-yet-implemented message rather than pretending to process data. Check the selected tool with sample input before publishing it as fully supported.

## Implemented tools

JSON formatter/minifier/validator, JSON↔YAML (common flat YAML subset), JSON diff, CSV to JSON, Base64, URL and HTML entity encoding, hex conversion, SHA hashes, UUIDs, JWT decoding (not verification), text diff, case conversion, regex tester, slug generator, basic SQL formatting and INSERT generation, cron explainer, `.env` sorter, Docker run builder, IPv4 CIDR calculator, timestamp converter, HEX/RGB/HSL converter, CSS gradient generator, HTML formatter, basic Markdown preview, HTTP status lookup, cURL builder, header parser, chmod calculator, Lorem Ipsum and password generation, and basic JSON Schema inference.

Some advanced catalogue entries are intentionally listed as future tools; the interface displays a clear not-yet-implemented message when selected.

## Production hardening before public launch

This is a production-oriented MVP starter, not a fully audited production service. Before launch:

- Add automated unit, integration and browser tests.
- Add a real YAML 1.2 parser and robust CSV parser for full standards support.
- Review HTML/Markdown rendering and sanitize all untrusted markup before rendering.
- Add CSP, security headers, dependency scanning and a lockfile.
- Add error monitoring, privacy policy, terms and accessible keyboard navigation.
- Add server-side processing only where necessary, with file limits, isolation, rate limiting and automatic deletion.
- Add analytics with privacy-conscious consent and a documented retention policy.
- Verify crypto APIs and browser compatibility in supported browsers.

## Security notes

All included transformations run in the browser. JWT decoding does not validate signatures, expiry, issuer or audience. Do not paste production secrets or private keys into untrusted websites. The password generator uses Web Crypto randomness. SHA hashes use the browser Web Crypto API.
