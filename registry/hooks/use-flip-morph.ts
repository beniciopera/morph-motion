"use client";
import { useRef, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Flip } from "gsap/dist/Flip";

type EaseLike = (progress: number) => number;

export type MorphCardState = "a" | "b";

export type MorphCardConfig = {
  duration?: number;
  ease?: string | EaseLike;
  revealShift?: number;
  sharedBlur?: number;
  onStart?: () => void;
  onComplete?: () => void;
};

type SharedSnapshot = {
  state: Flip.FlipState | null;
  ids: Set<string>;
  wrapperHeight: number;
};

type SharedEntry = {
  element: HTMLElement;
  key: string;
};

type LeavingSnapshot = {
  container: HTMLDivElement;
  clones: HTMLElement[];
};

type RevealCue = {
  element: HTMLElement;
  threshold: number;
  explicitDelay: number | null;
};

const AUTO_SHARED_KEY_ATTR = "data-morph-auto-id";
const MANAGED_FLIP_ATTR = "data-morph-managed-flip";
const REVEAL_DELAY_ATTR = "data-morph-reveal-delay";

function getEffectiveSharedKey(el: HTMLElement): string | null {
  const explicit = el.dataset.morphId?.trim();
  if (explicit) return explicit;

  const auto = el.getAttribute(AUTO_SHARED_KEY_ATTR)?.trim();
  if (!auto) return null;

  return auto;
}

function getDepthWithinWrapper(
  wrapper: HTMLDivElement,
  element: HTMLElement,
): number {
  let depth = 0;
  let current = element.parentElement;

  while (current && current !== wrapper) {
    depth += 1;
    current = current.parentElement;
  }

  return depth;
}

function clearManagedSharedAttrs(wrapper: HTMLDivElement): void {
  const autoNodes = Array.from(
    wrapper.querySelectorAll<HTMLElement>(`[${AUTO_SHARED_KEY_ATTR}]`),
  );
  autoNodes.forEach((el) => {
    el.removeAttribute(AUTO_SHARED_KEY_ATTR);
  });

  const managedFlipNodes = Array.from(
    wrapper.querySelectorAll<HTMLElement>(`[${MANAGED_FLIP_ATTR}]`),
  );
  managedFlipNodes.forEach((el) => {
    el.removeAttribute(MANAGED_FLIP_ATTR);
    el.removeAttribute("data-flip-id");
  });
}

function addAutoSharedEntries(
  wrapper: HTMLDivElement,
  sharedByElement: Map<HTMLElement, string>,
): void {
  const containerOrderByBase = new Map<HTMLElement, number>();
  const baseCounters = new Map<string, number>();

  Array.from(
    wrapper.querySelectorAll<HTMLElement>("[data-morph-all-id]"),
  ).forEach((element) => {
    const base = element.getAttribute("data-morph-all-id")?.trim();
    if (!base) return;

    const instance = baseCounters.get(base) ?? 0;
    containerOrderByBase.set(element, instance);
    baseCounters.set(base, instance + 1);
  });

  const containers = Array.from(
    wrapper.querySelectorAll<HTMLElement>("[data-morph-all-id]"),
  )
    .map((element) => ({
      element,
      depth: getDepthWithinWrapper(wrapper, element),
      containerInstance: containerOrderByBase.get(element) ?? 0,
    }))
    .sort((a, b) => b.depth - a.depth);

  const visit = (
    node: HTMLElement,
    base: string,
    containerInstance: number,
    path: string,
  ): void => {
    if (node.tagName === "SCRIPT" || node.tagName === "STYLE") return;

    const key = `all:${base}:${containerInstance}:${path}`;
    const explicit = node.dataset.morphId?.trim();
    if (!explicit && !sharedByElement.has(node)) {
      sharedByElement.set(node, key);
    }

    if (!explicit) {
      const resolved = sharedByElement.get(node);
      if (resolved) {
        node.setAttribute(AUTO_SHARED_KEY_ATTR, resolved);
      }
    }

    Array.from(node.children).forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;
      visit(child, base, containerInstance, `${path}.${index}`);
    });
  };

  containers.forEach(({ element, containerInstance }) => {
    const base = element.getAttribute("data-morph-all-id")?.trim();
    if (!base) return;
    visit(element, base, containerInstance, "root");
  });
}

