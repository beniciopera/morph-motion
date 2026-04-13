# morph-motion

Two-state shadcn Card morphs powered by GSAP Flip.

## Install

```bash
npm install morph-motion gsap @gsap/react react
```

## Usage

```tsx
import { MorphMotion } from "morph-motion";

function ProductCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <MorphMotion.Card state={isExpanded ? "b" : "a"}>
      {isExpanded ? <ExpandedLayout /> : <CompactLayout />}
    </MorphMotion.Card>
  );
}
```

Tag only shared elements with `data-morph-motion-id` in both states:

```tsx
function CompactLayout() {
  return (
    <div>
      <img data-morph-id="thumb" src="..." />
      <h3 data-morph-id="title">Product Name</h3>
      <p data-morph-id="price">$99</p>
    </div>
  );
}

function ExpandedLayout() {
  return (
    <div>
      <img data-morph-id="thumb" src="..." style={{ width: 300 }} />
      <h3 data-morph-id="title">Product Name</h3>
      <p data-morph-id="price">$99</p>
      <p>Full description here.</p>
    </div>
  );
}
```

morph-motion automatically maps each `data-morph-motion-id` to GSAP's `data-flip-id` under the hood, so shared elements are matched correctly even when React remounts nodes between states.

To reduce markup noise, you can mark a whole subtree as shared with `data-all-morph-motion-id`:

```tsx
function CompactLayout() {
  return (
    <div data-morph-all-id="product-head">
      <div className="icon" />
      <h3>Product Name</h3>
      <p>$99</p>
    </div>
  );
}

function ExpandedLayout() {
  return (
    <div data-morph-all-id="product-head">
      <div className="icon" />
      <h3>Product Name</h3>
      <p>$99</p>
    </div>
  );
}
```

Rules for `data-all-morph-motion-id`:

- morph-motion generates stable internal shared keys per subtree path.
- `data-morph-motion-id` always wins over auto-generated keys.
- Keep subtree structure/order stable between states for best matching results.
- If the same base is reused multiple times, keep relative order stable between states.

Defaults are automatic:

- Only card shell + shared elements (`data-morph-motion-id`) morph position/size.
- Non-shared elements render progressively with automatic delay.
- New content starts with strong blur and resolves in stages to full sharpness.
- The same progressive reveal behavior applies when collapsing.
- During morph, morph-motion keeps pending reveal content in flow and locks parent min-height to avoid early layout gap stealing.

Elements without `data-morph-motion-id` are treated as non-shared content and are revealed automatically.

Optional advanced markers:

- `data-all-morph-motion-id`: mark one element and its full subtree as shared.
- `data-morph-reveal`: force an element to participate in progressive reveal.
- `data-morph-ignore-reveal`: exclude an element from progressive reveal.
- `data-morph-reveal-delay`: optional delay in seconds from the start of the reveal phase for non-shared elements. If omitted, morph-motion uses the automatic right-to-left sweep.

## Config

```ts
type MorphMotionCardConfig = {
  duration?: number;
  ease?: string | EaseFunction;
  revealShift?: number;
  onStart?: () => void;
  onComplete?: () => void;
};
```

`config` is optional. If omitted, morph-motion uses production defaults.

```tsx
<MorphMotion.Card
  state={isExpanded ? "b" : "a"}
  config={{ duration: 0.6, ease: "power2.inOut", revealShift: 2.5 }}
>
  {isExpanded ? <ExpandedLayout /> : <CompactLayout />}
</MorphMotion.Card>
```

Custom reveal delay example:

```tsx
<p data-morph-reveal-delay="0">Appears at the start of the reveal phase</p>
<p data-morph-reveal-delay="0.1">Appears 100ms later</p>
<p data-morph-reveal-delay="0.5">Appears 500ms later</p>
```

If `data-morph-reveal-delay` is missing or invalid, morph-motion falls back to the automatic right-to-left reveal order. Negative values are clamped to `0`.

## Scope Limits

- No backdrop blur outside the card is applied by morph-motion.
- Shared-element scanning does not cross React portals.
- `data-all-morph-motion-id` assumes similar subtree order between both states.

**Note**: Elements inside React portals are not reachable by the shared-element scanner (`querySelectorAll` is scoped to the wrapper div).
