"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Force light theme on mount
  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", "#ffffff");
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    // Ignore setting theme, always light
  };

  const toggleTheme = () => {
    // Ignore toggling theme, always light
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme: "light", resolvedTheme: "light", setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Theme toggle button component (hidden or disabled conceptually, but kept for compatibility)
export function ThemeToggle({ className = "" }: { className?: string }) {
  // Theme is locked to light
  return null; 
}

// Theme selector with all options (hidden conceptually, but kept for compatibility)
export function ThemeSelector({ className = "" }: { className?: string }) {
  // Theme is locked to light
  return null;
}
