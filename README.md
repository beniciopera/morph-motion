# morph-motion

A React 19 animation library built on GSAP, distributed as a **shadcn-style registry**. You own the source — the CLI copies each component into your project, where you are free to edit timing, ease, and DOM to your taste.

`morph-motion` is growing into a small, opinionated collection of motion primitives. Today it ships **one** component:

| Component     | Status | Description                                                                 |
| ------------- | ------ | --------------------------------------------------------------------------- |
| `<MorphCard>` | stable | Two-state card that morphs between `"a"` and `"b"` via shared-element FLIP. |

More primitives are on the roadmap. Every new component will follow the same contract: GSAP under the hood, a plain React surface, plain `data-*` markers, and full source ownership via the shadcn CLI.

> Full documentation lives at [`docs/index.md`](./docs/index.md). This README focuses on running the repo and building/hosting the registry.

## MorphCard — what it does

`<MorphCard>` animates transitions between exactly two states (`"a"` and `"b"`) and combines:

- Shared-element FLIP for elements marked as shared.
- Progressive reveal/hide for non-shared content.
- Optional blur pulse on shared elements (`sharedBlur`).
- Reduced-motion fallback via `prefers-reduced-motion`.
- Interruption handling for fast repeated toggles.

## Repository structure

```text
.
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

## Basic usage

```tsx
import { useState } from "react";
import { MorphCard } from "@/components/morph-motion/card";

export function ProductCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <MorphCard state={expanded ? "b" : "a"}>
      {expanded ? (
        <Expanded onClose={() => setExpanded(false)} />
      ) : (
        <Compact onOpen={() => setExpanded(true)} />
      )}
    </MorphCard>
  );
}
```

Mark shared elements in both layouts with the same `data-morph-id` and everything else reveals in sequence. See the [full docs](./docs/index.md#morphcard) for markers, config, examples, and recommendations.

## Documentation

- **[`docs/index.md`](./docs/index.md)** — full library documentation (components, API, markers, examples, recommendations, troubleshooting).
- **[`preview/shadcn-demo/README.md`](./preview/shadcn-demo/README.md)** — preview app notes.
