"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ToastProvider, ThemeProvider } from "@/components/ui";
import { CSRFProvider } from "@/hooks/useCSRF";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <CSRFProvider>
          <ToastProvider>{children}</ToastProvider>
        </CSRFProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
