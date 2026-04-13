"use client";
import { useRef, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Flip } from "gsap/dist/Flip";
import type { SmoothyCardState, SmoothyCardConfig } from "./types";

type SharedSnapshot = {
  state: Flip.FlipState | null;
  ids: Set<string>;
};

type SharedEntry = {
  element: HTMLElement;
  key: string;
};

type RevealCue = {
  element: HTMLElement;
  threshold: number;
};

const AUTO_SHARED_KEY_ATTR = "data-smoothy-auto-id";
const MANAGED_FLIP_ATTR = "data-smoothy-managed-flip";

function getEffectiveSharedKey(el: HTMLElement): string | null {
  const explicit = el.dataset.smoothyId?.trim();
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
    wrapper.querySelectorAll<HTMLElement>("[data-all-smoothy-id]"),
  ).forEach((element) => {
    const base = element.getAttribute("data-all-smoothy-id")?.trim();
    if (!base) return;

    const instance = baseCounters.get(base) ?? 0;
    containerOrderByBase.set(element, instance);
    baseCounters.set(base, instance + 1);
  });

  const containers = Array.from(
    wrapper.querySelectorAll<HTMLElement>("[data-all-smoothy-id]"),
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
    const explicit = node.dataset.smoothyId?.trim();
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
    const base = element.getAttribute("data-all-smoothy-id")?.trim();
    if (!base) return;
    visit(element, base, containerInstance, "root");
  });
}

