'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface PanelSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  onReset?: () => void;
  className?: string;
}

export function PanelSection({
  title,
  children,
  defaultOpen = true,
  collapsible = true,
  onReset,
  className,
}: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        {collapsible ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-sm font-medium text-white hover:text-neutral-300 transition-colors"
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                !isOpen && '-rotate-90'
              )}
            />
            {title}
          </button>
        ) : (
          <h3 className="text-sm font-medium text-white">{title}</h3>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      {(!collapsible || isOpen) && (
        <div className="space-y-4">{children}</div>
      )}
    </div>
  );
}

interface PanelDividerProps {
  className?: string;
}

export function PanelDivider({ className }: PanelDividerProps) {
  return (
    <div
      className={cn('h-px bg-neutral-800 -mx-4', className)}
      role="separator"
    />
  );
}

interface PanelContainerProps {
  children: ReactNode;
  className?: string;
}

export function PanelContainer({ children, className }: PanelContainerProps) {
  return (
    <div className={cn('p-4 space-y-6', className)}>
      {children}
    </div>
  );
}

interface PanelEmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PanelEmptyState({
  title,
  description,
  action,
  className,
}: PanelEmptyStateProps) {
  return (
    <div className={cn('py-8 text-center', className)}>
      <p className="text-sm text-neutral-500">{title}</p>
      {description && (
        <p className="text-xs text-neutral-400 mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface PanelHintProps {
  children: ReactNode;
  className?: string;
}

export function PanelHint({ children, className }: PanelHintProps) {
  return (
    <p className={cn('text-xs text-neutral-500', className)}>
      {children}
    </p>
  );
}
