# morph-motion

Two-state card morphs for React 19 powered by GSAP Flip.

This repository contains:

- A reusable package, `morph-motion`, built for shared-element card transitions.
- A local preview app with shadcn/ui examples to test and iterate on interactions.

## What morph-motion does

`MorphMotion.Card` animates transitions between exactly two states (`"a"` and `"b"`) and combines:

- Shared-element FLIP for elements marked as shared.
- Progressive reveal/hide for non-shared content.
- Optional blur pulse on shared elements (`sharedBlur`).
- Reduced-motion fallback via `prefers-reduced-motion`.
- Interruption handling for fast repeated toggles.

## Repository structure

```text
.
├─ packages/
│  └─ morph-motion/        # Library source and build config (npm distribution)
├─ registry/               # shadcn CLI registry sources
│  ├─ hooks/
│  └─ components/morph-motion/
├─ registry.json           # shadcn registry manifest
└─ preview/
   └─ shadcn-demo/         # Vite + React + shadcn preview app
```

## Build the shadcn registry

`registry.json` is the source of truth. Run `shadcn build` to produce self-contained JSON files under `public/r/`:

```bash
npm run registry:build
```

This generates `public/r/flip-morph.json` and `public/r/morph-card.json` with the hook and component source inlined. Host that `public/r/` directory anywhere static (GitHub Pages, Vercel, Netlify, jsDelivr from a committed folder) and users can install via `npx shadcn@latest add https://<your-host>/r/morph-card.json`.

## Local setup

### Prerequisites

- Node.js 20+
- npm 10+

### Install dependencies

From repo root:

```bash
npm install
```

Preview app dependencies are managed in its own package:

```bash
cd preview/shadcn-demo
npm install
```

## Run the preview app

```bash
cd preview/shadcn-demo
npm run dev
```

The preview app resolves shadcn-style imports (`@/components/morph-motion/card` and `@/hooks/*`) to local registry sources under `registry/`, so changes in `registry/components` and `registry/hooks` are reflected directly while developing examples.

## Build the library package

From root:

```bash
npm run build -w morph-motion
```

Or directly in the package:

```bash
cd packages/morph-motion
npm run build
```

## Install in another project

### Via shadcn CLI (recommended)

morph-motion ships a shadcn-style registry, so you can copy the source straight into your project. The CLI auto-detects your package manager (pnpm / npm / yarn / bun) from the lockfile and installs `gsap` + `@gsap/react` with it.

Install the `MorphCard` component (brings the hook along):

```bash
npx shadcn@latest add https://<your-host>/r/morph-card.json
```

Or install just the hook if you want to build your own wrapper:

```bash
npx shadcn@latest add https://<your-host>/r/flip-morph.json
```

The files land at:

```text
hooks/use-flip-morph.ts
hooks/register-flip.ts
components/morph-motion/card.tsx
```

You own the code — edit the hook, change the timing, tweak the clip-path handling.

### Via npm (package mode)

```bash
npm install morph-motion gsap @gsap/react react
```

## Basic usage

If installed via shadcn CLI:

```tsx
import { useState } from "react";
import { MorphCard } from "@/components/morph-motion/card";

export function ProductCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <MorphCard state={expanded ? "b" : "a"}>
      {expanded ? (
        <ExpandedLayout onClose={() => setExpanded(false)} />
      ) : (
        <CompactLayout onOpen={() => setExpanded(true)} />
      )}
    </MorphCard>
  );
}
```

If installed via npm:

```tsx
import { useState } from "react";
import { MorphMotion } from "morph-motion";

export function ProductCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <MorphMotion.Card state={expanded ? "b" : "a"}>
      {expanded ? (
        <ExpandedLayout onClose={() => setExpanded(false)} />
      ) : (
        <CompactLayout onOpen={() => setExpanded(true)} />
      )}
    </MorphMotion.Card>
  );
}
```

Mark shared elements in both states using the same `data-morph-id`:

```tsx
function CompactLayout() {
  return (
    <div>
      <img data-morph-id="thumb" src="..." alt="" />
      <h3 data-morph-id="title">Air Max Pulse</h3>
      <p data-morph-id="price">$149.00</p>
    </div>
  );
}

function ExpandedLayout() {
  return (
    <div>
      <img data-morph-id="thumb" src="..." alt="" className="w-full" />
      <h3 data-morph-id="title">Air Max Pulse</h3>
      <p data-morph-id="price">$149.00</p>
      <p>Extra details shown only in expanded state.</p>
    </div>
  );
}
```

## Markers reference

| Marker                           | Purpose                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `data-morph-id="..."`            | Explicit shared key for an element between state A and B. |
| `data-morph-all-id="..."`        | Auto-generates shared keys for an entire subtree.         |
| `data-morph-reveal`              | Forces an element into reveal animation.                  |
| `data-morph-ignore-reveal`       | Excludes element from reveal animation.                   |
| `data-morph-ignore-exit`         | Excludes element (and subtree) from the exit fade-out.    |
| `data-morph-reveal-delay="0.12"` | Adds explicit reveal delay in seconds.                    |

## Card config

```ts
// MorphCardConfig (shadcn) / MorphMotionCardConfig (npm) — same shape
type MorphCardConfig = {
  duration?: number;
  ease?: string | ((progress: number) => number);
  revealShift?: number;
  sharedBlur?: number;
  onStart?: () => void;
  onComplete?: () => void;
};
```

Example:

```tsx
<MorphMotion.Card
  state={expanded ? "b" : "a"}
  config={{
    duration: 0.55,
    ease: "power2.inOut",
    revealShift: 1.8,
    sharedBlur: 2,
  }}
>
  {expanded ? <ExpandedLayout /> : <CompactLayout />}
</MorphMotion.Card>
```

## Notes and limits

- Shared-element scanning is limited to the card wrapper subtree.
- Elements rendered through React portals are not included in shared scanning.
- `data-morph-all-id` works best when subtree structure and order stay similar across both states.

## Additional docs

- Package docs: [packages/morph-motion/README.md](./packages/morph-motion/README.md)
- Preview docs: [preview/shadcn-demo/README.md](./preview/shadcn-demo/README.md)
