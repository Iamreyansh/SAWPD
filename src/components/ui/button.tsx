"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-vermillion text-bone hover:bg-vermillion-deep active:scale-[0.98] shadow-glow",
        vermillion:
          "bg-vermillion text-bone hover:bg-vermillion-deep active:scale-[0.98] shadow-glow",
        ink:
          "bg-ink text-bone hover:bg-ink/90 active:scale-[0.98] shadow-soft",
        outline:
          "border border-ink/15 bg-transparent text-ink hover:bg-ink/[0.04] hover:border-ink/25 active:scale-[0.98]",
        ghost: "bg-transparent text-ink hover:bg-ink/[0.05] active:scale-[0.98]",
        link: "bg-transparent text-vermillion underline-offset-4 hover:underline px-0",
        secondary:
          "bg-ink/[0.06] text-ink hover:bg-ink/[0.1] active:scale-[0.98]",
        glass:
          "border border-ink/10 bg-bone/70 text-ink backdrop-blur-md hover:bg-bone/90 hover:border-ink/20 active:scale-[0.98]",
        destructive:
          "bg-vermillion/[0.08] text-vermillion-deep hover:bg-vermillion/[0.14] active:scale-[0.98]",
      },
      size: {
        sm: "h-9 px-4 text-sm rounded-full",
        default: "h-11 px-6 text-[15px] rounded-full",
        lg: "h-14 px-8 text-base rounded-full",
        xl: "h-16 px-10 text-[17px] rounded-full font-semibold tracking-[-0.01em]",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
