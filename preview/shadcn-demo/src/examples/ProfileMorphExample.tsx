import { useState } from "react"
import {
  AtSign,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Code2,
  Globe,
  MessageSquare,
  Send,
} from "lucide-react"
import { MorphMotion } from "morph-motion"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const AVATAR_URL =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80"

function CompactLayout({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center gap-4 p-4" data-morph-id="profile-card">
      <img
        data-morph-id="avatar"
        src={AVATAR_URL}
        alt="Alex Rivera"
        className="size-14 rounded-full object-cover ring-2 ring-primary/20"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 data-morph-id="profile-name" className="truncate font-medium">
          Alex Rivera
        </h3>
        <p
          data-morph-id="profile-role"
          className="truncate text-xs text-muted-foreground"
        >
          Senior Product Designer
        </p>
      </div>
      <Badge data-morph-id="profile-status" variant="secondary">
        Available
      </Badge>
      <Button
        data-morph-id="collapse-button"
        size="icon-sm"
        variant="ghost"
        onClick={onOpen}
        aria-label="Expand profile"
      >
        <ChevronDown data-morph-id="chevron" />
      </Button>
    </div>
  )
}

function ExpandedLayout({
  name,
  email,
  message,
  onNameChange,
  onEmailChange,
  onMessageChange,
  onClose,
}: {
  name: string
  email: string
  message: string
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onMessageChange: (value: string) => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col gap-5 p-6" data-morph-id="profile-card">
      <div className="flex items-start gap-4">
        <img
          data-morph-id="avatar"
          src={AVATAR_URL}
          alt="Alex Rivera"
          className="size-24 rounded-full object-cover ring-2 ring-primary/20"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            data-morph-id="profile-name"
            className="text-xl font-semibold tracking-tight"
          >
            Alex Rivera
          </h3>
          <p
            data-morph-id="profile-role"
            className="text-sm text-muted-foreground"
          >
            Senior Product Designer
          </p>
          <Badge
            data-morph-id="profile-status"
            variant="secondary"
            className="mt-1 w-fit"
          >
            Available
          </Badge>
        </div>
        <Button
          data-morph-id="collapse-button"
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Collapse profile"
        >
          <ChevronUp data-morph-id="chevron" />
        </Button>
      </div>

      <p
        className="text-sm leading-relaxed text-muted-foreground"
        data-morph-reveal-delay="0"
      >
        I help early-stage startups ship thoughtful product experiences. Based
        in Barcelona, available for new collaborations starting next month.
      </p>

      <div
        className="flex items-center gap-3 text-muted-foreground"
        data-morph-reveal-delay="0.05"
      >
        <a
          href="#"
          className="inline-flex size-8 items-center justify-center rounded-full border border-border hover:bg-muted"
          aria-label="Personal site"
        >
          <Globe className="size-4" />
        </a>
        <a
          href="#"
          className="inline-flex size-8 items-center justify-center rounded-full border border-border hover:bg-muted"
          aria-label="Code portfolio"
        >
          <Code2 className="size-4" />
        </a>
        <a
          href="#"
          className="inline-flex size-8 items-center justify-center rounded-full border border-border hover:bg-muted"
          aria-label="Work history"
        >
          <Briefcase className="size-4" />
        </a>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5" data-morph-reveal-delay="0.1">
          <label className="text-xs font-medium text-muted-foreground">
            Your name
          </label>
          <Input
            placeholder="Jane Doe"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5" data-morph-reveal-delay="0.16">
          <label className="text-xs font-medium text-muted-foreground">
            Email
          </label>
          <div className="relative">
            <AtSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5" data-morph-reveal-delay="0.22">
          <label className="text-xs font-medium text-muted-foreground">
            Message
          </label>
          <div className="relative">
            <MessageSquare className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
            <textarea
              placeholder="Tell me about your project…"
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              className="flex min-h-20 w-full resize-none rounded-2xl border border-input bg-transparent py-2.5 pr-3 pl-9 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2" data-morph-reveal-delay="0.3">
        <Button className="flex-1" data-icon="inline-start">
          <Send />
          Send message
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function ProfileMorphExample() {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden p-0">
          <MorphMotion.Card
            state={expanded ? "b" : "a"}
            config={{ duration: 0.4, revealShift: 2, sharedBlur: 0 }}
          >
            {expanded ? (
              <ExpandedLayout
                name={name}
                email={email}
                message={message}
                onNameChange={setName}
                onEmailChange={setEmail}
                onMessageChange={setMessage}
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
