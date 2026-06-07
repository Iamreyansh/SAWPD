"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[112px] w-full rounded-xl border border-ink/10 bg-bone px-4 py-3 text-base text-ink",
          "placeholder:text-ink/35 resize-none",
          "transition-all duration-200",
          "focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/5",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
