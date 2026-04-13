# smoothy

Two-state shadcn Card morphs powered by GSAP Flip.

## Install

```bash
npm install smoothy gsap @gsap/react react
```

## Usage

```tsx
import { Smoothy } from "smoothy";

function ProductCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Smoothy.Card state={isExpanded ? "b" : "a"}>
      {isExpanded ? <ExpandedLayout /> : <CompactLayout />}
    </Smoothy.Card>
  );
}
```

Tag only shared elements with `data-smoothy-id` in both states:

```tsx
function CompactLayout() {
  return (
    <div>
      <img data-smoothy-id="thumb" src="..." />
      <h3 data-smoothy-id="title">Product Name</h3>
      <p data-smoothy-id="price">$99</p>
    </div>
  );
}

function ExpandedLayout() {
  return (
    <div>
      <img data-smoothy-id="thumb" src="..." style={{ width: 300 }} />
      <h3 data-smoothy-id="title">Product Name</h3>
      <p data-smoothy-id="price">$99</p>
      <p>Full description here.</p>
    </div>
  );
}
```

smoothy automatically maps each `data-smoothy-id` to GSAP's `data-flip-id` under the hood, so shared elements are matched correctly even when React remounts nodes between states.

To reduce markup noise, you can mark a whole subtree as shared with `data-all-smoothy-id`:

```tsx
function CompactLayout() {
  return (
    <div data-all-smoothy-id="product-head">
      <div className="icon" />
      <h3>Product Name</h3>
      <p>$99</p>
    </div>
  );
}

function ExpandedLayout() {
  return (
    <div data-all-smoothy-id="product-head">
      <div className="icon" />
      <h3>Product Name</h3>
      <p>$99</p>
    </div>
  );
}
```

Rules for `data-all-smoothy-id`:

- smoothy generates stable internal shared keys per subtree path.
- `data-smoothy-id` always wins over auto-generated keys.
- Keep subtree structure/order stable between states for best matching results.
- If the same base is reused multiple times, keep relative order stable between states.

Defaults are automatic:

- Only card shell + shared elements (`data-smoothy-id`) morph position/size.
- Non-shared elements render progressively with automatic delay.
- New content starts with strong blur and resolves in stages to full sharpness.
- The same progressive reveal behavior applies when collapsing.
- During morph, smoothy keeps pending reveal content in flow and locks parent min-height to avoid early layout gap stealing.

Elements without `data-smoothy-id` are treated as non-shared content and are revealed automatically.

Optional advanced markers:

- `data-all-smoothy-id`: mark one element and its full subtree as shared.
- `data-smoothy-reveal`: force an element to participate in progressive reveal.
- `data-smoothy-ignore-reveal`: exclude an element from progressive reveal.

## Config

```ts
type SmoothyCardConfig = {
  duration?: number;
  ease?: string | EaseFunction;
  onStart?: () => void;
  onComplete?: () => void;
};
```

`config` is optional. If omitted, smoothy uses production defaults.

```tsx
<Smoothy.Card
  state={isExpanded ? "b" : "a"}
  config={{ duration: 0.6, ease: "power2.inOut" }}
>
  {isExpanded ? <ExpandedLayout /> : <CompactLayout />}
</Smoothy.Card>
```

## Scope Limits

- No backdrop blur outside the card is applied by smoothy.
- Shared-element scanning does not cross React portals.
- `data-all-smoothy-id` assumes similar subtree order between both states.

**Note**: Elements inside React portals are not reachable by the shared-element scanner (`querySelectorAll` is scoped to the wrapper div).
