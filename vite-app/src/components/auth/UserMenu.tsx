import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui";

interface UserMenuProps {
  showRestaurant?: boolean;
}

export function UserMenu({ showRestaurant = true }: UserMenuProps) {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link to="/login">
        <Button size="sm">Войти</Button>
      </Link>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: "Админ",
    manager: "Менеджер",
    staff: "Сотрудник",
    delivery: "Доставка",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800",
    manager: "bg-blue-100 text-blue-800",
    staff: "bg-green-100 text-green-800",
    delivery: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {user.name}
          </span>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              roleColors[user.role] || roleColors.staff
            }`}
          >
            {roleLabels[user.role] || user.role}
          </span>
        </div>
        {showRestaurant && user.restaurant_name && (
          <p className="text-xs text-gray-500">{user.restaurant_name}</p>
        )}
      </div>
      <button
        onClick={logout}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        title="Выйти"
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
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    </div>
  );
}
