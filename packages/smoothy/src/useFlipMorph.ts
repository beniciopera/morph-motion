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

type RevealCue = {
  element: HTMLElement;
  threshold: number;
};

function createLeavingClones(wrapper: HTMLDivElement | null): HTMLElement[] {
  if (!wrapper) return [];

  const sharedElements = getSharedElements(wrapper);
  const sharedIds = collectSharedIds(sharedElements);
  const leavingTargets = getRevealTargets(wrapper, sharedIds);

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

function getSharedElements(wrapper: HTMLDivElement | null): HTMLElement[] {
  if (!wrapper) return [];

  const elements = Array.from(
    wrapper.querySelectorAll<HTMLElement>("[data-smoothy-id]"),
  );

  // Flip matches across state changes via data-flip-id.
  elements.forEach((el) => {
    const id = el.dataset.smoothyId;
    if (!id) return;
    el.setAttribute("data-flip-id", id);
  });

  return elements;
}

function collectSharedIds(elements: HTMLElement[]): Set<string> {
  return new Set(
    elements
      .map((el) => el.dataset.smoothyId)
      .filter((id): id is string => typeof id === "string"),
  );
}

function getRevealTargets(
  wrapper: HTMLDivElement | null,
  sharedIds: Set<string>,
): HTMLElement[] {
  if (!wrapper) return [];

  const elements = Array.from(wrapper.querySelectorAll<HTMLElement>("*"));

  return elements.filter((el) => {
    if (el.hasAttribute("data-smoothy-ignore-reveal")) return false;

    // Nodes marked as shared are animated only by the shared FLIP pipeline.
    if (el.dataset.smoothyId) return false;

    const id = el.dataset.smoothyId;
    if (id && sharedIds.has(id)) return false;

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
  const prevStateRef = useRef<SmoothyCardState | null>(null);

  useGSAP(
    () => {
      const clearActiveLeavingClones = () => {
        if (activeLeavingClonesRef.current.length === 0) return;

        activeLeavingClonesRef.current.forEach((clone) => clone.remove());
        activeLeavingClonesRef.current = [];
      };

      const clearWrapLocks = () => {
        if (wrapLockTargetsRef.current.length === 0) return;

        gsap.set(wrapLockTargetsRef.current, {
          clearProps: "whiteSpace",
        });
        wrapLockTargetsRef.current = [];
      };

      const captureSnapshot = () => {
        const elements = getSharedElements(wrapperRef.current);
        snapshotRef.current = {
          state:
            elements.length > 0
              ? Flip.getState(elements, { props: SHARED_TEXT_PROPS })
              : null,
          ids: collectSharedIds(elements),
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

        if (timelineRef.current) {
          timelineRef.current.kill();
          timelineRef.current = null;
        }

        const reducedTargets = getRevealTargets(wrapperRef.current, new Set());
        if (reducedTargets.length > 0) {
          gsap.set(reducedTargets, {
            opacity: 1,
            clearProps: "filter,opacity,pointerEvents",
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
      const allNew = getSharedElements(wrapperRef.current);

      targetSnapshotRef.current = {
        state:
          allNew.length > 0
            ? Flip.getState(allNew, { props: SHARED_TEXT_PROPS })
            : null,
        ids: collectSharedIds(allNew),
      };

      const sharedAfter = allNew.filter(
        (el) =>
          el.dataset.smoothyId !== undefined &&
          oldIds.has(el.dataset.smoothyId),
      );
      const sharedAfterIds = collectSharedIds(sharedAfter);
      const sharedTextAfter = sharedAfter.filter(isTextSharedElement);
      const sharedTransformClearAfter = sharedAfter;
      const revealTargets = getRevealTargets(
        wrapperRef.current,
        sharedAfterIds,
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
        config?.onStart?.();
        config?.onComplete?.();
        prevStateRef.current = state;
        return captureSnapshot;
      }

      if (sharedAfter.length > 0) {
        gsap.set(sharedAfter, { autoAlpha: 1 });
      }

      if (revealTargets.length > 0) {
        gsap.set(revealTargets, {
          opacity: 0,
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
              clearProps: "filter,opacity,pointerEvents",
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
