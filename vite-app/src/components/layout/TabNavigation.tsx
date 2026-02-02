
import { ReactNode, useRef, useEffect, useState } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // Check scroll position to show/hide fade indicators
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftFade(scrollLeft > 0);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      ref?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  // Scroll active tab into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeButton = scrollRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
    if (activeButton) {
      activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTab]);

  return (
    <div className="relative mb-6">
      {/* Desktop: Full tabs */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm p-1 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-shrink-0 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: Scrollable pills with fade indicators */}
      <div className="md:hidden relative">
        {/* Left fade indicator */}
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
        )}
        
        {/* Right fade indicator */}
        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1 -mx-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-shrink-0 py-2.5 px-4 rounded-full font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {tab.icon && <span className="mr-1">{tab.icon}</span>}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TabPanelProps {
  children: ReactNode;
  isActive: boolean;
}

export function TabPanel({ children, isActive }: TabPanelProps) {
  if (!isActive) return null;
  return <div className="bg-white rounded-lg shadow-sm">{children}</div>;
}
