"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  rightContent?: ReactNode;
  showBackButton?: boolean;
  backUrl?: string;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Главная",
  rightContent,
  showBackButton = true,
  backUrl,
}: PageHeaderProps) {
  const finalBackHref = backUrl || backHref || "/";
  
  return (
    <div className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-3 py-3 md:px-4 md:py-4">
        {/* Mobile: Stacked layout */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex items-center justify-between">
            {showBackButton && (
              <Link
                href={finalBackHref}
                className="text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                ← {backLabel}
              </Link>
            )}
            {rightContent && (
              <div className="text-sm text-gray-600">{rightContent}</div>
            )}
          </div>
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>

        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Link
                href={finalBackHref}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← {backLabel}
              </Link>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          {rightContent && (
            <div className="text-sm text-gray-600">{rightContent}</div>
          )}
        </div>
      </div>
    </div>
  );
}
