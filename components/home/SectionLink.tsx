"use client";

import Link from "next/link";
import { formatProducts } from "@/lib/plural";

interface Section {
  id: string;
  name: string;
  emoji: string;
  custom_products_count?: number;
}

function getSectionIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("склад")) return "/icons/box.svg";
  if (lower.includes("бар")) return "/icons/martini.svg";
  if (lower.includes("хоз") || lower.includes("cleaning") || lower.includes("горничная"))
    return "/icons/broom.svg";
  if (lower.includes("кухня")) return "/icons/tableware.svg";
  return "/icons/tableware.svg";
}

export function HomeSectionLink({ section }: { section: Section }) {
  return (
    <Link
      key={section.id}
      href={`/custom?section_id=${section.id}&dept=${encodeURIComponent(section.name)}`}
      className="w-full bg-white hover:bg-[#faf9f7] active:bg-[#f5f3f1] transition-colors duration-150 flex items-center overflow-hidden rounded-[14px]"
    >
      {/* Colored left bar */}
      <div className={`w-1.5 self-stretch shrink-0 ${getSectionBarColor(section.name)}`} />
      
      <div className="flex items-center justify-start px-4 py-3.5 flex-1 min-w-0">
        <img
          src={getSectionIcon(section.name)}
          alt={section.name}
          className="w-8 h-8 md:w-9 md:h-9 mr-3 md:mr-4 opacity-70 shrink-0"
        />
        <div className="text-left flex-1 min-w-0">
          <div className="font-semibold text-[15px] md:text-base text-[#1a1008]">{section.name}</div>
          <div className="text-[13px] text-gray-400 mt-0.5">
            {formatProducts(section.custom_products_count || 0)}
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-300 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function getSectionBarColor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('кухня')) return 'bg-orange-400';
  if (lower.includes('бар')) return 'bg-purple-400';
  if (lower.includes('горничная')) return 'bg-pink-400';
  if (lower.includes('склад')) return 'bg-gray-400';
  if (lower.includes('офис')) return 'bg-blue-400';
  if (lower.includes('ресепшн')) return 'bg-indigo-400';
  return 'bg-brand-400';
}
