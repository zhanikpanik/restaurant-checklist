"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  rightContent?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Главная",
  rightContent,
}: PageHeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={backHref}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← {backLabel}
            </Link>
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
