import { ReactNode, HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "outlined" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      variant = "default",
      padding = "md",
      hoverable = false,
      ...props
    },
    ref
  ) => {
    const baseStyles = "bg-white dark:bg-gray-800 rounded-lg";

    const variants = {
      default: "border border-gray-200 dark:border-gray-700",
      outlined: "border-2 border-gray-200 dark:border-gray-700",
      elevated: "shadow-md dark:shadow-gray-900/50",
    };

    const paddings = {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    };

    const hoverStyles = hoverable
      ? "cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
      : "";

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// Card subcomponents
export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-900 dark:text-white", className)}>
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 mt-4 pt-4 border-t dark:border-gray-700", className)}>
      {children}
    </div>
  );
}

export { Card };
