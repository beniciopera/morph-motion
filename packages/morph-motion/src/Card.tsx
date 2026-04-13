"use client";
import "./registerFlip";
import { useRef } from "react";
import { useFlipMorph } from "./useFlipMorph";
import type { MorphMotionCardProps } from "./types";

export function Card({ state, config, children }: MorphMotionCardProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useFlipMorph(wrapperRef, state, config);
  return <div ref={wrapperRef}>{children}</div>;
}
