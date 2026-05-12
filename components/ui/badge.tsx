import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-100 text-brand-800 dark:bg-brand-500/18 dark:text-brand-200 dark:ring-1 dark:ring-brand-400/25",
        success: "bg-green-100 text-green-800 dark:bg-emerald-500/18 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/25",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/18 dark:text-amber-200 dark:ring-1 dark:ring-amber-400/25",
        danger: "bg-red-100 text-red-800 dark:bg-red-500/18 dark:text-red-200 dark:ring-1 dark:ring-red-400/25",
        info: "bg-blue-100 text-blue-800 dark:bg-sky-500/18 dark:text-sky-200 dark:ring-1 dark:ring-sky-400/25",
        secondary: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 dark:ring-1 dark:ring-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
