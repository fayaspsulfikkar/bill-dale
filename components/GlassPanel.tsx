"use client";

import React, { CSSProperties } from "react";
import LiquidGlass from "liquid-glass-react";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  mode?: "standard" | "polar" | "prominent" | "shader";
  displacementScale?: number;
  blurAmount?: number;
  saturation?: number;
  elasticity?: number;
  cornerRadius?: number;
}

export function GlassPanel({
  children,
  className = "",
  style = {},
  mode = "standard",
  displacementScale = 40,
  blurAmount = 0.04,
  saturation = 120,
  elasticity = 0.08,
  cornerRadius = 20,
}: GlassPanelProps) {
  return (
    <LiquidGlass
      mode={mode}
      displacementScale={displacementScale}
      blurAmount={blurAmount}
      saturation={saturation}
      elasticity={elasticity}
      cornerRadius={cornerRadius}
      className={className}
      style={style}
    >
      {children}
    </LiquidGlass>
  );
}
