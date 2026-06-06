/**
 * Russian plural forms helper.
 * Usage: plural(count, ["товар", "товара", "товаров"])
 */
export function plural(count: number, words: [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${count} ${words[2]}`;
  if (n1 > 1 && n1 < 5) return `${count} ${words[1]}`;
  if (n1 === 1) return `${count} ${words[0]}`;
  return `${count} ${words[2]}`;
}

export function formatProducts(count: number) {
  return plural(count, ["товар", "товара", "товаров"]);
}

export function formatRelativeDate(date: Date | string): string {
  const orderDate = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - orderDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays === 1) return "вчера";
  return orderDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
