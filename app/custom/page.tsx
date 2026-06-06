"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { FormInput, FormSelect, FormButton } from "@/components/ui/BottomSheet";
import { DepartmentSettingsModal } from "@/components/department/DepartmentSettingsModal";
import {
  useCustomSection,
  getStatusLabel,
  getStatusColor,
  formatRelativeDate,
  translateUnit,
} from "@/hooks/useCustomSection";
import type { Category } from "@/hooks/useCustomSection";

// ── Header ──────────────────────────────────────────────────
function Header({
  sectionName,
  dept,
  canManage,
}: {
  sectionName: string;
  dept: string | null;
  canManage: boolean;
  pendingOrdersCount: number;
  onAddSupplier: () => void;
  onOpenSettings?: () => void;
  assignedUsersCount?: number;
}) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {canManage ? (
          <Link href="/" className="w-10 h-10 rounded-[14px] bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500" aria-label="На главную">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        ) : (
          <div className="w-10" />
        )}
        <h1 className="text-lg font-semibold text-[#1a1008] truncate max-w-[220px] text-center">
          {sectionName || dept || 'Товары'}
        </h1>
        <div className="w-10" />
      </div>
    </header>
  );
}

// ── Last Order Card ─────────────────────────────────────────
function LastOrderCard({ lastOrder }: { lastOrder: any }) {
  return (
    <Link href="/orders" className="block bg-white border-b border-gray-100">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3 group">
        <img src="/icons/box.svg" alt="" className="w-8 h-8 opacity-40" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${getStatusColor(lastOrder.status)}`}>
              {getStatusLabel(lastOrder.status)}
            </span>
            <span>·</span>
            <span>{formatRelativeDate(lastOrder.created_at)}</span>
          </p>
          <p className="text-sm font-medium text-[#1a1008]">Последний заказ</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// ── Search Bar ──────────────────────────────────────────────
function SearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <img src="/icons/magnifier.svg" alt="" className="h-4 w-4 opacity-35" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 pl-10 pr-10 bg-[#f5f3f1] border-0 rounded-[12px] text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white"
          placeholder="Поиск товаров..."
          autoComplete="off"
        />
        {value && (
          <button onClick={onClear} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Product List (sectioned: InCart | Low | Rest) ──────────
function ProductList() {
  const {
    lowProducts,
    restProducts,
    cart,
    handleToggleCart,
  } = useCustomSection();

  const inCartIds = new Set(cart.items.filter(i => i.productId).map(i => i.productId));

  const renderRow = (product: any) => {
    const isInCart = inCartIds.has(product.id);
    const days = product.days_remaining;
    const isLow = days != null && days < (product.stock_alert_days || 2);
    const isWriteoff = product.is_manual_check;
    const lastOrder = product.last_order_at;
    const daysSince = lastOrder ? Math.floor((Date.now() - new Date(lastOrder).getTime()) / 86400000) : null;
    // Мета-строка: На 4 мес · Осталось 5 кг
    const metaSegments: { text: string; muted?: boolean }[] = [];
    
    if (days != null) {
      const displayDays = Math.round(days);
      if (displayDays <= 0) {
        metaSegments.push({ text: 'Заканчивается' });
      } else if (displayDays === 1) {
        metaSegments.push({ text: 'На ', muted: true }, { text: 'день' });
      } else if (displayDays < 30) {
        metaSegments.push({ text: 'На ', muted: true }, { text: `${displayDays} дн` });
      } else if (displayDays < 60) {
        metaSegments.push({ text: 'На ', muted: true }, { text: 'месяц' });
      } else if (displayDays < 365) {
        metaSegments.push({ text: 'На ', muted: true }, { text: `${Math.round(displayDays / 30)} мес` });
      } else {
        metaSegments.push({ text: 'Надолго' });
      }
    }
    
    const stockNum = product.stock != null ? Number(product.stock) : null;
    if (stockNum != null) {
      const stockStr = stockNum % 1 === 0 ? stockNum.toString() : stockNum.toFixed(1).replace(/\.0$/, '');
      if (metaSegments.length > 0) metaSegments.push({ text: ' \u00b7 ', muted: true });
      metaSegments.push({ text: 'Осталось ', muted: true }, { text: `${stockStr} ${translateUnit(product.unit)}` });
    }
    
    if (isWriteoff && !lastOrder && metaSegments.length === 0) {
      metaSegments.push({ text: 'Нет заказов' });
    }

    return (
      <div
        key={product.id}
        onClick={() => handleToggleCart(product)}
        className="cursor-pointer select-none"
      >
        <div
          className="flex items-center gap-3 min-h-[44px] transition-colors active:bg-black/5"
        >
          {/* Leading circle — iOS-style: всегда есть, показывает статус */}
          <span
            className={`w-[22px] h-[22px] rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
              isInCart
                ? 'bg-brand-500 border-brand-500'
                : 'border-gray-300'
            }`}
          >
            {isInCart && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 py-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-medium text-[#1a1008] truncate">
                {product.name}
              </span>
            </div>
            {metaSegments.length > 0 && (
              <p className={`text-sm truncate ${isLow && !isInCart ? 'text-amber-600' : ''}`}>
                {metaSegments.map((s, i) => (
                  <span key={i} className={s.muted ? 'text-gray-400' : isLow && !isInCart ? 'text-amber-600' : 'text-[#1a1008]'}>
                    {s.text}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
        <div className="border-b border-gray-100/80 ml-[50px]" />
      </div>
    );
  };

  return (
    <div className="bg-white">
      {/* Заканчивается */}
      {lowProducts.length > 0 && (
        <>
          <div className="flex items-center gap-2 py-1.5 bg-amber-50/60 border-b border-amber-100/60">
            <span className="text-sm font-medium text-amber-600">Заканчивается</span>
            <span className="text-sm bg-amber-100 text-amber-600 px-1.5 py-px rounded-full font-medium">{lowProducts.length}</span>
          </div>
          {lowProducts.map(renderRow)}
        </>
      )}

      {/* Остальное */}
      {restProducts.length > 0 && restProducts.map(renderRow)}
    </div>
  );
}

// ── Product Modal ──────────────────────────────────────────
function ProductModalContent({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    productForm,
    setProductForm,
    editingProduct,
    submitting,
    categories,
    handleCreateProduct,
    handleUpdateProduct,
    closeProductModal,
  } = useCustomSection();

  const unitOptions = [
    { value: "шт", label: "Штуки" },
    { value: "кг", label: "Килограммы" },
    { value: "л", label: "Литры" },
    { value: "уп", label: "Упаковки" },
    { value: "бут", label: "Бутылки" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый товар" size="sm">
      <div className="space-y-4">
        <FormInput
          label="Название"
          value={productForm.name}
          onChange={(v) => setProductForm({ ...productForm, name: v })}
          placeholder="Например: Яблоки"
          required
          autoFocus
        />
        <FormSelect
          label="Единица измерения"
          value={productForm.unit}
          onChange={(v) => setProductForm({ ...productForm, unit: v })}
          options={unitOptions}
        />
        {categories.length > 0 && (
          <FormSelect
            label="Категория"
            value={productForm.category_id}
            onChange={(v) => setProductForm({ ...productForm, category_id: v })}
            options={categories.map((c: Category) => ({
              value: c.id,
              label: c.name,
            }))}
            placeholder="Выберите категорию"
          />
        )}
        <div className="mt-6">
          <FormButton
            onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}
            loading={submitting}
          >
            {editingProduct ? "Обновить товар" : "Добавить товар"}
          </FormButton>
        </div>
      </div>
    </Modal>
  );
}

// ── Empty State ─────────────────────────────────────────────
function EmptyState({ canManage }: { canManage: boolean }) {
  const { router } = useCustomSection();
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#f5f3f1' }}>
        <img src="/icons/box.svg" alt="" className="w-8 h-8 opacity-25" />
      </div>
      <h3 className="text-lg font-semibold text-[#1a1008] mb-1.5">Отдел пуст</h3>
      <p className="text-sm text-gray-400 mb-8 max-w-[260px] mx-auto leading-relaxed">
        {canManage
          ? 'В этом отделе пока нет товаров. Синхронизируйте данные с Poster.'
          : 'В этом отделе пока нет доступных товаров.'}
      </p>
      {canManage && (
        <button
          onClick={() => router.push('/suppliers-categories')}
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-[14px] shadow-sm shadow-brand-500/20 transition-all active:scale-[0.98] text-sm"
        >
          🔄 Синхронизировать
        </button>
      )}
    </div>
  );
}

// ── No Suppliers State ──────────────────────────────────────
function NoSuppliersState({
  canManage,
  sectionName,
  dept,
  pendingOrdersCount,
  assignedUsersCount,
}: {
  canManage: boolean;
  sectionName: string;
  dept: string | null;
  pendingOrdersCount: number;
  assignedUsersCount: number;
}) {
  const { router, setShowSettingsModal } = useCustomSection();

  return (
    <div className="min-h-screen bg-white">
      <Header
        sectionName={sectionName}
        dept={dept}
        canManage={canManage}
        pendingOrdersCount={pendingOrdersCount}
        onAddSupplier={() => router.push("/suppliers-categories")}
        onOpenSettings={() => setShowSettingsModal(true)}
        assignedUsersCount={assignedUsersCount}
      />
      <main className="max-w-md mx-auto px-4 py-12 text-center">
        <img
          src="/icons/box.svg"
          alt="Suppliers"
          className="w-16 h-16 mx-auto mb-6 opacity-50"
        />
        <h2 className="text-xl font-semibold text-[#1a1008] mb-3">
          Нет поставщиков
        </h2>
        <p className="text-gray-500 mb-6">
          Создайте первого поставщика, чтобы начать добавлять товары
        </p>
        {canManage ? (
          <Link
            href="/suppliers-categories"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-3 rounded-[14px] transition-colors shadow-sm shadow-brand-500/20"
          >
            <span className="text-lg">+</span>
            Создать поставщика
          </Link>
        ) : (
          <p className="text-sm text-gray-400">
            Обратитесь к менеджеру для настройки
          </p>
        )}
      </main>
    </div>
  );
}

// ── Loading ─────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  );
}

// ── Main Page Content ──────────────────────────────────────
function CustomPageContent() {
  const {
    loading,
    suppliers,
    products,
    sectionName,
    dept,
    canManage,
    pendingOrdersCount,
    assignedUsersCount,
    lastOrder,
    loadingLastOrder,
    searchQuery,
    setSearchQuery,
    currentProducts,
    showProductModal,
    showSettingsModal,
    setShowSettingsModal,
    closeProductModal,
    currentSection,
    cart,
    loadData,
    router,
  } = useCustomSection();

  if (loading) return <LoadingSpinner />;

  if (suppliers.length === 0 && products.length === 0) {
    return (
      <NoSuppliersState
        canManage={canManage}
        sectionName={sectionName}
        dept={dept}
        pendingOrdersCount={pendingOrdersCount}
        assignedUsersCount={assignedUsersCount}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        sectionName={sectionName}
        dept={dept}
        canManage={canManage}
        pendingOrdersCount={pendingOrdersCount}
        onAddSupplier={() => router.push("/suppliers-categories")}
        onOpenSettings={() => setShowSettingsModal(true)}
        assignedUsersCount={assignedUsersCount}
      />

      {lastOrder && !loadingLastOrder && <LastOrderCard lastOrder={lastOrder} />}

      {products.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
      )}

      <main className="max-w-md mx-auto px-4 pb-24">
        {products.length === 0 ? (
          <EmptyState canManage={canManage} />
        ) : searchQuery && currentProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Товары не найдены</p>
          </div>
        ) : (
          <ProductList />
        )}
      </main>

      {cart.count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3" style={{ background: 'linear-gradient(to top, white 60%, transparent)' }}>
          <Link
            href="/cart"
            className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base py-4 rounded-[14px] shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]"
          >
            📋 Заявка
            <span className="bg-white/20 text-white text-sm px-2 py-0.5 rounded-full">{cart.count}</span>
          </Link>
        </div>
      )}

      <ProductModalContent
        isOpen={showProductModal}
        onClose={closeProductModal}
      />

      {currentSection && (
        <DepartmentSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          section={currentSection}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

// ── Export ──────────────────────────────────────────────────
export default function CustomPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CustomPageContent />
    </Suspense>
  );
}
