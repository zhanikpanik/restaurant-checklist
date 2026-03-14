import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = {
  title: "Помощь | Закуп",
  description: "Руководство пользователя и часто задаваемые вопросы",
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader title="Помощь и инструкции" backHref="/" />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-12">
        {/* Quick Start */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-2xl">🚀</span> Быстрый старт
          </h2>
          <ol className="space-y-6 text-gray-700">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-bold flex items-center justify-center">
                1
              </span>
              <div className="mt-1">
                <strong className="text-gray-900 block mb-1">Подключите Poster</strong>
                После установки приложение автоматически синхронизирует ваши склады и ингредиенты.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-bold flex items-center justify-center">
                2
              </span>
              <div className="mt-1">
                <strong className="text-gray-900 block mb-1">Настройте категории</strong>
                Назначьте товарам категории и привяжите к поставщикам.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-bold flex items-center justify-center">
                3
              </span>
              <div className="mt-1">
                <strong className="text-gray-900 block mb-1">Создавайте заказы</strong>
                Отмечайте нужные товары, отправляйте заказы поставщикам в WhatsApp.
              </div>
            </li>
          </ol>
        </section>

        {/* How to Use */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-2xl">📋</span> Как работать с чек-листом
          </h2>
          <div className="space-y-6 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Ввод количества
              </h3>
              <p className="leading-relaxed">
                Нажмите на карточку товара, введите количество с клавиатуры и
                нажмите «Готово». Товар автоматически добавится в корзину.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Фильтрация по секциям
              </h3>
              <p className="leading-relaxed">
                Используйте вкладки вверху экрана (Бар, Кухня и т.д.) для
                переключения между секциями. Каждый сотрудник видит только свои
                секции.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Поиск товаров</h3>
              <p className="leading-relaxed">
                Используйте строку поиска для быстрого нахождения товара по
                названию или категории.
              </p>
            </div>
          </div>
        </section>

        {/* Orders */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-2xl">📦</span> Формирование заказов
          </h2>
          <div className="space-y-6 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Корзина</h3>
              <p className="leading-relaxed">
                Все выбранные товары попадают в корзину. Нажмите на иконку
                корзины, чтобы просмотреть список. Товары автоматически
                группируются по поставщикам.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Отправка в WhatsApp
              </h3>
              <p className="leading-relaxed">
                Нажмите кнопку «WhatsApp» рядом с поставщиком — откроется
                WhatsApp с готовым текстом заказа. Отредактируйте при
                необходимости и отправьте.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Статусы заказов</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="inline-block px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-bold mt-0.5">
                    Ожидает
                  </span>
                  <span className="text-sm pt-0.5">— заказ создан, но не отправлен</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold mt-0.5">
                    Отправлен
                  </span>
                  <span className="text-sm pt-0.5">— заказ отправлен поставщику</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-bold mt-0.5">
                    Доставлен
                  </span>
                  <span className="text-sm pt-0.5">— товары получены</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Manager Features */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-2xl">👔</span> Для менеджеров
          </h2>
          <div className="space-y-6 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Панель управления
              </h3>
              <p className="leading-relaxed">
                Перейдите в <strong>Каталог</strong> для доступа к настройкам:
                секции, товары, категории, поставщики.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Массовое назначение категорий
              </h3>
              <p className="leading-relaxed">
                В разделе «Каталог» выберите несколько товаров галочками, затем
                нажмите «Назначить поставщика».
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Синхронизация с Poster
              </h3>
              <p className="leading-relaxed">
                Нажмите значок обновления в правом верхнем углу в разделе Каталог для обновления
                списка складов и ингредиентов из Poster.
              </p>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-2xl">👥</span> Роли и доступ
          </h2>
          <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100/50">
                  <th className="text-left py-3 px-4 font-bold text-gray-900">
                    Роль
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">
                    Возможности
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-700 divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 font-semibold text-gray-900">Менеджер</td>
                  <td className="py-3 px-4 leading-relaxed">
                    Полный доступ: настройки, пользователи, все секции, история
                    заказов
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-gray-900">Бармен / Повар</td>
                  <td className="py-3 px-4 leading-relaxed">
                    Создание заказов, просмотр назначенных секций
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-gray-900">Доставка</td>
                  <td className="py-3 px-4 leading-relaxed">
                    Просмотр и подтверждение доставки заказов
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-2xl">❓</span> Частые вопросы
          </h2>
          <div className="space-y-2">
            <details className="group bg-gray-50 rounded-2xl border border-gray-100">
              <summary className="cursor-pointer font-semibold text-gray-900 p-4 flex items-center justify-between">
                Как добавить нового сотрудника?
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-600 px-4 pb-4 leading-relaxed">
                Менеджер → Откройте любую секцию → Нажмите на иконку пользователей → Добавить. Сгенерируйте ссылку и отправьте её.
              </p>
            </details>
            <details className="group bg-gray-50 rounded-2xl border border-gray-100">
              <summary className="cursor-pointer font-semibold text-gray-900 p-4 flex items-center justify-between">
                Почему я не вижу некоторые товары?
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-600 px-4 pb-4 leading-relaxed">
                Товары отображаются только для назначенных вам секций.
                Обратитесь к менеджеру для добавления доступа.
              </p>
            </details>
            <details className="group bg-gray-50 rounded-2xl border border-gray-100">
              <summary className="cursor-pointer font-semibold text-gray-900 p-4 flex items-center justify-between">
                Как изменить поставщика?
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-600 px-4 pb-4 leading-relaxed">
                Главная → Каталог → Воспользуйтесь поиском → выберите товар
                → Назначить поставщика.
              </p>
            </details>
            <details className="group bg-gray-50 rounded-2xl border border-gray-100">
              <summary className="cursor-pointer font-semibold text-gray-900 p-4 flex items-center justify-between">
                Как синхронизировать новые ингредиенты из Poster?
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-600 px-4 pb-4 leading-relaxed">
                Главная → Каталог → нажмите иконку 🔄 в правом верхнем углу.
                Новые ингредиенты появятся в списке «Требуют внимания».
              </p>
            </details>
          </div>
        </section>

        {/* Support */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <span className="text-2xl">💬</span> Нужна помощь?
          </h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            Если у вас остались вопросы или возникли проблемы, свяжитесь с нами:
          </p>
          <a
            href="https://wa.me/77012345678"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#20bd5a] transition-all shadow-lg shadow-green-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Написать в WhatsApp
          </a>
        </section>

        {/* Footer Links */}
        <div className="pt-8 border-t border-gray-100 flex flex-wrap gap-6 text-sm font-medium text-gray-400 justify-center">
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">
            Политика конфиденциальности
          </Link>
          <Link href="/terms" className="hover:text-gray-600 transition-colors">
            Условия использования
          </Link>
        </div>
      </main>
    </div>
  );
}
