import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15',
        secondary:
          'border-border/60 bg-secondary/80 text-secondary-foreground hover:bg-secondary',
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15',
        outline:
          'border-border/80 text-foreground bg-background/50',
        success:
          'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        warning:
          'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        info:
          'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400',
        purple:
          'border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-400',
      },
    },
    defaultVariants: {
      variant: 'default',
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
