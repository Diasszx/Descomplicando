import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', role, ...props }, ref) => {
    const variantClasses = {
      default: 'border-border bg-muted/60 text-foreground',
      destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
      success: 'border-status-easy/40 bg-game-emerald-subtle text-game-emerald-foreground',
      warning: 'border-status-medium/40 bg-game-amber-subtle text-game-amber-foreground',
    }[variant];

    const resolvedRole = role ?? (variant === 'destructive' ? 'alert' : 'status');

    return (
      <div
        ref={ref}
        role={resolvedRole}
        className={cn(
          'relative w-full rounded-2xl border p-4 text-sm leading-relaxed flex items-start gap-3',
          variantClasses,
          className,
        )}
        {...props}
      />
    );
  },
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('font-bold leading-tight tracking-tight', className)} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';
