"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { HomeStatusCard } from "@/components/home/StatusCard";
import { HomeSectionLink } from "@/components/home/SectionLink";
import { plural } from "@/lib/plural";
import type { Order } from "@/types";
import { clientCache, fetchWithCache } from "@/lib/client-cache";

interface Section {
  id: string;
  name: string;
  emoji: string;
  poster_storage_id?: string;
  custom_products_count?: number;
}

interface OrderSummary {
  type: "pending" | "transit" | "last_order";
  count: number;
  departments?: Record<string, number>;
  suppliers?: Record<string, number>;
  lastOrder?: Order;
}

interface DashboardData {
  sections: Section[];
  userSectionIds: number[];
  orderSummary: OrderSummary | null;
  unsortedCount: number | null;
}

const DASHBOARD_URL = "/api/home-dashboard";

export default function HomePage() {
  const { data: session, status } = useSession();

  const [allSections, setAllSections] = useState<Section[]>(() => {
    const cached = clientCache.get(DASHBOARD_URL);
    return cached?.data?.sections || [];
  });

  const [userSectionIds, setUserSectionIds] = useState<number[]>(() => {
    const cached = clientCache.get(DASHBOARD_URL);
    return cached?.data?.userSectionIds || [];
  });

  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(() => {
    const cached = clientCache.get(DASHBOARD_URL);
    return cached?.data?.orderSummary ?? null;
  });

  const [unsortedCount, setUnsortedCount] = useState<number | null>(() => {
    const cached = clientCache.get(DASHBOARD_URL);
    return cached?.data?.unsortedCount ?? null;
  });

  const [loading, setLoading] = useState(!clientCache.has(DASHBOARD_URL));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isAdmin = session?.user?.role === "admin";
  const isManager = session?.user?.role === "manager";
  const isDelivery = session?.user?.role === "delivery";
  const isStaff = session?.user?.role === "staff";

  // ── Data loading (single batched request) ─────────────────

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchWithCache(DASHBOARD_URL);
      if (data.success && data.data) {
        const d = data.data as DashboardData;
        setAllSections(d.sections || []);
        setUserSectionIds(d.userSectionIds || []);
        setOrderSummary(d.orderSummary ?? null);
        setUnsortedCount(d.unsortedCount ?? null);
        setError(null);
      } else {
        setError("База данных недоступна. Проверьте подключение.");
      }
    } catch {
      setError("Не удалось загрузить данные. Проверьте подключение к базе данных.");
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadDashboard().finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, loadDashboard]);

  // ── Derived state ─────────────────────────────────────────

  const sections =
    isAdmin || isManager
      ? allSections
      : allSections.filter((s) => userSectionIds.includes(parseInt(s.id)));

  const hasNoAssignedSections =
    !isAdmin && !isManager && !isDelivery && userSectionIds.length === 0 && allSections.length > 0;

  // Auto-redirect single-section staff
  useEffect(() => {
    if (!loading && isStaff && sections.length === 1) {
      const s = sections[0];
      router.replace(`/custom?section_id=${s.id}&dept=${encodeURIComponent(s.name)}`);
    }
  }, [loading, isStaff, sections, router]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20" style={{ background: '#faf9f7' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {session?.user?.restaurantName || "Ресторан"}
          </h1>
          <p className="text-sm text-gray-500">Система управления закупками</p>
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-brand-500 rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Загрузка отделов...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-red-700 mb-2">Ошибка загрузки</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadDashboard}
                className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg"
              >
                Попробовать снова
              </button>
            </div>
          )}

          {/* No assigned sections */}
          {!loading && !error && hasNoAssignedSections && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Нет доступных отделов</h3>
              <p className="text-gray-600 mb-4">Вам не назначены отделы. Обратитесь к администратору.</p>
            </div>
          )}

          {/* No sections at all */}
          {!loading && !error && !hasNoAssignedSections && allSections.length === 0 && (
            <div className="text-center py-8">
              <img src="/icons/box.svg" alt="Empty" className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Отделы не найдены</h3>
              <p className="text-gray-600 mb-4">Для текущего ресторана отделы не настроены</p>
              {process.env.NODE_ENV === "development" && (
                <Link
                  href="/dev/switch-restaurant"
                  className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
                >
                  Dev: Выбрать другой ресторан
                </Link>
              )}
            </div>
          )}

          {/* Main content */}
          {!loading && !error && !hasNoAssignedSections && allSections.length > 0 && (
            <>
              {orderSummary && <HomeStatusCard summary={orderSummary} />}

              {/* Manager quick-actions */}
              {(isAdmin || isManager) && (
                <div className="flex flex-col gap-2 mb-2">
                  <Link
                    href="/suppliers-categories"
                    className="w-full bg-white hover:bg-[#faf9f7] active:bg-[#f5f3f1] transition-colors duration-150 flex items-center overflow-hidden rounded-[14px]"
                  >
                    <div className="w-1.5 self-stretch shrink-0 bg-brand-500" />
                    <div className="flex items-center justify-start px-4 py-3.5 flex-1 min-w-0">
                      <img src="/icons/box.svg" alt="" className="w-8 h-8 mr-3 opacity-70 shrink-0" />
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-semibold text-[15px] text-[#1a1008]">Поставщики</div>
                        {unsortedCount !== null && unsortedCount > 0 && (
                          <div className="text-[13px] text-gray-400 mt-0.5">
                            {unsortedCount} {plural(unsortedCount, ["товар", "товара", "товаров"])} без поставщика
                          </div>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-300 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>

                  <Link
                    href="/team"
                    className="w-full bg-white hover:bg-[#faf9f7] active:bg-[#f5f3f1] transition-colors duration-150 flex items-center overflow-hidden rounded-[14px]"
                  >
                    <div className="w-1.5 self-stretch shrink-0 bg-brand-600" />
                    <div className="flex items-center justify-start px-4 py-3.5 flex-1 min-w-0">
                      <img src="/icons/face.svg" alt="" className="w-8 h-8 mr-3 opacity-70 shrink-0" />
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-semibold text-[15px] text-[#1a1008]">Команда</div>
                        <div className="text-[13px] text-gray-400 mt-0.5">Доступ и роли</div>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </div>
              )}

              {/* Sections */}
              {sections.map((section) => (
                <HomeSectionLink key={section.id} section={section} />
              ))}

              {/* Footer */}
              <div className="mt-8 pt-6">
                <div className="flex flex-col gap-1">
                  <Link
                    href="/help"
                    className="flex items-center justify-between px-4 py-3.5 rounded-[14px] text-[14px] text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
                  >
                    Помощь и инструкции
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <a
                    href="https://wa.me/77012345678"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3.5 rounded-[14px] text-[14px] text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
                  >
                    Написать в поддержку
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
