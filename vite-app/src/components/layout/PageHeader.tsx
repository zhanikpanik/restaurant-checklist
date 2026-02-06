import { Link } from "react-router-dom";
import { ReactNode } from "react";
import { UserMenu } from "@/components/auth/UserMenu";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  rightContent?: ReactNode;
  showUserMenu?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Главная",
  rightContent,
  showUserMenu = true,
}: PageHeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-3 py-3 md:px-4 md:py-4">
        {/* Mobile: Stacked layout */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex items-center justify-between">
            <Link
              to={backHref}
              className="text-gray-600 hover:text-gray-800 transition-colors text-sm"
            >
              ← {backLabel}
            </Link>
            <div className="flex items-center gap-2">
              {rightContent && (
                <div className="text-sm text-gray-600">{rightContent}</div>
              )}
              {showUserMenu && <UserMenu />}
            </div>
          </div>
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>

        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={backHref}
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
          <div className="flex items-center gap-4">
            {rightContent && (
              <div className="text-sm text-gray-600">{rightContent}</div>
            )}
            {showUserMenu && <UserMenu />}
          </div>
        </div>
      </div>
    </div>
  );
}
