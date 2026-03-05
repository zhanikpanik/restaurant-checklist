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
  variant?: "white" | "purple";
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  rightContent,
  showBackButton = true,
  backUrl,
  variant = "white",
}: PageHeaderProps) {
  const finalBackHref = backUrl || backHref || "/";
  
  const bgClass = variant === "purple" 
    ? "bg-purple-600 text-white border-b-0" 
    : "bg-white text-gray-900 border-b border-gray-200";
  
  const textClass = variant === "purple" ? "text-white" : "text-gray-900";
  const subtitleClass = variant === "purple" ? "text-white/75" : "text-gray-500";
  const backBtnClass = variant === "purple" 
    ? "bg-white/10 hover:bg-white/20 text-white" 
    : "bg-gray-100 hover:bg-gray-200 text-gray-600";
  
  return (
    <header className={`${bgClass} sticky top-0 z-50`}>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="relative flex items-center justify-center">
          {showBackButton && (
            <Link
              href={finalBackHref}
              className={`absolute left-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${backBtnClass}`}
              aria-label={backLabel || "Назад"}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          )}
          
          <div className="text-center">
            <h1 className={`text-xl font-bold ${textClass}`}>{title}</h1>
            {subtitle && (
              <p className={`text-xs mt-0.5 ${subtitleClass}`}>{subtitle}</p>
            )}
          </div>

          {rightContent && (
            <div className={`absolute right-0 text-sm ${subtitleClass}`}>
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