function getSharedEntries(wrapper: HTMLDivElement | null): SharedEntry[] {
  if (!wrapper) return [];

  clearManagedSharedAttrs(wrapper);

  const sharedByElement = new Map<HTMLElement, string>();
  const explicitElements = Array.from(
    wrapper.querySelectorAll<HTMLElement>("[data-morph-id]"),
  );

  explicitElements.forEach((el) => {
    const id = el.dataset.morphId?.trim();
    if (!id) return;

    sharedByElement.set(el, id);
    el.removeAttribute(AUTO_SHARED_KEY_ATTR);
  });

  addAutoSharedEntries(wrapper, sharedByElement);

  const entries = Array.from(sharedByElement.entries()).map(
    ([element, key]) => {
      element.setAttribute("data-flip-id", key);
      element.setAttribute(MANAGED_FLIP_ATTR, "true");

      if (!element.dataset.morphId) {
        element.setAttribute(AUTO_SHARED_KEY_ATTR, key);
      }

      return { element, key };
    },
  );

  return entries;
}

function getLayoutReserveTargets(
  wrapper: HTMLDivElement | null,
  revealTargets: HTMLElement[],
): HTMLElement[] {
  if (!wrapper || revealTargets.length === 0) return [];

  const reserve = new Set<HTMLElement>();

  revealTargets.forEach((target) => {
    reserve.add(target);
    let parent = target.parentElement;

    while (parent && parent !== wrapper) {
      if (getEffectiveSharedKey(parent)) break;
      if (parent.tagName === "SCRIPT" || parent.tagName === "STYLE") break;

      reserve.add(parent);
      parent = parent.parentElement;
    }
  });

  // Wrapper is handled separately via a height tween so the shell grows/shrinks
  // smoothly instead of snapping to the final layout size.

  return Array.from(reserve);
}

function measureWrapperHeight(wrapper: HTMLDivElement | null): number {
  if (!wrapper) return 0;
  const rect = wrapper.getBoundingClientRect();
  return rect.height > 0 ? rect.height : 0;
}

function computeClipInset(
  target: HTMLElement,
  wrapper: HTMLElement,
  targetRect: DOMRect,
): string | null {
  let clipLeft = -Infinity;
  let clipTop = -Infinity;
  let clipRight = Infinity;
  let clipBottom = Infinity;

  let parent: HTMLElement | null = target.parentElement;
  while (parent && parent !== wrapper) {
    const style = window.getComputedStyle(parent);
    const clipsX =
      style.overflowX === "hidden" ||
      style.overflowX === "clip" ||
      style.overflow === "hidden" ||
      style.overflow === "clip";
    const clipsY =
      style.overflowY === "hidden" ||
      style.overflowY === "clip" ||
      style.overflow === "hidden" ||
      style.overflow === "clip";

    if (clipsX || clipsY) {
      const parentRect = parent.getBoundingClientRect();
      if (clipsX) {
        clipLeft = Math.max(clipLeft, parentRect.left);
        clipRight = Math.min(clipRight, parentRect.right);
      }
      if (clipsY) {
        clipTop = Math.max(clipTop, parentRect.top);
        clipBottom = Math.min(clipBottom, parentRect.bottom);
      }
    }

    parent = parent.parentElement;
  }

  const insetTop = clipTop === -Infinity ? 0 : Math.max(0, clipTop - targetRect.top);
  const insetLeft = clipLeft === -Infinity ? 0 : Math.max(0, clipLeft - targetRect.left);
  const insetRight =
    clipRight === Infinity ? 0 : Math.max(0, targetRect.right - clipRight);
  const insetBottom =
    clipBottom === Infinity ? 0 : Math.max(0, targetRect.bottom - clipBottom);

  if (insetTop === 0 && insetRight === 0 && insetBottom === 0 && insetLeft === 0) {
    return null;
  }

  return `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
}

function createLeavingSnapshot(
  wrapper: HTMLDivElement | null,
): LeavingSnapshot | null {
  if (!wrapper) return null;

  const wrapperRect = wrapper.getBoundingClientRect();
  if (wrapperRect.width <= 0 || wrapperRect.height <= 0) return null;

  const leavingTargets = getRevealTargets(wrapper).filter((el) => {
    if (el.hasAttribute("data-morph-ignore-exit")) return false;
    const ancestor = el.closest("[data-morph-ignore-exit]");
    if (ancestor && wrapper.contains(ancestor)) return false;
    return true;
  });

  if (leavingTargets.length === 0) return null;

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.setAttribute("data-morph-leaving-layer", "true");
  container.style.position = "fixed";
  container.style.left = `${wrapperRect.left}px`;
  container.style.top = `${wrapperRect.top}px`;
  container.style.width = `${wrapperRect.width}px`;
  container.style.height = `${wrapperRect.height}px`;
  container.style.margin = "0";
  container.style.padding = "0";
  container.style.overflow = "hidden";
  container.style.pointerEvents = "none";
  container.style.zIndex = "2147483646";

  const clones: HTMLElement[] = [];

  leavingTargets.forEach((target) => {
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Preserve ancestor overflow clipping (e.g. shadcn Progress Root has
    // overflow-x-hidden that clips the translated Indicator child). Without
    // this, the clone would render the Indicator at its full unclipped size
    // and spill outside the progress track.
    const clipInset = computeClipInset(target, wrapper, rect);

    const clone = target.cloneNode(true) as HTMLElement;
    clone.removeAttribute("data-flip-id");
    clone.removeAttribute(MANAGED_FLIP_ATTR);
    clone.removeAttribute(AUTO_SHARED_KEY_ATTR);
    clone.style.position = "absolute";
    clone.style.left = `${rect.left - wrapperRect.left}px`;
    clone.style.top = `${rect.top - wrapperRect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = "0";
    clone.style.transform = "none";
    clone.style.transformOrigin = "top left";
    clone.style.pointerEvents = "none";
    clone.style.opacity = "1";
    clone.style.filter = "blur(0px)";
    clone.style.willChange = "opacity, filter";
    if (clipInset) {
      clone.style.clipPath = clipInset;
    }

    container.appendChild(clone);
    clones.push(clone);
  });

  if (clones.length === 0) return null;

  return { container, clones };
}

