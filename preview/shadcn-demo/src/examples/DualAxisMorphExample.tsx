import { useState } from "react"
import { CheckCircle2, Maximize2, Minimize2, Play, Share2 } from "lucide-react"
import { MorphCard } from "@/components/morph-motion/card"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

function CompactLayout({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      className="flex h-28 w-[min(92vw,20rem)] items-center gap-4 p-5"
      data-morph-id="studio-shell"
    >
      <div
        data-morph-id="studio-cover"
        className="relative size-14 overflow-hidden rounded-2xl bg-linear-to-br from-amber-300 via-orange-300 to-rose-300"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.75),transparent_55%)]" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          data-morph-id="studio-title"
          className="truncate text-base font-medium"
        >
          Creative sprint
        </p>
        <p
          data-morph-id="studio-meta"
          className="truncate text-xs text-muted-foreground"
        >
          2h focus block
        </p>
      </div>

      <Badge data-morph-id="studio-status" variant="secondary">
        Live
      </Badge>

      <Button
        data-morph-id="studio-toggle"
        size="icon-sm"
        variant="ghost"
        onClick={onOpen}
        aria-label="Expand workspace"
      >
        <Maximize2 data-morph-id="studio-toggle-icon" />
      </Button>
    </div>
  )
}

function ExpandedLayout({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex w-[min(92vw,42rem)] flex-col gap-5 p-6"
      data-morph-id="studio-shell"
    >
      <div className="flex items-start gap-4">
        <div
          data-morph-id="studio-cover"
          className="relative h-20 w-30 overflow-hidden rounded-2xl bg-linear-to-br from-amber-300 via-orange-300 to-rose-300"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.75),transparent_50%)]" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            data-morph-id="studio-title"
            className="text-xl font-semibold tracking-tight"
          >
            Creative sprint workspace
          </h3>
          <p
            data-morph-id="studio-meta"
            className="text-sm text-muted-foreground"
          >
            2h focus block, 4 checkpoints, 1 review pending
          </p>
          <Badge
            data-morph-id="studio-status"
            variant="secondary"
            className="mt-1 w-fit"
          >
            Live session
          </Badge>
        </div>

        <Button
          data-morph-id="studio-toggle"
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Collapse workspace"
        >
          <Minimize2 data-morph-id="studio-toggle-icon" />
        </Button>
      </div>

      <p
        className="text-sm leading-relaxed text-muted-foreground"
        data-morph-reveal-delay="0"
      >
        This variant expands in both axes: more width for side-by-side context
        and more height for details, actions, and status blocks.
      </p>

      <div className="grid gap-3 sm:grid-cols-2" data-morph-reveal-delay="0.08">
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Wireframes
            </p>
            <span className="text-xs font-semibold">82%</span>
          </div>
          <Progress value={82} />
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Prototype
            </p>
            <span className="text-xs font-semibold">64%</span>
          </div>
          <Progress value={64} />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" data-morph-reveal-delay="0.14">
        {[
          "Review interaction copy",
          "Polish onboarding motion",
          "Ship clickable prototype",
        ].map((task) => (
          <div
            key={task}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs"
          >
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span className="truncate">{task}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" data-morph-reveal-delay="0.22">
        <Button data-icon="inline-start">
          <Play />
          Resume session
        </Button>
        <Button variant="outline" data-icon="inline-start">
          <Share2 />
          Share board
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

export function DualAxisMorphExample() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex flex-col items-center gap-3">
      <Card className="w-fit max-w-full overflow-hidden p-0">
        <MorphCard
          state={expanded ? "b" : "a"}
          config={{ duration: 0.55, revealShift: 1.8, sharedBlur: 0 }}
        >
          {expanded ? (
            <ExpandedLayout onClose={() => setExpanded(false)} />
          ) : (
            <CompactLayout onOpen={() => setExpanded(true)} />
          )}
        </MorphCard>
      </Card>
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
