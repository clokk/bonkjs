import React from 'react';
import { cn } from '@editor/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm shadow-sm transition-colors',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-zinc-500 focus-visible:outline-none focus-visible:border-sky-400 focus-visible:ring-1 focus-visible:ring-sky-400',
          'disabled:cursor-not-allowed disabled:opacity-50 text-zinc-100 font-mono',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
