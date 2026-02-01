import Link from "next/link";

export const metadata = {
  title: "Помощь | Закуп",
  description: "Руководство пользователя и часто задаваемые вопросы",
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Закуп
          </Link>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Вернуться
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Руководство пользователя
        </h1>

        {/* Quick Start */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🚀</span> Быстрый старт
          </h2>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                1
              </span>
              <span>
                <strong>Подключите Poster</strong> — после установки приложение
                автоматически синхронизирует ваши склады и ингредиенты
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                2
              </span>
              <span>
                <strong>Настройте категории</strong> — назначьте товарам категории
                и привяжите к поставщикам
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                3
              </span>
              <span>
                <strong>Создавайте заказы</strong> — отмечайте нужные товары,
                отправляйте заказы поставщикам в WhatsApp
              </span>
            </li>
          </ol>
        </section>

        {/* How to Use */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span> Как работать с чек-листом
          </h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Ввод количества
              </h3>
              <p>
                Нажмите на карточку товара, введите количество с клавиатуры и
                нажмите «Готово». Товар автоматически добавится в корзину.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Фильтрация по секциям
              </h3>
              <p>
                Используйте вкладки вверху экрана (Бар, Кухня и т.д.) для
                переключения между секциями. Каждый сотрудник видит только свои
                секции.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Поиск товаров</h3>
              <p>
                Используйте строку поиска для быстрого нахождения товара по
                названию или категории.
              </p>
            </div>
          </div>
        </section>

        {/* Orders */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📦</span> Формирование заказов
          </h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Корзина</h3>
              <p>
                Все выбранные товары попадают в корзину. Нажмите на иконку
                корзины, чтобы просмотреть список. Товары автоматически
                группируются по поставщикам.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Отправка в WhatsApp
              </h3>
              <p>
                Нажмите кнопку «WhatsApp» рядом с поставщиком — откроется
                WhatsApp с готовым текстом заказа. Отредактируйте при
                необходимости и отправьте.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Статусы заказов</h3>
              <p>
                <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-sm mr-2">
                  Ожидает
                </span>
                — заказ создан, но не отправлен
                <br />
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-sm mr-2 mt-1">
                  Отправлен
                </span>
                — заказ отправлен поставщику
                <br />
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-sm mr-2 mt-1">
                  Доставлен
                </span>
                — товары получены
              </p>
            </div>
          </div>
        </section>

        {/* Manager Features */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">👔</span> Для менеджеров
          </h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Панель управления
              </h3>
              <p>
                Перейдите в <strong>Менеджер</strong> для доступа к настройкам:
                секции, товары, категории, поставщики, пользователи.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Массовое назначение категорий
              </h3>
              <p>
                В разделе «Товары» выберите несколько товаров галочками, затем
                выберите категорию и нажмите «Применить». Используйте фильтр
                «Без категории» для быстрого поиска товаров без категории.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Синхронизация с Poster
              </h3>
              <p>
                Нажмите «Синхронизировать» в разделе секций для обновления
                списка складов и ингредиентов из Poster.
              </p>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">👥</span> Роли и доступ
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-900">
                    Роль
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-900">
                    Возможности
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 font-medium">Менеджер</td>
                  <td className="py-2 px-3">
                    Полный доступ: настройки, пользователи, все секции, история
                    заказов
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 font-medium">Бармен / Повар</td>
                  <td className="py-2 px-3">
                    Создание заказов, просмотр назначенных секций
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Доставка</td>
                  <td className="py-2 px-3">
                    Просмотр и подтверждение доставки заказов
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">❓</span> Частые вопросы
          </h2>
          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer font-medium text-gray-900 py-2 flex items-center justify-between">
                Как добавить нового сотрудника?
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-700 pb-2 pl-4">
                Менеджер → Пользователи → Добавить. Укажите email, имя, роль и
                назначьте секции.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-medium text-gray-900 py-2 flex items-center justify-between">
                Почему я не вижу некоторые товары?
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-700 pb-2 pl-4">
                Товары отображаются только для назначенных вам секций.
                Обратитесь к менеджеру для добавления доступа.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-medium text-gray-900 py-2 flex items-center justify-between">
                Как изменить поставщика для категории?
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-700 pb-2 pl-4">
                Менеджер → Категории → нажмите на категорию → выберите поставщика
                → Сохранить.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-medium text-gray-900 py-2 flex items-center justify-between">
                Как синхронизировать новые ингредиенты из Poster?
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-700 pb-2 pl-4">
                Менеджер → Секции → нажмите «Синхронизировать» для нужной секции.
                Новые ингредиенты появятся в списке товаров.
              </p>
            </details>
          </div>
        </section>

        {/* Support */}
        <section className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">💬</span> Нужна помощь?
          </h2>
          <p className="text-gray-700 mb-4">
            Если у вас остались вопросы или возникли проблемы, свяжитесь с нами:
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:support@example.com"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Email
            </a>
          </div>
        </section>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-600">
          <Link href="/privacy" className="hover:text-gray-900">
            Политика конфиденциальности
          </Link>
          <Link href="/terms" className="hover:text-gray-900">
            Условия использования
          </Link>
        </div>
      </main>
    </div>
  );
}
