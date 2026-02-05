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
    ? "bg-purple-600 text-white" 
    : "bg-white text-gray-800 border-b shadow-sm";
  
  const textClass = variant === "purple" ? "text-white" : "text-gray-800";
  const subtitleClass = variant === "purple" ? "text-white/75" : "text-gray-500";
  const iconClass = variant === "purple" ? "text-white" : "text-gray-600";
  const hoverClass = variant === "purple" ? "hover:bg-white/10" : "hover:bg-gray-100";
  
  return (
    <header className={`${bgClass} sticky top-0 z-10`}>
      <div className="max-w-2xl mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center">
          {showBackButton && (
            <Link
              href={finalBackHref}
              className={`flex items-center justify-center w-10 h-10 ${hoverClass} rounded-full transition-all duration-200 active:scale-95 mr-3`}
              aria-label={backLabel || "Назад"}
            >
              <svg
                className={`w-6 h-6 ${iconClass}`}
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
          <div className="flex-1">
            <h1 className={`text-xl font-semibold ${textClass}`}>{title}</h1>
            {subtitle && (
              <p className={`text-sm ${subtitleClass}`}>{subtitle}</p>
            )}
          </div>
          {rightContent && (
            <div className={`text-sm ${subtitleClass}`}>{rightContent}</div>
          )}
        </div>
      </div>
    </header>
  );
}
