"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { ToastRoot } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastRoot>
      <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
    </ToastRoot>
  );
}
