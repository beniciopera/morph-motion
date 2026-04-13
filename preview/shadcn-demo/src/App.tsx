import { DualAxisMorphExample } from "@/examples/DualAxisMorphExample"
import { ProductMorphExample } from "@/examples/ProductMorphExample"
import { ProfileMorphExample } from "@/examples/ProfileMorphExample"

export function App() {
  return (
    <div className="min-h-svh bg-muted/30 px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            morph-motion · playground
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Expandable card morph examples
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Toggle each card to watch shared elements (images, icons, titles,
            badges) flip into place while new content (descriptions, inputs,
            buttons) reveals with staggered delays. Press{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              d
            </kbd>{" "}
            to toggle dark mode.
          </p>
        </header>

        <section className="grid gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">Example 1 · Product card</h2>
              <p className="text-xs text-muted-foreground">
                Shared image, title, price and badge. Stars, description,
                quantity picker and CTAs reveal with increasing delays.
              </p>
            </div>
            <ProductMorphExample />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">Example 2 · Contact card</h2>
              <p className="text-xs text-muted-foreground">
                Shared avatar, name, role and status. Bio, social icons, form
                inputs and submit button stagger in over the shared morph.
              </p>
            </div>
            <ProfileMorphExample />
          </div>

          <div className="flex flex-col gap-4 md:col-span-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">
                Example 3 · Dual-axis panel
              </h2>
              <p className="text-xs text-muted-foreground">
                Compact dock expands both horizontally and vertically into a
                workspace panel with progress, checklist and actions.
              </p>
            </div>
            <DualAxisMorphExample />
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
