"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// SVG illustrations for different contexts
const illustrations = {
  orders: (
    <svg className="w-24 h-24 text-gray-300" fill="none" viewBox="0 0 96 96">
      <rect x="16" y="20" width="64" height="56" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M16 32h64" stroke="currentColor" strokeWidth="2" />
      <circle cx="28" cy="26" r="2" fill="currentColor" />
      <circle cx="36" cy="26" r="2" fill="currentColor" />
      <circle cx="44" cy="26" r="2" fill="currentColor" />
      <path d="M28 44h40M28 52h32M28 60h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  products: (
    <svg className="w-24 h-24 text-gray-300" fill="none" viewBox="0 0 96 96">
      <path d="M48 16L80 32v32L48 80 16 64V32l32-16z" stroke="currentColor" strokeWidth="2" />
      <path d="M16 32l32 16 32-16M48 48v32" stroke="currentColor" strokeWidth="2" />
      <circle cx="48" cy="48" r="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  users: (
    <svg className="w-24 h-24 text-gray-300" fill="none" viewBox="0 0 96 96">
      <circle cx="48" cy="36" r="12" stroke="currentColor" strokeWidth="2" />
      <path d="M24 76c0-13.255 10.745-24 24-24s24 10.745 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="72" cy="44" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M80 72c0-8.837-3.582-16-8-16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  categories: (
    <svg className="w-24 h-24 text-gray-300" fill="none" viewBox="0 0 96 96">
      <rect x="16" y="16" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="52" y="16" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="16" y="52" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="52" y="52" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  suppliers: (
    <svg className="w-24 h-24 text-gray-300" fill="none" viewBox="0 0 96 96">
      <rect x="12" y="40" width="32" height="36" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M44 52h28l12 12v12H44V52z" stroke="currentColor" strokeWidth="2" />
      <circle cx="28" cy="76" r="6" stroke="currentColor" strokeWidth="2" />
      <circle cx="72" cy="76" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M20 40V28a8 8 0 018-8h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  departments: (
    <svg className="w-24 h-24 text-gray-300" fill="none" viewBox="0 0 96 96">
      <rect x="32" y="16" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="12" y="52" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="60" y="52" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M48 40v12M24 52V48a4 4 0 014-4h40a4 4 0 014 4v4" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  search: (
    <svg className="w-24 h-24 text-gray-300" fill="none" viewBox="0 0 96 96">
      <circle cx="40" cy="40" r="20" stroke="currentColor" strokeWidth="2" />
      <path d="M54 54l20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 36h16M32 44h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

export type IllustrationType = keyof typeof illustrations;

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Convenience wrapper with built-in illustrations
export function EmptyStateIllustrated({
  type,
  title,
  description,
  action,
}: {
  type: IllustrationType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <EmptyState
      icon={illustrations[type]}
      title={title}
      description={description}
      action={action}
    />
  );
}
