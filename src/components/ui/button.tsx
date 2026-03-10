"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default:     "bg-indigo-600 text-white hover:bg-indigo-700",
        destructive: "bg-red-600/90 text-white hover:bg-red-600",
        outline:     "border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white",
        secondary:   "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        ghost:       "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
        link:        "text-indigo-400 underline-offset-4 hover:underline p-0 h-auto",
        success:     "bg-emerald-600 text-white hover:bg-emerald-700",
        warning:     "bg-amber-600 text-white hover:bg-amber-700",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-7 rounded-md px-3 text-xs",
        lg:      "h-10 rounded-md px-6",
        icon:    "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
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
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
