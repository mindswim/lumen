'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  className?: string;
}

export function PanelSection({
  title,
  children,
  defaultOpen = true,
  collapsible = false,
  className,
}: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('space-y-4', className)}>
      {collapsible ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-base font-medium text-white hover:text-neutral-300 transition-colors"
        >
          <svg
            className={cn(
              'w-3 h-3 transition-transform duration-200',
              isOpen ? 'rotate-0' : '-rotate-90'
            )}
            fill="currentColor"
            viewBox="0 0 12 12"
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          {title}
        </button>
      ) : (
        <h3 className="text-base font-medium text-white">{title}</h3>
      )}
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
      className={cn('h-px bg-neutral-800 my-6', className)}
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
    <div className={cn('px-4 py-4', className)}>
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
        <p className="text-xs text-neutral-600 mt-1">{description}</p>
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
