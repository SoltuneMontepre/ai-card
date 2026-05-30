"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import PageTransition from "./components/PageTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <PageTransition>{children}</PageTransition>
      </QueryClientProvider>
    </SessionProvider>
  );
}
