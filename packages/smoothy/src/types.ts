import type { ReactNode } from "react";

type EaseLike = (progress: number) => number;

export type SmoothyCardState = "a" | "b";

export type SmoothyCardConfig = {
  duration?: number;
  ease?: string | EaseLike;
  revealShift?: number;
  onStart?: () => void;
  onComplete?: () => void;
};

export type SmoothyCardProps = {
  state: SmoothyCardState;
  config?: SmoothyCardConfig | undefined;
  children: ReactNode;
};
