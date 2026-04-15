# morph-motion

A React 19 animation library built on GSAP, distributed as a shadcn-style registry. You own the source — copy the pieces you need into your project and edit them freely.

`morph-motion` is growing into a small, opinionated collection of motion primitives. Today it ships **one** component:

- **`<MorphCard>`** — a two-state card that morphs between `"a"` and `"b"` layouts. Shared elements glide from their old box to the new one using GSAP Flip; everything else fades and reveals in the correct order.

More components will land as the library grows. Each new primitive will follow the same contract: **copy the source, own it, tweak it**.

---

## Table of contents

- [Library overview](#library-overview)
  - [Style-agnostic by design](#style-agnostic-by-design)
- [Components](#components)
  - [MorphCard](#morphcard)
    - [When to use it](#when-to-use-it)
    - [Quickstart](#quickstart)
    - [Core concepts](#core-concepts)
    - [API reference](#api-reference)
    - [Markers](#markers)
    - [Examples](#examples)
    - [Recommendations](#recommendations)
    - [Accessibility](#accessibility)
    - [Limitations](#limitations)
    - [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

---

## Library overview

`morph-motion` is a **component library**, not a runtime package. There is no `import { X } from "morph-motion"`. Instead, the registry CLI copies the source of each component into your project, and you import it from your own alias paths (`@/components/...`, `@/hooks/...`).

This gives you three things:

1. **Ownership** — edit timing, ease, DOM structure, anything. No upstream surprises.
2. **Tree-shaking by default** — you only install the components you actually use.
3. **No version drift** — the code in your repo is the code that ships. Upgrading is a deliberate, file-level decision.

Every component in `morph-motion` shares the same peer dependencies: `gsap` and `@gsap/react`. The registry CLI installs them automatically on the first `add`.

### Style-agnostic by design

`morph-motion` is a **motion library, not a UI kit**. It is completely style-agnostic:

- **No CSS is shipped.** Components render plain semantic elements (`<div>`, `<section>`, `<img>`) with no `className`, no inline styles, and no injected stylesheets.
- **No Tailwind or design tokens required.** You are free to use Tailwind, vanilla CSS, CSS Modules, CSS-in-JS, or anything else — `morph-motion` does not care.
- **No dependency on shadcn/ui components.** The library is distributed *via* the shadcn registry CLI because that tooling is the best "copy source into my repo" delivery mechanism available today. It does **not** depend on shadcn/ui's component library, nor on its Tailwind preset, color tokens, or theme variables.
- **You bring the look.** `morph-motion` only animates the layouts you write. Compose it with whatever design system you already have.

In short: the library handles **motion and choreography**. The look-and-feel is always yours.

---

## Components

The library currently exposes a single component. Each component is documented as its own section.

| Component     | Status   | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| `<MorphCard>` | stable   | Two-state card that morphs between `"a"` and `"b"` via shared-element FLIP. |

---

## MorphCard

A controlled component that animates a subtree between **exactly two layouts**. Shared elements morph in place via GSAP Flip; non-shared elements fade and reveal in a coordinated sequence.

### When to use it

Use `<MorphCard>` when:

- You have a card, panel, or container that switches between **two distinct layouts** (compact ↔ expanded, list ↔ detail, closed ↔ open).
- Some elements appear in **both** layouts and should animate between their old and new position/size (hero image, title, price, avatar).
- Other elements only exist in **one** layout and should fade/shift in or out in coordination with the shared-element morph.

Do **not** use it when:

- You need more than two states (build a state machine and wire transitions explicitly).
- You need entrance animations for a list of items on scroll — that is `ScrollTrigger` + `stagger` territory.
- You need route transitions — use the router's own transition primitives.

### Install

Install via the shadcn CLI. It copies the source into your project and installs `gsap` + `@gsap/react` with your package manager.

```bash
npx shadcn@latest add https://<your-host>/r/morph-card.json
```

Or install **just the hook** if you want to build your own wrapper component:

```bash
npx shadcn@latest add https://<your-host>/r/flip-morph.json
```

Files land at:

```text
hooks/use-flip-morph.ts
hooks/register-flip.ts
components/morph-motion/card.tsx
```

You **own** the code. Rename files, tweak timings, swap the ease — it is yours.

Manual install: `npm install gsap @gsap/react`, then copy `registry/hooks/use-flip-morph.ts`, `registry/hooks/register-flip.ts`, and `registry/components/morph-motion/card.tsx` from this repo and adjust the import paths to your aliases.

### Quickstart

The canonical example is a **product card** that expands from a compact row into a full detail view. The image, badge, title, price, and toggle button are shared across both states — they morph in place. The stars, description, and action buttons exist only in the expanded state and reveal in sequence after the shared morph.

```tsx
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MorphCard } from "@/components/morph-motion/card";

const PRODUCT_IMAGE = "https://example.com/air-max-pulse.jpg";

export function ProductCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="w-full max-w-sm overflow-hidden p-0">
      <MorphCard
        state={expanded ? "b" : "a"}
        config={{ duration: 0.45, revealShift: 1.5, sharedBlur: 2 }}
      >
        {expanded ? (
          <Expanded onClose={() => setExpanded(false)} />
        ) : (
          <Compact onOpen={() => setExpanded(true)} />
        )}
      </MorphCard>
    </Card>
  );
}

function Compact({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <img
        data-morph-id="product-image"
        src={PRODUCT_IMAGE}
        alt="Air Max Pulse"
        className="size-20 rounded-2xl object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Badge data-morph-id="product-badge" variant="secondary" className="w-fit">
          New arrival
        </Badge>
        <h3 data-morph-id="product-title" className="truncate font-medium">
          Air Max Pulse
        </h3>
        <p data-morph-id="product-price" className="text-sm font-semibold text-primary">
          $149.00
        </p>
      </div>
      <Button
        data-morph-id="product-toggle"
        size="icon-sm"
        variant="secondary"
        onClick={onOpen}
        aria-label="Expand product"
      >
        <Plus data-morph-id="product-toggle-icon" />
      </Button>
    </div>
  );
}

function Expanded({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col">
      <img
        data-morph-id="product-image"
        src={PRODUCT_IMAGE}
        alt="Air Max Pulse"
        className="h-64 w-full object-cover"
      />
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <Badge data-morph-id="product-badge" variant="secondary" className="w-fit">
              New arrival
            </Badge>
            <h3 data-morph-id="product-title" className="text-2xl font-semibold tracking-tight">
              Air Max Pulse
            </h3>
            <p data-morph-id="product-price" className="text-lg font-semibold text-primary">
              $149.00
            </p>
          </div>
          <Button
            data-morph-id="product-toggle"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Collapse product"
          >
            <Minus data-morph-id="product-toggle-icon" />
          </Button>
        </div>

        <div className="flex items-center gap-1 text-amber-500" data-morph-reveal-delay="0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-4 fill-amber-500" />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">(128 reviews)</span>
        </div>

        <p
          className="text-sm leading-relaxed text-muted-foreground"
          data-morph-reveal-delay="0.05"
        >
          Responsive cushioning meets a breathable knit upper. Designed for all-day
          comfort on city streets and studio floors alike.
        </p>

        <Button className="flex-1" data-morph-reveal-delay="0.18" data-icon="inline-start">
          <ShoppingBag />
          Add to bag
        </Button>
      </div>
    </div>
  );
}
```

Five elements are shared (`product-image`, `product-badge`, `product-title`, `product-price`, `product-toggle` — plus the nested `product-toggle-icon` that morphs from `Plus` to `Minus`). The star row, description, and "Add to bag" button exist only in state `"b"`, so they reveal **after** the shared morph finishes, staggered by the explicit `data-morph-reveal-delay` values.

The full version of this example (with quantity stepper and extra actions) lives in [`preview/shadcn-demo/src/examples/ProductMorphExample.tsx`](../preview/shadcn-demo/src/examples/ProductMorphExample.tsx).

---

### Core concepts

#### Two-state model

`MorphCard` is **controlled**. You pass `state="a" | "b"` and render the children for that state. The hook does not own the state — your component does. This makes it trivial to drive from URL params, global stores, or forms.

```tsx
<MorphCard state={open ? "b" : "a"}>{open ? <B /> : <A />}</MorphCard>
```

#### Shared elements

An element is **shared** when it exists in both state A and state B and should animate between them. Mark it with the same `data-morph-id` in both layouts:

```tsx
<img data-morph-id="hero" ... />
```

Under the hood the hook captures a GSAP Flip snapshot before the state change, swaps the DOM, then animates from the old rect to the new rect.

#### Reveal & exit

Elements that exist **only** in the destination state get a "reveal" animation (fade + optional shift). Elements that existed **only** in the source state get an "exit" animation via a cloned overlay so the outgoing content doesn't cause layout collapse during the morph.

#### Wrapper height

The wrapper div tweens its own height from the old measurement to the new one. This keeps the card shell from snapping to the final size before the inner morph finishes, which is the single biggest source of visual jank in shared-element animations.

---

### API reference

#### `<MorphCard>`

```ts
type MorphCardProps = {
  state: "a" | "b";
  config?: MorphCardConfig;
  children: ReactNode;
};
```

| Prop       | Type               | Required | Description                                                        |
| ---------- | ------------------ | -------- | ------------------------------------------------------------------ |
| `state`    | `"a" \| "b"`       | yes      | Which layout is currently rendered. Drives the morph when it flips.|
| `config`   | `MorphCardConfig`  | no       | Timing, ease, shift, blur, and lifecycle callbacks.                |
| `children` | `ReactNode`        | yes      | The layout for the current `state`.                                |

#### `MorphCardConfig`

```ts
type MorphCardConfig = {
  duration?: number;                            // default 0.45
  ease?: string | ((progress: number) => number); // GSAP ease, default is the hook's internal curve
  revealShift?: number;                         // px translation for reveal-in elements
  sharedBlur?: number;                          // peak blur (px) on shared elements mid-morph
  onStart?: () => void;
  onComplete?: () => void;
};
```

| Field         | Default  | Description                                                                                              |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `duration`    | `0.45`   | Total morph duration in seconds. Reveal/exit sub-timelines scale from this.                              |
| `ease`        | internal | Any GSAP ease string (`"power2.inOut"`, `"expo.out"`, …) or a custom function `(t) => number`.           |
| `revealShift` | auto     | Horizontal offset (px) applied to reveal-in elements before they fade in. Set to `0` for pure fades.     |
| `sharedBlur`  | `0`      | Peak blur (px) layered on shared elements at the midpoint of the morph. Set to `1–3` for a softer feel.  |
| `onStart`     | —        | Called when the morph timeline begins.                                                                   |
| `onComplete`  | —        | Called when the morph timeline finishes (not called on reduced-motion or no-op state changes).           |

#### `useFlipMorph` (advanced)

If you want a custom wrapper element (e.g. a `<section>` instead of the default `<div>`), use the hook directly:

```tsx
import { useRef } from "react";
import "@/hooks/register-flip";
import { useFlipMorph, type MorphCardState } from "@/hooks/use-flip-morph";

export function CustomMorph({ state, children }: { state: MorphCardState; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFlipMorph(ref, state, { duration: 0.6, ease: "power3.inOut" });
  return <section ref={ref}>{children}</section>;
}
```

`register-flip.ts` registers the GSAP Flip plugin once per client. Import it wherever you use `useFlipMorph`.

---

### Markers

All markers are plain `data-*` attributes — no imports, no context providers.

| Marker                           | Scope         | Purpose                                                                                        |
| -------------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `data-morph-id="key"`            | single element| Explicit shared key. Must appear on exactly one element in each state.                         |
| `data-morph-all-id="key"`        | subtree       | Auto-generates shared keys for every descendant by structural path. Great for repeating lists. |
| `data-morph-reveal`              | single element| Forces an element into the reveal-in animation even if structural detection missed it.        |
| `data-morph-ignore-reveal`       | single element| Excludes an element from reveal, useful for things that should simply appear.                  |
| `data-morph-ignore-exit`         | subtree       | Excludes an element (and its descendants) from the exit-fade clone overlay.                    |
| `data-morph-reveal-delay="0.12"` | single element| Adds an explicit reveal delay in seconds. Overrides the auto-sequenced delay.                  |

#### `data-morph-id` vs `data-morph-all-id`

- Use **`data-morph-id`** when you have a handful of named shared elements (title, thumbnail, CTA). It is explicit and resistant to DOM churn.
- Use **`data-morph-all-id`** when an entire subtree's structure is preserved between states and you just want every matching descendant to flow naturally. Prefer it for grids, lists, and repeating rows.

Do not mix the two on the same element — `data-morph-id` always wins.

---

### Examples

#### 1. Basic expand/collapse

```tsx
const [open, setOpen] = useState(false);

<MorphCard state={open ? "b" : "a"}>
  {open ? (
    <Detail onClose={() => setOpen(false)} />
  ) : (
    <Summary onOpen={() => setOpen(true)} />
  )}
</MorphCard>
```

#### 2. Tuning timing and feel

```tsx
<MorphCard
  state={open ? "b" : "a"}
  config={{
    duration: 0.55,
    ease: "power2.inOut",
    revealShift: 1.8,
    sharedBlur: 2,
    onStart: () => console.log("morphing…"),
    onComplete: () => console.log("done"),
  }}
>
  {open ? <Detail /> : <Summary />}
</MorphCard>
```

**Recommendation**: start from defaults. Only reach for `ease` and `sharedBlur` after you have seen the morph run at full speed on a real device.

#### 3. Auto-keyed subtrees (`data-morph-all-id`)

```tsx
<MorphCard state={state}>
  <ul data-morph-all-id="row">
    {items.map((item) => (
      <li key={item.id}>
        <img src={item.image} />
        <span>{item.label}</span>
      </li>
    ))}
  </ul>
</MorphCard>
```

Every descendant of the `<ul>` gets an automatic shared key derived from its structural path. As long as the same shape appears in the other state, the hook will find matching pairs.

#### 4. Explicit reveal delay

```tsx
<div>
  <img data-morph-id="hero" src="..." />
  <h2 data-morph-id="title">...</h2>
  <p data-morph-reveal-delay="0.18">Appears 180ms after the shared morph starts.</p>
  <p data-morph-reveal-delay="0.24">And this one 60ms later.</p>
</div>
```

Use explicit delays sparingly. The auto-sequencer already staggers reveal targets based on DOM order.

#### 5. Excluding a subtree from exit

```tsx
{state === "a" && (
  <div data-morph-ignore-exit>
    {/* Will vanish without a fade clone — useful for portals, tooltips,
        or elements that should not linger on the outgoing layer. */}
  </div>
)}
```

#### 6. Custom wrapper via the hook

```tsx
function Panel({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useFlipMorph(ref as React.RefObject<HTMLDivElement>, open ? "b" : "a", {
    duration: 0.5,
    ease: "power2.out",
  });
  return <section ref={ref} className="rounded-2xl border">{children}</section>;
}
```

---

### Recommendations

1. **Match structure across states.** The shared-element algorithm matches by marker, not by React key. The less the wrapping DOM changes between states, the smoother the morph.
2. **Keep shared elements small and identifiable.** A title, a thumbnail, a badge. Trying to share a 200-node grid through `data-morph-id` is a losing battle — use `data-morph-all-id` instead.
3. **Animate the *layout*, not the *content*.** Let morph-motion handle position/size; let React re-render children. Do not try to animate text content or conditional content with this tool.
4. **Avoid nested `MorphCard`s** unless you have a very good reason. If a child card morphs while the parent is also morphing, the two timelines will fight over the same elements.
5. **Start with default duration (`0.45s`).** It is tuned against real user perception tests. Shorter feels janky; longer feels sluggish.
6. **Prefer `power2.inOut` or the default ease.** Elastic and bounce eases look terrible on shared-element morphs because they violate the physical metaphor.
7. **Keep `revealShift` between `0` and `4`.** Larger values feel drifty.
8. **Use `sharedBlur` to mask imperfect morphs.** `1–3px` of peak blur hides sub-pixel misalignment on shared elements whose aspect ratio changes.
9. **Don't wrap `MorphCard` in a `transition-all` container.** The hook neutralizes CSS transitions inside the wrapper, but a parent with its own transition can still stutter the height tween.
10. **Measure on real devices.** A morph that looks fine in Chrome DevTools at 4x slowdown can still drop frames on mid-tier Android. Test before shipping.

---

### Accessibility

`morph-motion` respects `prefers-reduced-motion`:

- When the user has reduced motion enabled, the shared-element Flip animation is skipped and the layout swap happens instantly with a minimal crossfade.
- `onStart` / `onComplete` are not invoked for the reduced-motion path.
- Focus is not moved automatically. If you rely on focus for the open/close UX, manage it yourself inside your state handlers.

Always test with **System Settings → Accessibility → Display → Reduce Motion** (macOS) or the equivalent on your OS.

---

### Limitations

- **Exactly two states.** Three-way morphs are not supported.
- **Shared-element scanning is limited to the card wrapper subtree.** Elements outside the wrapper are invisible to the hook.
- **React portals are not scanned.** Portalled content cannot participate in shared-element morphs.
- **No SSR morph.** The hook only runs on the client. First paint shows the current state without animation, which is the correct behaviour.
- **`data-morph-all-id` depends on structural similarity.** If the subtree structure differs significantly between states, auto-keyed matches will fall apart. Fall back to explicit `data-morph-id`.
- **Rapid toggling is de-bounced by interruption handling.** Interrupting a morph mid-flight kills the in-flight timeline and starts a new one from the current visual state.

---

### Troubleshooting

**"My shared element jumps instead of morphing."**
Check that both states render the **same** `data-morph-id`. Typos are the #1 cause. Also check that the element is inside the `MorphCard` wrapper — portals and fixed overlays are invisible to the scan.

**"The card snaps to the new height instead of tweening."**
Something in the parent chain is overriding the wrapper's inline `height`. Look for `height: auto !important`, `display: contents`, or a parent flex container with `align-items: stretch` and a fixed cross-axis size.

**"My reveal-in content flickers."**
You probably have a CSS transition on `opacity` or `transform` on the revealing element. The hook neutralizes transitions inside the wrapper at morph start, but if your transition is defined on a parent outside the wrapper it will still fire.

**"Non-shared elements disappear instantly instead of fading out."**
Make sure they do not have `data-morph-ignore-exit` applied by an ancestor. Also check that your state change actually unmounts them — if they remain in the DOM across states the hook cannot tell they are "leaving".

**"Animation feels slow on mobile."**
Lower `duration` to `0.35`, drop `sharedBlur` to `0`, and profile in the device's real browser. `filter: blur()` is expensive on low-end GPUs.

**"The wrapper's first render has no animation."**
That is intentional. `morph-motion` only animates **transitions between states**, not the initial mount. If you want an entrance animation on mount, layer a separate `gsap.from()` on top.

---

## Roadmap

`morph-motion` is in its earliest stage. `<MorphCard>` is the first component and the template the rest of the library will follow: **GSAP under the hood, a plain React surface, plain `data-*` markers where possible, and full source ownership via the shadcn CLI**.

Planned directions (not commitments — things get dropped when they do not pull their weight):

- Additional motion primitives that compose with the same markers (`data-morph-id`, `data-morph-reveal`) so you can mix them in a single scene.
- Scroll-linked variants for the existing two-state morph.
- Higher-level presets that wrap common card layouts (product, profile, detail) so you can drop them in without writing the two states by hand.

If you have a component request, open an issue — the bar is "it should feel obviously correct once you see it."

---

## Further reading

- [GSAP Flip plugin docs](https://gsap.com/docs/v3/Plugins/Flip/)
- [`useGSAP` hook](https://gsap.com/resources/React/)
- [shadcn/ui registry spec](https://ui.shadcn.com/docs/registry)
