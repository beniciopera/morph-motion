import type { ReactNode } from "react";

type EaseLike = (progress: number) => number;

export type MorphMotionCardState = "a" | "b";

export type MorphMotionCardConfig = {
  duration?: number;
  ease?: string | EaseLike;
  revealShift?: number;
  sharedBlur?: number;
  onStart?: () => void;
  onComplete?: () => void;
};

export type MorphMotionCardProps = {
  state: MorphMotionCardState;
  config?: MorphMotionCardConfig | undefined;
  children: ReactNode;
};
