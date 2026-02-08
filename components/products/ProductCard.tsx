"use client";

import { Card } from "@/components/ui";
import { QuantityInput } from "@/components/ui/QuantityInput";

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
      <QuantityInput
        productName={product.name}
        quantity={quantity}
        unit={product.unit || "шт"}
        onQuantityChange={onQuantityChange}
        onRemove={onRemove}
        showRemoveButton={true}
        compact={true}
        min={1}
      />
    </div>
  );
}
