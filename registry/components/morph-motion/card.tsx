"use client";
import { useRef, type ReactNode } from "react";
import "@/hooks/register-flip";
import {
  useFlipMorph,
  type MorphCardConfig,
  type MorphCardState,
} from "@/hooks/use-flip-morph";

export type { MorphCardConfig, MorphCardState };

export type MorphCardProps = {
  state: MorphCardState;
  config?: MorphCardConfig | undefined;
  children: ReactNode;
};

export function MorphCard({ state, config, children }: MorphCardProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useFlipMorph(wrapperRef, state, config);
  return <div ref={wrapperRef}>{children}</div>;
}
