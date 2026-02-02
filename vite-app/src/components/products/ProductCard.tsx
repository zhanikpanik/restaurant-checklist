
import { Card } from "@/components/ui";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    unit?: string;
    category_name?: string;
    section_name?: string;
    is_active: boolean;
  };
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <Card hoverable onClick={onClick} className="transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{product.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {product.unit && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {product.unit}
              </span>
            )}
            {product.category_name && (
              <span className="text-xs text-gray-500">
                {product.category_name}
              </span>
            )}
          </div>
          {product.section_name && (
            <p className="text-xs text-gray-400 mt-1">
              Отдел: {product.section_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              product.is_active ? "bg-green-500" : "bg-gray-300"
            }`}
          />
        </div>
      </div>
    </Card>
  );
}

// Compact product list item for order editing
export function ProductListItem({
  product,
  quantity,
  onQuantityChange,
  onRemove,
}: {
  product: { id: number; name: string; unit?: string };
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{product.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-lg"
        >
          -
        </button>
        <span className="w-12 text-center font-medium">
          {quantity} {product.unit || "шт"}
        </span>
        <button
          onClick={() => onQuantityChange(quantity + 1)}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-lg"
        >
          +
        </button>
        <button
          onClick={onRemove}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
        >
          <svg
            className="w-4 h-4"
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
        </button>
      </div>
    </div>
  );
}
