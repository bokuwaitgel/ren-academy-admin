import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)]",
        secondary:   "border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)]",
        destructive: "border-red-900 bg-red-950/50 text-red-400",
        outline:     "border-[var(--border-color)] text-[var(--text-secondary)] bg-transparent",
        success:     "border-emerald-900 bg-emerald-950/50 text-emerald-400",
        warning:     "border-amber-900 bg-amber-950/50 text-amber-400",
        indigo:      "border-indigo-900 bg-indigo-950/50 text-indigo-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