const SHARED_TEXT_PROPS =
  "fontSize,lineHeight,fontWeight,letterSpacing,wordSpacing,fontVariationSettings";

const TEXT_SHARED_TAGS = new Set([
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "P",
  "SPAN",
  "A",
  "LABEL",
  "SMALL",
  "STRONG",
  "EM",
  "I",
  "B",
  "LI",
  "BUTTON",
]);

function isTextSharedElement(el: HTMLElement): boolean {
  return TEXT_SHARED_TAGS.has(el.tagName);
}

function getSingleLineSharedTextTargets(shared: HTMLElement[]): HTMLElement[] {
  return shared.filter((el) => {
    if (!isTextSharedElement(el)) return false;
    if (el.textContent?.trim().length === 0) return false;
    if (el.textContent?.includes("\n")) return false;

    const style = window.getComputedStyle(el);
    if (style.whiteSpace.includes("nowrap")) return true;

    const lineHeight = Number.parseFloat(style.lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) return false;

    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return false;

    const lineCount = Math.round(rect.height / lineHeight);
    return lineCount <= 1;
  });
}

function getRevealTextTargets(targets: HTMLElement[]): HTMLElement[] {
  return targets.filter((el) => {
    if (!isTextSharedElement(el)) return false;
    if (el.textContent?.trim().length === 0) return false;
    return true;
  });
}

function collectSharedIds(entries: SharedEntry[]): Set<string> {
  return new Set(entries.map(({ key }) => key));
}

function getRevealTargets(wrapper: HTMLDivElement | null): HTMLElement[] {
  if (!wrapper) return [];

  const elements = Array.from(wrapper.querySelectorAll<HTMLElement>("*"));

  return elements.filter((el) => {
    if (el.hasAttribute("data-morph-ignore-reveal")) return false;

    // Nodes marked as shared are animated only by the shared FLIP pipeline.
    const sharedKey = getEffectiveSharedKey(el);
    if (sharedKey) return false;

    if (el.hasAttribute("data-morph-reveal")) return true;

    if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return false;

    // Default to leaf nodes so layout containers don't pulse.
    return el.children.length === 0;
  });
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function parseRevealDelay(element: HTMLElement): number | null {
  const raw = element.getAttribute(REVEAL_DELAY_ATTR)?.trim();
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  return Math.max(parsed, 0);
}

function getRevealCues(
  wrapper: HTMLDivElement | null,
  targets: HTMLElement[],
): RevealCue[] {
  if (!wrapper || targets.length === 0) return [];

  const wrapperRect = wrapper.getBoundingClientRect();
  const width = Math.max(wrapperRect.width, 1);

  return targets.map((element) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const nx = clamp01((centerX - wrapperRect.left) / width);
    const threshold = 1 - nx;

    return { element, threshold, explicitDelay: parseRevealDelay(element) };
  });
}

