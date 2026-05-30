"use client";

import { usePathname } from "next/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [parent] = useAutoAnimate({
    duration: 280,
    easing: "ease-in-out",
  });

  return (
    <div ref={parent} className="min-h-full">
      <div key={pathname}>{children}</div>
    </div>
  );
}
