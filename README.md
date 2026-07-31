# CUT — Next.js + Tailwind port

This is the original single-file React prototype (`CUT` — filmmaker
portfolio / delivery tool) rebuilt as a proper Next.js 14 (App Router)
project with Tailwind CSS wired in.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## What changed from the prototype

- **Project structure** — split into `app/layout.js`, `app/page.js`, and
  `components/CutApp.js` (a client component, since it's all `useState`/
  `useEffect` driven) instead of one giant file.
- **Fonts** — Archivo + Inter now load through `next/font/google` instead of
  a `@import` in the stylesheet, which avoids the extra network round-trip
  and layout shift.
- **Tailwind** — installed and configured (`tailwind.config.js`,
  `postcss.config.js`, `app/globals.css`). The brand palette (`bg`, `bg2`,
  `orange`, `ink`, `sage`, etc.) and fonts are defined as Tailwind theme
  tokens, and the base reset uses `@apply`. The bespoke, highly specific
  pieces (gradients, keyframes, the card/plan/stage "surfaces") are kept as
  plain CSS in `globals.css`, using `@apply` for colors/spacing where a
  utility class does the job cleanly — this is the normal pattern for
  hand-built components in a Tailwind codebase, rather than forcing every
  declaration into a utility class name.
- **Images** — the original embedded three large base64 JPEGs directly in
  the component. Those are replaced with `/public/images/hero.jpg`,
  `showcase.jpg`, and `cta.jpg` — placeholder gradients generated for this
  port. Swap in your own photography at the same paths and everything
  (the Ken Burns zoom, gradient overlays, etc.) keeps working.
- **Behavior** — unchanged. It's still the same client-side "surface
  switcher" demo (CUT website / public filmmaker page / private backend /
  client view) driven by React state, not real routing — that's a
  reasonable next step if you want shareable URLs per surface
  (e.g. `/`, `/p/[handle]`, `/app`, `/review/[id]`), but was out of scope
  for a straight framework port.

## Structure

```
app/
  layout.js       — root layout, loads fonts, imports globals.css
  page.js          — renders <CutApp />
  globals.css      — Tailwind directives + bespoke component CSS
components/
  CutApp.js        — the ported app ("use client")
public/images/     — hero.jpg, showcase.jpg, cta.jpg placeholders
tailwind.config.js
postcss.config.js
```
