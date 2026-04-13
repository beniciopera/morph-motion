import { useState } from "react"
import { Heart, Share2, Star, ShoppingBag, Minus, Plus } from "lucide-react"
import { MorphMotion } from "morph-motion"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80"

function CompactLayout({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <img
        data-morph-id="product-image"
        src={PRODUCT_IMAGE}
        alt="Air Max sneaker"
        className="size-20 rounded-2xl object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Badge
          data-morph-id="product-badge"
          variant="secondary"
          className="w-fit"
        >
          New arrival
        </Badge>
        <h3
          data-morph-id="product-title"
          className="truncate text-base font-medium"
        >
          Air Max Pulse
        </h3>
        <p
          data-morph-id="product-price"
          className="text-sm font-semibold text-primary"
        >
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
  )
}

function ExpandedLayout({
  quantity,
  onQuantityChange,
  onClose,
}: {
  quantity: number
  onQuantityChange: (next: number) => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col">
      <img
        data-morph-id="product-image"
        src={PRODUCT_IMAGE}
        alt="Air Max sneaker"
        className="h-64 w-full object-cover"
      />
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <Badge
              data-morph-id="product-badge"
              variant="secondary"
              className="w-fit"
            >
              New arrival
            </Badge>
            <h3
              data-morph-id="product-title"
              className="text-2xl font-semibold tracking-tight"
            >
              Air Max Pulse
            </h3>
            <p
              data-morph-id="product-price"
              className="text-lg font-semibold text-primary"
            >
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

        <div
          className="flex items-center gap-1 text-amber-500"
          data-morph-reveal-delay="0"
        >
          <Star className="size-4 fill-amber-500" />
          <Star className="size-4 fill-amber-500" />
          <Star className="size-4 fill-amber-500" />
          <Star className="size-4 fill-amber-500" />
          <Star className="size-4 fill-amber-500" />
          <span className="ml-2 text-xs text-muted-foreground">
            (128 reviews)
          </span>
        </div>

        <p
          className="text-sm leading-relaxed text-muted-foreground"
          data-morph-reveal-delay="0.05"
        >
          Responsive cushioning meets a breathable knit upper. Designed for
          all-day comfort on city streets and studio floors alike.
        </p>

        <div className="flex items-center gap-3" data-morph-reveal-delay="0.12">
          <span className="text-xs font-medium text-muted-foreground">
            Quantity
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="icon-xs"
              variant="outline"
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
            >
              <Minus />
            </Button>
            <Input
              type="number"
              value={quantity}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (Number.isFinite(next) && next > 0) {
                  onQuantityChange(next)
                }
              }}
              className="h-8 w-14 text-center"
            />
            <Button
              size="icon-xs"
              variant="outline"
              onClick={() => onQuantityChange(quantity + 1)}
              aria-label="Increase quantity"
            >
              <Plus />
            </Button>
          </div>
        </div>

        <div className="flex gap-2" data-morph-reveal-delay="0.18">
          <Button className="flex-1" data-icon="inline-start">
            <ShoppingBag />
            Add to bag
          </Button>
          <Button size="icon" variant="outline" aria-label="Add to wishlist">
            <Heart />
          </Button>
          <Button size="icon" variant="outline" aria-label="Share product">
            <Share2 />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ProductMorphExample() {
  const [expanded, setExpanded] = useState(false)
  const [quantity, setQuantity] = useState(1)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden p-0">
          <MorphMotion.Card
            state={expanded ? "b" : "a"}
            config={{ duration: 0.55, revealShift: 1.5, sharedBlur: 2 }}
          >
            {expanded ? (
              <ExpandedLayout
                quantity={quantity}
                onQuantityChange={setQuantity}
                onClose={() => setExpanded(false)}
              />
            ) : (
              <CompactLayout onOpen={() => setExpanded(true)} />
            )}
          </MorphMotion.Card>
        </Card>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setExpanded((prev) => !prev)}
      >
        Toggle ({expanded ? "expanded" : "compact"})
      </Button>
    </div>
  )
}
