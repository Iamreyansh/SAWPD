"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "vermillion";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toast: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastRoot>");
  return ctx;
}

export function ToastRoot({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed top-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 p-4 sm:top-4 sm:items-end sm:right-4 sm:left-auto">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 360, damping: 28 }}
                    className={cn(
                      "pointer-events-auto flex w-full max-w-[360px] items-start gap-3 overflow-hidden rounded-2xl p-4 text-bone shadow-float",
                      item.variant === "vermillion"
                        ? "bg-vermillion"
                        : "bg-ink"
                    )}
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-bone/15">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold tracking-[-0.01em]">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="mt-0.5 text-[13px] text-bone/70">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}
