
import { Supplier } from "@/types";
import { Card } from "@/components/ui";

interface SupplierCardProps {
  supplier: Supplier;
  onClick?: () => void;
}

export function SupplierCard({ supplier, onClick }: SupplierCardProps) {
  return (
    <Card hoverable onClick={onClick} className="transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{supplier.name}</h3>
          {supplier.phone && (
            <p className="text-sm text-gray-500 mt-1">📞 {supplier.phone}</p>
          )}
          {supplier.contact_info && (
            <p className="text-sm text-gray-500 mt-1">{supplier.contact_info}</p>
          )}
          {supplier.poster_supplier_id && (
            <p className="text-xs text-gray-400 italic mt-1">
              Из Poster (ID: {supplier.poster_supplier_id})
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
