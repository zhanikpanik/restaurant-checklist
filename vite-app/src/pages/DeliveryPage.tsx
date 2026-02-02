import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import type { Order } from '@/types';

export default function DeliveryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [itemInputs, setItemInputs] = useState<Record<string, { quantity: string; price: string }>>({});

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get<Order[]>('/api/orders');
      if (response.success) {
        setOrders(response.data || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNaturalDate = (date: Date | string) => {
    const orderDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    const orderDateOnly = new Date(orderDate);
    orderDateOnly.setHours(0, 0, 0, 0);

    if (orderDateOnly.getTime() === today.getTime()) {
      return 'Сегодня';
    } else if (orderDateOnly.getTime() === yesterday.getTime()) {
      return 'Вчера';
    } else if (orderDateOnly.getTime() === dayBeforeYesterday.getTime()) {
      return 'Позавчера';
    } else {
      return orderDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
      });
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'pending') return order.status === 'pending';
    if (filter === 'delivered') return order.status === 'delivered';
    return true;
  });

  const handleToggleOrder = (orderId: number) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleInputChange = (itemName: string, field: 'quantity' | 'price', value: string) => {
    setItemInputs((prev) => ({
      ...prev,
      [itemName]: {
        ...prev[itemName],
        [field]: value,
      },
    }));
  };

  const handleConfirmDelivery = async (order: Order) => {
    const items = order.order_data.items || [];

    const confirmedItems = items.map((item) => {
      const itemKey = `${order.id}-${item.name}`;
      const inputs = itemInputs[itemKey] || {};
      return {
        ...item,
        actualQuantity: inputs.quantity ? parseFloat(inputs.quantity) : item.quantity,
        actualPrice: inputs.price ? parseFloat(inputs.price) : 0,
      };
    });

    try {
      const updateResponse = await api.patch('/api/orders', {
        id: order.id,
        status: 'delivered',
        order_data: {
          ...order.order_data,
          items: confirmedItems,
          deliveredAt: new Date().toISOString(),
        },
      });

      if (!updateResponse.success) {
        alert('Ошибка при обновлении заказа: ' + updateResponse.error);
        return;
      }

      alert('Заказ подтвержден!');
      setItemInputs({});
      setExpandedOrder(null);
      loadOrders();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      alert('Ошибка при подтверждении доставки');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-green-600 text-white px-4 py-4">
        <div className="max-w-md mx-auto flex items-center relative">
          <Link
            to="/"
            className="flex items-center justify-center w-10 h-10 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-95 z-10"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold absolute left-1/2 transform -translate-x-1/2">
            🚚 Доставка
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {/* Filter Buttons */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-lg ${
              filter === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-2 rounded-lg ${
              filter === 'pending'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Ожидают
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className={`px-3 py-2 rounded-lg ${
              filter === 'delivered'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Доставлено
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-12 w-12 border-b-2 border-green-600 rounded-full mx-auto" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-lg font-medium mb-2">Нет заказов</p>
            <p className="text-sm">
              Создайте заказ на странице товаров
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const items = order.order_data.items || [];
              const isExpanded = expandedOrder === order.id;
              const isPending = order.status === 'pending';

              return (
                <div
                  key={order.id}
                  className="bg-white border rounded-lg overflow-hidden"
                >
                  {/* Order Header */}
                  <div
                    onClick={() => handleToggleOrder(order.id)}
                    className="p-4 cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Заказ #{order.id}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatNaturalDate(order.created_at)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {order.status === 'delivered' ? 'Доставлено' : 'Ожидает'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Товаров: {items.length}
                    </p>
                  </div>

                  {/* Order Items (Expanded) */}
                  {isExpanded && (
                    <div className="border-t p-4 bg-gray-50">
                      <div className="space-y-3">
                        {items.map((item, idx) => {
                          const itemKey = `${order.id}-${item.name}`;
                          const inputs = itemInputs[itemKey] || { quantity: '', price: '' };

                          return (
                            <div
                              key={idx}
                              className="bg-white p-3 rounded-lg border"
                            >
                              <div className="font-medium text-gray-900 mb-2">
                                {item.name}
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                Заказано: {item.quantity} {item.unit}
                              </div>

                              {isPending && (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <label className="block text-xs text-gray-600 mb-1">
                                        Фактическое кол-во
                                      </label>
                                      <input
                                        type="number"
                                        value={inputs.quantity}
                                        onChange={(e) =>
                                          handleInputChange(itemKey, 'quantity', e.target.value)
                                        }
                                        placeholder={item.quantity.toString()}
                                        className="w-full border rounded px-2 py-1 text-sm"
                                        step="0.01"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-xs text-gray-600 mb-1">
                                        Цена
                                      </label>
                                      <input
                                        type="number"
                                        value={inputs.price}
                                        onChange={(e) =>
                                          handleInputChange(itemKey, 'price', e.target.value)
                                        }
                                        placeholder="0"
                                        className="w-full border rounded px-2 py-1 text-sm"
                                        step="0.01"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {!isPending && item.actualQuantity && (
                                <div className="text-sm text-gray-600">
                                  Получено: {item.actualQuantity} {item.unit}
                                  {item.actualPrice && ` по ${item.actualPrice} ₸`}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {isPending && (
                        <button
                          onClick={() => handleConfirmDelivery(order)}
                          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                          Подтвердить доставку
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
