# CODE_COMMENTING_STANDARD | Dungeon Core Crawler

**Owner:** Marcus Daley  
**Scope:** JavaScript and TypeScript source modules in this workspace, including server, client, shared, scripts, and tests.

## 1. Core syntax rule

- Write JavaScript and TypeScript tracking notes exclusively with `//` comments.
- Do not write JSDoc, JavyDoc, or slash-star block comments (`/** ... */` or `/* ... */`) in `.js` or `.ts` files. They obscure the reason for the code and can duplicate type information.
- Use each language's valid comment syntax in HTML, CSS, JSON-compatible files, Markdown, and CSV. Never insert `//` where it would make a non-JavaScript file invalid.

## 2. File header requirement

Every JavaScript or TypeScript code module must start with these four fields, using double-slash notation and the exact owner and date supplied for this project:

```js
// [Filename]
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: [Explain the specific system problem this module solves, not a list of its methods]
```

Replace the bracketed placeholders with the module's actual basename and a concise reason. Keep the header before imports, directives, and executable code.

## 3. Function documentation layout

Write plain `//` descriptions directly above non-obvious functions. Use these fields when the function crosses an authority, timing, or recovery boundary:

```js
// Why: Explain the system problem or defect this function prevents.
// Input: State accepted values, constraints, and whether arguments are trusted.
// Output: State what callers may rely on, including failure behavior.
// Watch Out: State race conditions, side effects, and protocol quirks.
```

For simple local helpers, a short `//` sentence is enough when the name and code already make the behavior clear. Keep comments accurate as code changes; avoid narrating obvious statements.

## 4. Dungeon Core authority notes

- On socket handlers, distinguish untrusted client intent from server-owned transforms, health, room membership, discovery, and rewards.
- On tick, collision, portal, trap, and reward functions, record the relevant bounds, idempotency, and disconnect or reconnect behavior where these are non-obvious.
- In client rendering code, explain when a visual change depends on an authoritative snapshot or event. Do not describe a client effect as a game-rule decision.
