# OQSE SDK

Official TypeScript SDK for the Open Quiz & Study Exchange ecosystem, published as @memizy/oqse.

This repository contains:
- Runtime validators built with Zod.
- Manually authored TypeScript types for developer ergonomics.
- Auto-generated JSON Schemas distributed with the package.
- The human-readable specification in SPECIFICATION.md.
- **[OQSE Web Validator](https://memizy.github.io/oqse-specification/)** - Online tool for easy testing and debugging of OQSE JSON structures in the browser.

## Package

- Name: @memizy/oqse
- Purpose: validate, parse, and type OQSE, OQSE Manifest, and OQSEP progress data.

## Architecture & Single Source of Truth

1. The specification markdown is for humans.
   SPECIFICATION.md is the normative documentation for concepts, rules, and semantics.

2. Zod schemas (*Validation.ts) are the absolute source of truth for code validation.
   Runtime validation behavior is defined in src/oqseValidation.ts, src/manifestValidation.ts, and src/progressValidation.ts.

3. TypeScript types (oqse.ts, manifest.ts, progress.ts) manually mirror the Zod schemas for better Developer Experience.
   These files are intentionally hand-written to provide clearer interfaces, JSDoc, and IntelliSense quality.

4. JSON schemas are strictly auto-generated using npm run generate:schemas and contributors MUST NOT edit them manually.
   If validation behavior changes, update the Zod schemas first, then regenerate.

## Development

Install dependencies:

```bash
npm install
```

Build and regenerate schemas:

```bash
npm run build
```

Generate only JSON schemas:

```bash
npm run generate:schemas
```

Run tests:

```bash
npm test
```

## Contributing Rule

Never edit files in schemas/ by hand. Always regenerate via npm run generate:schemas.
