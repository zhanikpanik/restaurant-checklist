"use client";

import { useState } from "react";
import Link from "next/link";
import { QuantityInput } from "@/components/ui/QuantityInput";
import { Modal } from "@/components/ui/Modal";
import { useOrders, translateUnit, formatDate } from "@/hooks/useOrders";

// ── Pending Tab ──────────────────────────────────────────────
function PendingTab() {
  const {
    pendingBySupplier,
    hasPending,
    hasChanges,
    canSendOrders,
    sendingSupplier,
    updating,
    handleSetPendingQuantity,
    handleSaveChanges,
    copyOrderToClipboard,
    sendToWhatsApp,
  } = useOrders();

  if (!hasPending) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#f5f3f1' }}>
          <img src="/icons/box.svg" alt="Box" className="w-8 h-8 opacity-25" />
        </div>
        <h3 className="text-xl font-semibold text-[#1a1008] mb-2">Нет заявок</h3>
        <p className="text-gray-500">Новые заявки появятся здесь</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white pt-4 pb-2">
        {pendingBySupplier.map(([supplier, group]) => (
          <div key={supplier} className="mt-10 first:mt-0">
            <div className="px-4 mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">{supplier}</h3>
              <span className="text-sm text-gray-400">
                {group.items.length} поз.
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {group.items.map((item) => {
                const isZero = item._quantity === 0;
                return (
                  <div
                    key={item._key}
                    className={`px-4 py-3 active:bg-black/5 transition-colors ${
                      isZero ? "opacity-40 bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3
                          className={`text-base font-medium truncate ${
                            isZero
                              ? "text-gray-400 line-through"
                              : "text-[#1a1008]"
                          }`}
                        >
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {item._department || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <QuantityInput
                          productName={item.name}
                          quantity={item._quantity}
                          unit={item.unit || "шт"}
                          onQuantityChange={(newQty) =>
                            handleSetPendingQuantity(item._key, newQty)
                          }
                          min={0}
                          compact={true}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {canSendOrders && (
              <div className="px-4 mt-4 mb-8 pb-6 flex gap-2 border-b border-gray-100">
                <button
                  onClick={() =>
                    copyOrderToClipboard(supplier, group.items)
                  }
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-[14px] text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Скопировать
                </button>
                <button
                  onClick={() => sendToWhatsApp(supplier, group.items)}
                  disabled={sendingSupplier === supplier}
                  className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-3 rounded-[14px] text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-3 flex justify-center" style={{ background: 'linear-gradient(to top, white 60%, transparent)' }}
        >
          <button
            onClick={handleSaveChanges}
            disabled={updating}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-4 rounded-[14px] shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] w-full max-w-md disabled:opacity-70"
          >
            {updating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              <span className="flex items-center justify-center gap-2">💾 Сохранить</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Transit Tab ──────────────────────────────────────────────
function TransitTab() {
  const {
    sentBySupplier,
    receivedQuantities,
    receivedPrices,
    updating,
    handleReceivedQuantityChange,
    handleReceivedPriceChange,
    handleRevertToPending,
    handleOpenConfirmModal,
  } = useOrders();

  if (sentBySupplier.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#f5f3f1' }}>
          <img
            src="/icons/delivery.svg"
            alt="Transit"
            className="w-8 h-8 opacity-25"
          />
        </div>
        <h3 className="text-xl font-semibold text-[#1a1008] mb-2">Нет доставок</h3>
      </div>
    );
  }

  return (
    <div>
      {sentBySupplier.map(([supplier, group]) => {
        const acceptedCount = group.items.filter((i) => {
          const q = receivedQuantities[i._key] ?? i._orderedQty;
          return (q === "" ? 0 : q) > 0;
        }).length;

        return (
          <div key={supplier} className="mb-8 last:mb-0">
            <div className="px-4 flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  {supplier}
                </h3>
              </div>
            </div>
            <div className="bg-white divide-y divide-gray-100">
              {group.items.map((item, idx) => {
                const rawQty =
                  receivedQuantities[item._key] ?? item._orderedQty;
                const currentQty = rawQty === "" ? "" : rawQty;
                const calcQty = rawQty === "" ? 0 : rawQty;
                const isExcluded = calcQty === 0;
                const diff = (calcQty as number) - (item._orderedQty ?? 0);
                const isDifferent = diff !== 0;
                const orderedTextColor = isDifferent
                  ? diff < 0
                    ? "text-orange-600"
                    : "text-green-600"
                  : "text-gray-500";

                return (
                  <div
                    key={idx}
                    className={`px-4 py-3 active:bg-black/5 transition-colors ${
                      isExcluded
                        ? "opacity-40 bg-gray-50"
                        : isDifferent
                          ? "bg-orange-50/30"
                          : ""
                    }`}
                  >
                    <div className="flex items-end sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0 pb-1 sm:pb-0">
                        <h3
                          className={`text-base font-medium text-[#1a1008] leading-tight ${
                            isExcluded ? "line-through" : ""
                          }`}
                        >
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 sm:mt-1">
                          <p
                            className={`text-sm font-medium ${orderedTextColor} whitespace-nowrap`}
                          >
                            Заказано: {item._orderedQty}{" "}
                            {translateUnit(item.unit || "шт")}
                            {isDifferent &&
                              !isExcluded &&
                              ` (${diff > 0 ? "+" : ""}${diff.toFixed(1)})`}
                          </p>
                          {isExcluded && (
                            <span className="text-sm text-gray-400">
                              Пропущено
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 sm:gap-4 shrink-0">
                        {!isExcluded && (
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-sm text-gray-400 font-medium">
                              Цена, ₸
                            </span>
                            <input
                              type="number"
                              value={
                                receivedPrices[item._key] ?? item._receivedPrice
                              }
                              onChange={(e) =>
                                handleReceivedPriceChange(
                                  item._key,
                                  e.target.value
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              className="w-16 sm:w-24 bg-white border border-gray-300 rounded-[12px] px-2 sm:px-3 py-1.5 sm:py-2 text-[#1a1008] text-left text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        )}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-sm text-gray-400 font-medium">
                            Факт
                          </span>
                          <div className="relative">
                            <input
                              type="number"
                              value={currentQty}
                              onChange={(e) =>
                                handleReceivedQuantityChange(
                                  item._key,
                                  e.target.value
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              className={`w-20 sm:w-24 border rounded-[12px] pl-2 sm:pl-3 pr-6 sm:pr-8 py-1.5 sm:py-2 text-left text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all ${
                                isDifferent
                                  ? "bg-orange-50 border-orange-300 text-orange-600"
                                  : "bg-white border-gray-300 text-[#1a1008]"
                              }`}
                              step="0.01"
                              min="0"
                            />
                            <span
                              className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none ${
                                isDifferent
                                  ? "text-orange-500"
                                  : "text-gray-400"
                              }`}
                            >
                              {translateUnit(item.unit || "шт")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 flex gap-3 justify-end border-t border-gray-200 sticky bottom-0 z-30">
              <button
                onClick={() => handleRevertToPending(group.items)}
                disabled={updating}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-500 rounded-[14px] text-sm font-medium transition-colors disabled:opacity-50"
              >
                Вернуть
              </button>
              <button
                onClick={() =>
                  handleOpenConfirmModal(supplier, group.items)
                }
                disabled={updating}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-[14px] text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  `Принять`
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── History Tab ──────────────────────────────────────────────
function HistoryTab() {
  const { historyOrders } = useOrders();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div>
      {historyOrders.map((order) => (
        <div key={order.id}>
          <div
            onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            className="px-4 py-4 active:bg-black/5 transition-colors cursor-pointer border-b border-gray-100/80"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base text-[#1a1008] font-medium">
                #{order.id} · {order.order_data.department}
              </span>
              <span
                className={`text-sm px-2 py-1 rounded-full ${
                  order.status === "delivered"
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-500"
                }`}
              >
                {order.status === "delivered" ? "Доставлено" : "Отменено"}
              </span>
            </div>
            <p className="text-sm text-gray-400">
              {formatDate(order.created_at)} ·{" "}
              {order.order_data.items?.length || 0} позиций ·{" "}
              {order.order_data.items?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0} ед.
            </p>
          </div>
          {expandedId === order.id && (
            <div className="px-4 pb-4 divide-y divide-gray-100/80">
              {order.order_data.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#1a1008]">{item.name}</span>
                  <span className="text-sm text-gray-400">
                    {item.quantity} {translateUnit(item.unit || 'шт')}
                    {item.price ? ` · ${item.price} ₸` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Delivery Confirmation Modal ──────────────────────────────
function DeliveryConfirmModal() {
  const {
    sentBySupplier,
    confirmingSupplier,
    updating,
    setConfirmingSupplier,
    handleConfirmDelivery,
  } = useOrders();

  return (
    <Modal
      isOpen={!!confirmingSupplier}
      onClose={() => !updating && setConfirmingSupplier(null)}
      title="Расхождения"
    >
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3 text-orange-600 bg-orange-50 p-3 rounded-[14px]">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm">
            Часть товаров не была получена. Что сделать с недостающим
            количеством?
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() =>
              confirmingSupplier &&
              handleConfirmDelivery(
                confirmingSupplier,
                sentBySupplier.find((s) => s[0] === confirmingSupplier)?.[1]
                  .items || [],
                "transit"
              )
            }
            disabled={updating}
            className="w-full p-4 text-left hover:bg-gray-50 rounded-[14px] border border-gray-100 transition-colors flex items-center gap-4 group"
          >
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#1a1008] text-sm">
                Оставить «Приёмка»
              </p>
              <p className="text-sm text-gray-400">
                Поставщик довезет их позже
              </p>
            </div>
          </button>

          <button
            onClick={() =>
              confirmingSupplier &&
              handleConfirmDelivery(
                confirmingSupplier,
                sentBySupplier.find((s) => s[0] === confirmingSupplier)?.[1]
                  .items || [],
                "pending"
              )
            }
            disabled={updating}
            className="w-full p-4 text-left hover:bg-gray-50 rounded-[14px] border border-gray-100 transition-colors flex items-center gap-4 group"
          >
            <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors shrink-0">
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#1a1008] text-sm">
                Вернуть
              </p>
              <p className="text-sm text-gray-400">
                Перезаказать у другого поставщика
              </p>
            </div>
          </button>

          <button
            onClick={() =>
              confirmingSupplier &&
              handleConfirmDelivery(
                confirmingSupplier,
                sentBySupplier.find((s) => s[0] === confirmingSupplier)?.[1]
                  .items || [],
                "cancel"
              )
            }
            disabled={updating}
            className="w-full p-4 text-left hover:bg-red-50 rounded-[14px] border border-gray-100 hover:border-red-100 transition-colors flex items-center gap-4 group"
          >
            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors shrink-0">
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
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#1a1008] text-sm text-red-500">
                Отменить
              </p>
              <p className="text-sm text-red-400">Товары больше не нужны</p>
            </div>
          </button>

          <button
            onClick={() => !updating && setConfirmingSupplier(null)}
            className="w-full p-4 mt-2 text-center font-semibold text-gray-400 hover:text-gray-500 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function OrdersPage() {
  const {
    loading,
    activeTab,
    setActiveTab,
    canSendOrders,
    backLink,
  } = useOrders();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="relative flex items-center justify-center mb-4">
            <Link
              href={backLink}
              className="absolute left-0 w-10 h-10 rounded-[14px] bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-[#1a1008]">Заказы</h1>
          </div>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-2 px-2 text-sm font-medium transition-all rounded-md flex items-center justify-center gap-1 ${
                activeTab === "pending"
                  ? "bg-white text-[#1a1008] shadow-sm"
                  : "text-gray-500 hover:text-[#1a1008]"
              }`}
            >
              <span className="whitespace-nowrap">
                Отправить
              </span>
            </button>
            {canSendOrders && (
              <button
                onClick={() => setActiveTab("transit")}
                className={`flex-1 py-2 px-2 text-sm font-medium transition-all rounded-md flex items-center justify-center gap-1 ${
                  activeTab === "transit"
                    ? "bg-white text-[#1a1008] shadow-sm"
                    : "text-gray-500 hover:text-[#1a1008]"
                }`}
              >
                <span className="whitespace-nowrap">Приёмка</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 px-2 text-sm font-medium transition-all rounded-md flex items-center justify-center gap-1 ${
                activeTab === "history"
                  ? "bg-white text-[#1a1008] shadow-sm"
                  : "text-gray-500 hover:text-[#1a1008]"
              }`}
            >
              <span className="whitespace-nowrap">История</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {activeTab === "pending" && <PendingTab />}
        {activeTab === "transit" && <TransitTab />}
        {activeTab === "history" && <HistoryTab />}
      </main>

      <DeliveryConfirmModal />
    </div>
  );
}
