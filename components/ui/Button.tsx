import { ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    const variants = {
      primary:
        "bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/20 focus:ring-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600",
      secondary:
        "bg-white shadow-sm ring-1 ring-gray-900/5 hover:bg-gray-50 text-gray-700 focus:ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 dark:hover:bg-gray-700 dark:text-gray-200",
      danger:
        "bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/20 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700",
      ghost:
        "bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-200 dark:hover:bg-gray-800 dark:text-gray-300",
      success:
        "bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-500/20 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-4 py-2 text-sm gap-2",
      lg: "px-6 py-3 text-base gap-2",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
