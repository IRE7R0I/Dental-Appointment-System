import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  position?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  delayDuration?: number;
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({
  children,
  content,
  side,
  position,
  align = 'center',
  className = '',
  delayDuration = 200,
}: TooltipProps) {
  const actualSide = side || position || 'top';

  if (!content) return <>{children}</>;

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={actualSide}
          align={align}
          sideOffset={6}
          className={cn(
            "z-[100] overflow-hidden rounded-lg bg-neutral-warm-900 border border-neutral-warm-800 px-3 py-1.5 text-xs font-medium text-white shadow-md animate-fade-in",
            className
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-neutral-warm-900" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
