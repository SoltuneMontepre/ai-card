"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { HTMLAttributes, ReactNode } from "react";

interface AnimatedProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Animated({ children, className, ...props }: AnimatedProps) {
  const [parent] = useAutoAnimate();
  return (
    <div ref={parent} className={className} {...props}>
      {children}
    </div>
  );
}

export function useAnimatedRef() {
  return useAutoAnimate();
}
