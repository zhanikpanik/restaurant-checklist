
import { Fragment, ReactNode, useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  footer?: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  footer,
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container - Bottom sheet on mobile, centered on desktop */}
      <div className="flex min-h-full items-end md:items-center justify-center p-0 md:p-4">
        <div
          className={cn(
            "relative w-full bg-white dark:bg-gray-800 shadow-xl transform transition-all",
            // Mobile: full width, rounded top, slide up from bottom
            "rounded-t-2xl md:rounded-xl",
            // Mobile: max height with scroll, Desktop: normal sizing
            "max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col",
            // Desktop sizes
            `md:${sizes[size]}`
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
              {/* Mobile drag handle */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full md:hidden" />
              
              {title && (
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white pt-2 md:pt-0">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors ml-auto"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content - scrollable */}
          <div className="p-4 dark:text-gray-200 overflow-y-auto flex-1">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
