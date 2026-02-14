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

// Use new icons where available, fallback to SVGs or duplicates
const illustrations = {
  orders: (
    <img src="/icons/list.svg" alt="Orders" className="w-24 h-24 opacity-50" />
  ),
  products: (
    <img src="/icons/box.svg" alt="Products" className="w-24 h-24 opacity-50" />
  ),
  users: (
    // No user icon provided, using tableware as fallback for now or keeping it generic
    <img src="/icons/tableware.svg" alt="Users" className="w-24 h-24 opacity-50" />
  ),
  categories: (
    <img src="/icons/list.svg" alt="Categories" className="w-24 h-24 opacity-50" />
  ),
  suppliers: (
    <img src="/icons/box.svg" alt="Suppliers" className="w-24 h-24 opacity-50" />
  ),
  departments: (
    <img src="/icons/tableware.svg" alt="Departments" className="w-24 h-24 opacity-50" />
  ),
  search: (
    <img src="/icons/magnifier.svg" alt="Search" className="w-24 h-24 opacity-50" />
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