export function useFlipMorph(
  wrapperRef: RefObject<HTMLDivElement | null>,
  state: MorphCardState,
  config: MorphCardConfig | undefined,
): void {
  const snapshotRef = useRef<SharedSnapshot>({
    state: null,
    ids: new Set(),
    wrapperHeight: 0,
  });
  const targetSnapshotRef = useRef<SharedSnapshot>({
    state: null,
    ids: new Set(),
    wrapperHeight: 0,
  });
  const wrapLockTargetsRef = useRef<HTMLElement[]>([]);
  const revealTextWrapLockTargetsRef = useRef<HTMLElement[]>([]);
  const revealInlineDisplayLockTargetsRef = useRef<HTMLElement[]>([]);
  const transitionLockTargetsRef = useRef<HTMLElement[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const leavingSnapshotRef = useRef<LeavingSnapshot | null>(null);
  const activeLeavingSnapshotRef = useRef<LeavingSnapshot | null>(null);
  const layoutReserveTargetsRef = useRef<HTMLElement[]>([]);
  const wrapperSizeLockActiveRef = useRef<boolean>(false);
  const prevStateRef = useRef<MorphCardState | null>(null);

  useGSAP(
    () => {
      const clearActiveLeavingClones = () => {
        const active = activeLeavingSnapshotRef.current;
        if (!active) return;

        active.container.remove();
        activeLeavingSnapshotRef.current = null;
      };

      const clearLayoutReserves = () => {
        if (layoutReserveTargetsRef.current.length === 0) return;

        gsap.set(layoutReserveTargetsRef.current, {
          clearProps: "minHeight,minWidth",
        });
        layoutReserveTargetsRef.current = [];
      };

      const applyLayoutReserves = (targets: HTMLElement[]) => {
        clearLayoutReserves();
        if (targets.length === 0) return;

        const lockTargets = targets.filter((el) => !getEffectiveSharedKey(el));
        lockTargets.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.height <= 0) return;
          gsap.set(el, { minHeight: `${rect.height}px` });
        });

        layoutReserveTargetsRef.current = lockTargets;
      };

      const clearWrapLocks = () => {
        if (wrapLockTargetsRef.current.length === 0) return;

        gsap.set(wrapLockTargetsRef.current, {
          clearProps: "whiteSpace",
        });
        wrapLockTargetsRef.current = [];
      };

      const clearRevealTextWrapLocks = () => {
        if (revealTextWrapLockTargetsRef.current.length === 0) return;

        gsap.set(revealTextWrapLockTargetsRef.current, {
          clearProps: "width,minWidth,maxWidth",
        });
        revealTextWrapLockTargetsRef.current = [];
      };

      const clearRevealInlineDisplayLocks = () => {
        if (revealInlineDisplayLockTargetsRef.current.length === 0) return;

        gsap.set(revealInlineDisplayLockTargetsRef.current, {
          clearProps: "display",
        });
        revealInlineDisplayLockTargetsRef.current = [];
      };

      const clearTransitionLocks = () => {
        if (transitionLockTargetsRef.current.length === 0) return;

        gsap.set(transitionLockTargetsRef.current, {
          clearProps: "transition",
        });
        transitionLockTargetsRef.current = [];
      };

      // CSS transitions on user components (e.g. shadcn's `transition-all`) fight
      // frame-by-frame with GSAP's tweens and cause jitter/direction reversals.
      const applyTransitionLocks = () => {
        clearTransitionLocks();
        if (!wrapperRef.current) return;

        const targets = Array.from(
          wrapperRef.current.querySelectorAll<HTMLElement>("*"),
        ).filter(
          (el) => el.tagName !== "SCRIPT" && el.tagName !== "STYLE",
        );
        if (targets.length === 0) return;

        gsap.set(targets, { transition: "none" });
        transitionLockTargetsRef.current = targets;
      };

      const clearWrapperSizeLock = () => {
        if (!wrapperSizeLockActiveRef.current) return;
        if (wrapperRef.current) {
          gsap.set(wrapperRef.current, {
            clearProps: "height,overflow",
          });
        }
        wrapperSizeLockActiveRef.current = false;
      };

      const captureSnapshot = () => {
        const sharedEntries = getSharedEntries(wrapperRef.current);
        const elements = sharedEntries.map(({ element }) => element);
        snapshotRef.current = {
          state:
            elements.length > 0
              ? Flip.getState(elements, { props: SHARED_TEXT_PROPS })
              : null,
          ids: collectSharedIds(sharedEntries),
          wrapperHeight: measureWrapperHeight(wrapperRef.current),
        };

        leavingSnapshotRef.current = createLeavingSnapshot(wrapperRef.current);
      };

      // First mount — no animation, no snapshot
      if (prevStateRef.current === null) {
        prevStateRef.current = state;
        captureSnapshot();
        return captureSnapshot;
      }

      const duration = config?.duration ?? 0.45;
      const ease = config?.ease ?? "power2.inOut";
      const revealDelayBase = Math.min(duration * 0.12, 0.1);
      const revealWindowBase = Math.max(duration * 0.74, 0.24);
      const revealDuration = Math.max(duration * 0.8, 0.18);
      const revealBlurStart = 4;
      const revealBlurMid = 2;
      const revealOpacityMid = 0.9;
      const configuredRevealShift = config?.revealShift;
      const revealShiftStart =
        typeof configuredRevealShift === "number" &&
        Number.isFinite(configuredRevealShift)
          ? Math.max(configuredRevealShift, 0)
          : 0.6;
      const revealShiftMid = revealShiftStart * 0.1;
      const configuredSharedBlur = config?.sharedBlur;
      const sharedBlurPeak =
        typeof configuredSharedBlur === "number" &&
        Number.isFinite(configuredSharedBlur)
          ? Math.max(configuredSharedBlur, 0)
          : 0;
      const hideDuration = Math.max(duration * 0.42, 0.22);
      // Mirror reveal's peak blur so entrance and exit feel symmetric.
      const hideBlurEnd = revealBlurStart;
      const revealPreRollBase = Math.min(revealDuration * 0.24, 0.08);
      const revealEaseStart = "sine.out";
      const revealEaseEnd = "power2.out";
      const hideEase = "power2.in";

      // Reduced-motion gate — BEFORE any Flip call
      const mm = gsap.matchMedia();
      let reduced = false;
      mm.add("(prefers-reduced-motion: reduce)", () => {
        reduced = true;
      });
      mm.revert();

      if (reduced) {
        clearWrapLocks();
        clearRevealTextWrapLocks();
        clearRevealInlineDisplayLocks();
        clearTransitionLocks();
        clearActiveLeavingClones();
        clearLayoutReserves();
        clearWrapperSizeLock();

        if (timelineRef.current) {
          timelineRef.current.kill();
          timelineRef.current = null;
        }

        const reducedTargets = getRevealTargets(wrapperRef.current);
        if (reducedTargets.length > 0) {
          gsap.set(reducedTargets, {
            opacity: 1,
            clearProps: "filter,opacity,pointerEvents,visibility",
          });
        }

        config?.onStart?.();
        config?.onComplete?.();
        prevStateRef.current = state;
        return captureSnapshot;
      }

      // Interruption — kill current timeline and re-snapshot live DOM
      if (timelineRef.current) {
        // Clear stuck inline filter from the previous blur pass so the next
        // cycle doesn't start from a mid-blur state.
        if (wrapperRef.current) {
          const prevManaged = Array.from(
            wrapperRef.current.querySelectorAll<HTMLElement>(
              `[${MANAGED_FLIP_ATTR}]`,
            ),
          );
          if (prevManaged.length > 0) {
            gsap.set(prevManaged, { clearProps: "filter" });
          }
        }

        clearWrapLocks();
        clearRevealTextWrapLocks();
        clearRevealInlineDisplayLocks();
        clearTransitionLocks();
        clearActiveLeavingClones();
        clearLayoutReserves();
        // Capture the in-flight wrapper height BEFORE clearing the lock so the
        // next cycle animates from the point we interrupted at, not a snap.
        const interruptedWrapperHeight = measureWrapperHeight(
          wrapperRef.current,
        );
        clearWrapperSizeLock();
        timelineRef.current.kill();
        timelineRef.current = null;
        // When toggling quickly, use the previous cycle target snapshot as new baseline.
        if (targetSnapshotRef.current.state) {
          snapshotRef.current = {
            state: targetSnapshotRef.current.state,
            ids: new Set(targetSnapshotRef.current.ids),
            wrapperHeight: interruptedWrapperHeight,
          };
        } else if (!snapshotRef.current.state) {
          captureSnapshot();
          snapshotRef.current.wrapperHeight = interruptedWrapperHeight;
        } else {
          snapshotRef.current.wrapperHeight = interruptedWrapperHeight;
        }
      }

      const prevSnapshot = snapshotRef.current.state;
      if (!prevSnapshot || !wrapperRef.current) {
        prevStateRef.current = state;
        return captureSnapshot;
      }

      const oldIds = snapshotRef.current.ids;
      const oldWrapperHeight = snapshotRef.current.wrapperHeight;
      const newWrapperHeight = measureWrapperHeight(wrapperRef.current);
      const allNewEntries = getSharedEntries(wrapperRef.current);
      const allNew = allNewEntries.map(({ element }) => element);

      targetSnapshotRef.current = {
        state:
          allNew.length > 0
            ? Flip.getState(allNew, { props: SHARED_TEXT_PROPS })
            : null,
        ids: collectSharedIds(allNewEntries),
        wrapperHeight: newWrapperHeight,
      };

      const sharedAfterEntries = allNewEntries.filter(({ key }) =>
        oldIds.has(key),
      );
      const sharedAfter = sharedAfterEntries.map(({ element }) => element);
      const sharedTextAfter = sharedAfter.filter(isTextSharedElement);
      const sharedTransformClearAfter = sharedAfter;
      const hasSharedMorphTargets = sharedAfter.length > 0;
      const revealDelay = hasSharedMorphTargets
        ? duration * 0.5
        : revealDelayBase;
      const revealWindow = hasSharedMorphTargets
        ? Math.max(duration * 0.2, 0.12)
        : revealWindowBase;
      const revealPreRoll = hasSharedMorphTargets ? 0 : revealPreRollBase;
      const revealTargets = getRevealTargets(wrapperRef.current);
      const layoutReserveTargets = getLayoutReserveTargets(
        wrapperRef.current,
        revealTargets,
      );
      const revealCues = getRevealCues(wrapperRef.current, revealTargets);
      // Swap: consume previous cycle's snapshot, stash a fresh one of the
      // current (incoming) DOM so the next transition has something to fade.
      // useGSAP's cleanup never runs captureSnapshot on re-renders (deferCleanup
      // discards the return value), so we must refresh in the body itself.
      const leavingSnapshot = leavingSnapshotRef.current;
      leavingSnapshotRef.current = createLeavingSnapshot(wrapperRef.current);

      if (leavingSnapshot) {
        document.body.appendChild(leavingSnapshot.container);
      }
      activeLeavingSnapshotRef.current = leavingSnapshot;

      if (
        sharedAfter.length === 0 &&
        revealTargets.length === 0 &&
        !leavingSnapshot
      ) {
        clearRevealTextWrapLocks();
        clearRevealInlineDisplayLocks();
        clearTransitionLocks();
        clearLayoutReserves();
        config?.onStart?.();
        config?.onComplete?.();
        prevStateRef.current = state;
        return captureSnapshot;
      }

      // Third-party primitives (e.g. shadcn/Radix Progress) drive state by
      // writing inline `transform`/`filter`. Snapshot those BEFORE any gsap.set
      // touches transform/filter on shared or reveal targets, so we can
      // restore them after clearProps strips GSAP's values at the end of
      // the timeline. Must run BEFORE applyTransitionLocks (which calls
      // gsap.set and can prime GSAP's transform cache) and before the reveal
      // gsap.set below, which uses `x` (transform) and `filter`.
      const preservedInlineStyles = new Map<
        HTMLElement,
        { transform: string; filter: string }
      >();
      const trackInlineStyles = (el: HTMLElement) => {
        if (preservedInlineStyles.has(el)) return;
        preservedInlineStyles.set(el, {
          transform: el.style.transform,
          filter: el.style.filter,
        });
      };
      sharedAfter.forEach(trackInlineStyles);
      revealTargets.forEach(trackInlineStyles);

      applyTransitionLocks();

      if (sharedAfter.length > 0) {
        gsap.set(sharedAfter, { autoAlpha: 1 });
      }

      applyLayoutReserves(layoutReserveTargets);

      if (revealTargets.length > 0) {
        const revealInlineDisplayLocks: HTMLElement[] = [];
        revealTargets.forEach((target) => {
          const style = window.getComputedStyle(target);
          if (style.display === "inline") {
            gsap.set(target, { display: "inline-block" });
            revealInlineDisplayLocks.push(target);
          }
        });
        revealInlineDisplayLockTargetsRef.current = revealInlineDisplayLocks;

        const revealTextTargets = getRevealTextTargets(revealTargets);
        const revealTextWrapLocks: HTMLElement[] = [];

        revealTextTargets.forEach((target) => {
          const rect = target.getBoundingClientRect();
          if (rect.width <= 0) return;

          const width = `${rect.width}px`;
          gsap.set(target, {
            width,
            minWidth: width,
            maxWidth: width,
          });
          revealTextWrapLocks.push(target);
        });

        revealTextWrapLockTargetsRef.current = revealTextWrapLocks;

        // Split reveal targets: elements that carry an inline transform
        // (e.g. shadcn Progress Indicator with translateX(-X%)) must NOT be
        // animated via GSAP's `x` prop — it would rewrite their transform
        // matrix and flash them at 100% until the tween settles. For those
        // we animate opacity+filter only and keep the transform untouched.
        const revealShiftTargets = revealTargets.filter(
          (el) => !preservedInlineStyles.get(el)?.transform,
        );
        const revealNoShiftTargets = revealTargets.filter(
          (el) => !!preservedInlineStyles.get(el)?.transform,
        );

        if (revealShiftTargets.length > 0) {
          gsap.set(revealShiftTargets, {
            opacity: 0,
            x: revealShiftStart,
            visibility: "visible",
            filter: `blur(${revealBlurStart}px)`,
            pointerEvents: "none",
          });
        }
        if (revealNoShiftTargets.length > 0) {
          gsap.set(revealNoShiftTargets, {
            opacity: 0,
            visibility: "visible",
            filter: `blur(${revealBlurStart}px)`,
            pointerEvents: "none",
          });
        }
      }

      const wrapLockTargets = getSingleLineSharedTextTargets(sharedAfter);
      if (wrapLockTargets.length > 0) {
        gsap.set(wrapLockTargets, { whiteSpace: "nowrap" });
        wrapLockTargetsRef.current = wrapLockTargets;
      }

      const timelineVars: gsap.TimelineVars = {
        onComplete: () => {
          timelineRef.current = null;
          clearWrapLocks();
          clearRevealTextWrapLocks();
          clearRevealInlineDisplayLocks();
          clearTransitionLocks();
          clearActiveLeavingClones();
          clearLayoutReserves();
          clearWrapperSizeLock();

          // Ensure shared nodes end exactly in the layout-driven final state.
          if (sharedTransformClearAfter.length > 0) {
            gsap.set(sharedTransformClearAfter, {
              clearProps: "transform,x,y,rotation,scale,scaleX,scaleY,filter",
            });
          }

          // Reinstate inline transforms/filters that belonged to the user
          // (not to GSAP) for BOTH shared and reveal targets. Without this,
          // shadcn/Radix Progress indicators snap back to 100% because their
          // inline translateX is wiped — once by GSAP's `x` prop on reveal
          // targets, and once by clearProps on shared targets.
          preservedInlineStyles.forEach((saved, el) => {
            if (saved.transform) {
              el.style.transform = saved.transform;
            }
            if (saved.filter) {
              el.style.filter = saved.filter;
            }
          });

          if (sharedTextAfter.length > 0) {
            gsap.set(sharedTextAfter, {
              clearProps:
                "fontSize,lineHeight,fontWeight,letterSpacing,wordSpacing,fontVariationSettings",
            });
          }

          if (targetSnapshotRef.current.state) {
            snapshotRef.current = {
              state: targetSnapshotRef.current.state,
              ids: new Set(targetSnapshotRef.current.ids),
              wrapperHeight: measureWrapperHeight(wrapperRef.current),
            };
          }

          config?.onComplete?.();
        },
      };

      if (config?.onStart) {
        timelineVars.onStart = config.onStart;
      }

      const tl = gsap.timeline(timelineVars);

      const wrapperHeightDelta = Math.abs(newWrapperHeight - oldWrapperHeight);
      const shouldTweenWrapperHeight =
        oldWrapperHeight > 0 &&
        newWrapperHeight > 0 &&
        wrapperHeightDelta > 0.5 &&
        wrapperRef.current !== null;

      if (shouldTweenWrapperHeight && wrapperRef.current) {
        gsap.set(wrapperRef.current, {
          height: oldWrapperHeight,
          overflow: "hidden",
        });
        wrapperSizeLockActiveRef.current = true;

        tl.to(
          wrapperRef.current,
          {
            height: newWrapperHeight,
            duration,
            ease,
          },
          0,
        );
      }

      if (sharedAfter.length > 0) {
        // Main shared pass keeps parent/child text/layout continuity.
        const sharedCoreAnimation = Flip.from(prevSnapshot, {
          targets: sharedAfter,
          duration,
          ease,
          immediateRender: true,
          props: SHARED_TEXT_PROPS,
          absolute: false,
          fade: false,
          nested: true,
          scale: false,
        }) as gsap.core.Animation;

        tl.add(sharedCoreAnimation, 0);

        if (sharedBlurPeak > 0) {
          const blurHalf = duration * 0.5;
          tl.fromTo(
            sharedAfter,
            { filter: "blur(0px)" },
            {
              filter: `blur(${sharedBlurPeak}px)`,
              duration: blurHalf,
              ease: "sine.out",
              overwrite: "auto",
            },
            0,
          );
          tl.to(
            sharedAfter,
            {
              filter: "blur(0px)",
              duration: blurHalf,
              ease: "sine.in",
              overwrite: "auto",
            },
            blurHalf,
          );
        }
      }

      if (leavingSnapshot && leavingSnapshot.clones.length > 0) {
        tl.to(
          leavingSnapshot.clones,
          {
            autoAlpha: 0,
            filter: `blur(${hideBlurEnd}px)`,
            duration: hideDuration,
            ease: hideEase,
            overwrite: "auto",
          },
          0,
        );
      }

      if (revealCues.length > 0) {
        revealCues.forEach(({ element, threshold, explicitDelay }) => {
          const at =
            explicitDelay !== null
              ? revealDelay + explicitDelay
              : revealDelay + threshold * revealWindow;
          const startAt = Math.max(0, at - revealPreRoll);
          const hasInlineTransform =
            !!preservedInlineStyles.get(element)?.transform;

          const phase1: gsap.TweenVars = {
            opacity: revealOpacityMid,
            filter: `blur(${revealBlurMid}px)`,
            duration: revealDuration * 0.5,
            ease: revealEaseStart,
            overwrite: "auto",
          };
          if (!hasInlineTransform) {
            phase1.x = revealShiftMid;
          }
          tl.to(element, phase1, startAt);

          const phase2: gsap.TweenVars = {
            opacity: 1,
            filter: "blur(0px)",
            duration: revealDuration * 0.5,
            ease: revealEaseEnd,
            overwrite: "auto",
            pointerEvents: "auto",
            clearProps: hasInlineTransform
              ? "filter,opacity,pointerEvents,visibility"
              : "filter,opacity,pointerEvents,visibility,x",
          };
          if (!hasInlineTransform) {
            phase2.x = 0;
          }
          tl.to(element, phase2, startAt + revealDuration * 0.5);
        });
      }

      timelineRef.current = tl;
      prevStateRef.current = state;

      return captureSnapshot;
    },
    {
      scope: wrapperRef,
      dependencies: [state],
    },
  );
}