function getSharedEntries(wrapper: HTMLDivElement | null): SharedEntry[] {
  if (!wrapper) return [];

  clearManagedSharedAttrs(wrapper);

  const sharedByElement = new Map<HTMLElement, string>();
  const explicitElements = Array.from(
    wrapper.querySelectorAll<HTMLElement>("[data-smoothy-id]"),
  );

  explicitElements.forEach((el) => {
    const id = el.dataset.smoothyId?.trim();
    if (!id) return;

    sharedByElement.set(el, id);
    el.removeAttribute(AUTO_SHARED_KEY_ATTR);
  });

  addAutoSharedEntries(wrapper, sharedByElement);

  const entries = Array.from(sharedByElement.entries()).map(
    ([element, key]) => {
      element.setAttribute("data-flip-id", key);
      element.setAttribute(MANAGED_FLIP_ATTR, "true");

      if (!element.dataset.smoothyId) {
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
    let parent = target.parentElement;

    while (parent && parent !== wrapper) {
      if (getEffectiveSharedKey(parent)) break;
      if (parent.hasAttribute("data-smoothy-ignore-reveal")) break;
      if (parent.tagName === "SCRIPT" || parent.tagName === "STYLE") break;
      if (
        parent.querySelector(`[data-smoothy-id], [${AUTO_SHARED_KEY_ATTR}]`) !==
        null
      ) {
        break;
      }

      reserve.add(parent);
      parent = parent.parentElement;
    }
  });

  return Array.from(reserve);
}

function createLeavingClones(wrapper: HTMLDivElement | null): HTMLElement[] {
  if (!wrapper) return [];

  const leavingTargets = getRevealTargets(wrapper);

  return leavingTargets
    .map((target) => {
      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const clone = target.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      clone.style.position = "fixed";
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.margin = "0";
      clone.style.transform = "none";
      clone.style.transformOrigin = "top left";
      clone.style.pointerEvents = "none";
      clone.style.opacity = "1";
      clone.style.filter = "blur(0px)";
      clone.style.zIndex = "2147483646";
      clone.style.willChange = "opacity, filter";

      return clone;
    })
    .filter((clone): clone is HTMLElement => clone !== null);
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

function collectSharedIds(entries: SharedEntry[]): Set<string> {
  return new Set(entries.map(({ key }) => key));
}

function getRevealTargets(wrapper: HTMLDivElement | null): HTMLElement[] {
  if (!wrapper) return [];

  const elements = Array.from(wrapper.querySelectorAll<HTMLElement>("*"));

  return elements.filter((el) => {
    if (el.hasAttribute("data-smoothy-ignore-reveal")) return false;

    // Nodes marked as shared are animated only by the shared FLIP pipeline.
    const sharedKey = getEffectiveSharedKey(el);
    if (sharedKey) return false;

    if (el.hasAttribute("data-smoothy-reveal")) return true;

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

function getRevealCues(
  wrapper: HTMLDivElement | null,
  targets: HTMLElement[],
): RevealCue[] {
  if (!wrapper || targets.length === 0) return [];

  const wrapperRect = wrapper.getBoundingClientRect();
  const width = Math.max(wrapperRect.width, 1);
  const height = Math.max(wrapperRect.height, 1);

  return targets
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const nx = clamp01((centerX - wrapperRect.left) / width);
      const ny = clamp01((centerY - wrapperRect.top) / height);

      // Element becomes visible once card growth reaches its final area.
      return {
        element,
        threshold: Math.max(nx, ny),
      };
    })
    .sort((a, b) => a.threshold - b.threshold);
}

export function useFlipMorph(
  wrapperRef: RefObject<HTMLDivElement | null>,
  state: SmoothyCardState,
  config: SmoothyCardConfig | undefined,
): void {
  const snapshotRef = useRef<SharedSnapshot>({
    state: null,
    ids: new Set(),
  });
  const targetSnapshotRef = useRef<SharedSnapshot>({
    state: null,
    ids: new Set(),
  });
  const wrapLockTargetsRef = useRef<HTMLElement[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const leavingClonesRef = useRef<HTMLElement[]>([]);
  const activeLeavingClonesRef = useRef<HTMLElement[]>([]);
  const layoutReserveTargetsRef = useRef<HTMLElement[]>([]);
  const prevStateRef = useRef<SmoothyCardState | null>(null);

  useGSAP(
    () => {
      const clearActiveLeavingClones = () => {
        if (activeLeavingClonesRef.current.length === 0) return;

        activeLeavingClonesRef.current.forEach((clone) => clone.remove());
        activeLeavingClonesRef.current = [];
      };

      const clearLayoutReserves = () => {
        if (layoutReserveTargetsRef.current.length === 0) return;

        gsap.set(layoutReserveTargetsRef.current, {
          clearProps: "minHeight",
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

      const captureSnapshot = () => {
        const sharedEntries = getSharedEntries(wrapperRef.current);
        const elements = sharedEntries.map(({ element }) => element);
        snapshotRef.current = {
          state:
            elements.length > 0
              ? Flip.getState(elements, { props: SHARED_TEXT_PROPS })
              : null,
          ids: collectSharedIds(sharedEntries),
        };

        leavingClonesRef.current = createLeavingClones(wrapperRef.current);
      };

      // First mount — no animation, no snapshot
      if (prevStateRef.current === null) {
        prevStateRef.current = state;
        captureSnapshot();
        return captureSnapshot;
      }

      const duration = config?.duration ?? 0.45;
      const ease = config?.ease ?? "power2.inOut";
      const revealDelay = Math.min(duration * 0.12, 0.1);
      const revealWindow = Math.max(duration * 0.74, 0.24);
      const revealDuration = Math.max(duration * 0.62, 0.3);
      const revealBlurStart = 12;
      const revealBlurMid = 4;
      const revealOpacityMid = 0.8;
      const hideDuration = Math.max(duration * 0.42, 0.22);
      const hideBlurEnd = 20;
      const revealPreRoll = Math.min(revealDuration * 0.24, 0.08);
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
        clearActiveLeavingClones();
        clearLayoutReserves();

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
        clearWrapLocks();
        clearActiveLeavingClones();
        clearLayoutReserves();
        timelineRef.current.kill();
        timelineRef.current = null;
        // When toggling quickly, use the previous cycle target snapshot as new baseline.
        if (targetSnapshotRef.current.state) {
          snapshotRef.current = {
            state: targetSnapshotRef.current.state,
            ids: new Set(targetSnapshotRef.current.ids),
          };
        } else if (!snapshotRef.current.state) {
          captureSnapshot();
        }
      }

      const prevSnapshot = snapshotRef.current.state;
      if (!prevSnapshot || !wrapperRef.current) {
        prevStateRef.current = state;
        return captureSnapshot;
      }

      const oldIds = snapshotRef.current.ids;
      const allNewEntries = getSharedEntries(wrapperRef.current);
      const allNew = allNewEntries.map(({ element }) => element);

      targetSnapshotRef.current = {
        state:
          allNew.length > 0
            ? Flip.getState(allNew, { props: SHARED_TEXT_PROPS })
            : null,
        ids: collectSharedIds(allNewEntries),
      };

      const sharedAfterEntries = allNewEntries.filter(({ key }) =>
        oldIds.has(key),
      );
      const sharedAfter = sharedAfterEntries.map(({ element }) => element);
      const sharedTextAfter = sharedAfter.filter(isTextSharedElement);
      const sharedTransformClearAfter = sharedAfter;
      const revealTargets = getRevealTargets(wrapperRef.current);
      const layoutReserveTargets = getLayoutReserveTargets(
        wrapperRef.current,
        revealTargets,
      );
      const revealCues = getRevealCues(wrapperRef.current, revealTargets);
      const leavingClones = leavingClonesRef.current;
      leavingClonesRef.current = [];

      if (leavingClones.length > 0) {
        leavingClones.forEach((clone) => document.body.appendChild(clone));
      }
      activeLeavingClonesRef.current = leavingClones;

      if (
        sharedAfter.length === 0 &&
        revealTargets.length === 0 &&
        leavingClones.length === 0
      ) {
        clearLayoutReserves();
        config?.onStart?.();
        config?.onComplete?.();
        prevStateRef.current = state;
        return captureSnapshot;
      }

      if (sharedAfter.length > 0) {
        gsap.set(sharedAfter, { autoAlpha: 1 });
      }

      applyLayoutReserves(layoutReserveTargets);

      if (revealTargets.length > 0) {
        gsap.set(revealTargets, {
          opacity: 0,
          visibility: "visible",
          filter: `blur(${revealBlurStart}px)`,
          pointerEvents: "none",
        });
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
          clearActiveLeavingClones();
          clearLayoutReserves();

          // Ensure shared nodes end exactly in the layout-driven final state.
          if (sharedTransformClearAfter.length > 0) {
            gsap.set(sharedTransformClearAfter, {
              clearProps: "transform,x,y,rotation,scale,scaleX,scaleY",
            });
          }

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
            };
          }

          config?.onComplete?.();
        },
      };

      if (config?.onStart) {
        timelineVars.onStart = config.onStart;
      }

      const tl = gsap.timeline(timelineVars);

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
      }

      if (leavingClones.length > 0) {
        tl.to(
          leavingClones,
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
        revealCues.forEach(({ element, threshold }) => {
          const at = revealDelay + threshold * revealWindow;
          const startAt = Math.max(0, at - revealPreRoll);

          tl.to(
            element,
            {
              opacity: revealOpacityMid,
              filter: `blur(${revealBlurMid}px)`,
              duration: revealDuration * 0.5,
              ease: revealEaseStart,
              overwrite: "auto",
            },
            startAt,
          );

          tl.to(
            element,
            {
              opacity: 1,
              filter: "blur(0px)",
              duration: revealDuration * 0.5,
              ease: revealEaseEnd,
              overwrite: "auto",
              pointerEvents: "auto",
              clearProps: "filter,opacity,pointerEvents,visibility",
            },
            startAt + revealDuration * 0.5,
          );
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
