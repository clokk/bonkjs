import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@editor/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-zinc-800 border border-sky-400/30 text-sky-400 hover:bg-sky-400 hover:text-zinc-950 hover:border-sky-400 transition-all duration-200',
        destructive:
          'bg-red-500/10 border border-red-400/50 text-red-400 hover:bg-red-500 hover:text-white',
        outline:
          'border border-sky-400/30 bg-transparent hover:bg-sky-400/10 text-sky-400',
        secondary:
          'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700',
        ghost: 'hover:bg-sky-400/10 hover:text-sky-400 text-zinc-400',
        link: 'text-sky-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
