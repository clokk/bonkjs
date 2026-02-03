import React from 'react';
import { cn } from '@editor/lib/utils';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ title, children, className, actions, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col h-full overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-900',
          className
        )}
        {...props}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 px-3 py-1 select-none">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400/80 font-mono">
              {title}
            </span>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        )}
        <div className="relative flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }
);

Panel.displayName = 'Panel';
