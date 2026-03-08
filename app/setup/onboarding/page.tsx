"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const restaurantId = searchParams.get("restaurant_id");

  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      try {
        // Fetch categories and suppliers in parallel
        const [catRes, supRes] = await Promise.all([
          fetch(`/api/categories?restaurant_id=${restaurantId}`),
          fetch(`/api/suppliers?restaurant_id=${restaurantId}`)
        ]);

        const catData = await catRes.json();
        const supData = await supRes.json();

        if (catData.success) setCategories(catData.data);
        if (supData.success) setSuppliers(supData.data);
      } catch (err) {
        console.error("Error loading onboarding data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [restaurantId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/setup/map-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          mappings // { categoryId: supplierId }
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Настройка завершена!");
        router.push("/login?registered=true");
      } else {
        toast.error(data.error || "Ошибка при сохранении");
      }
    } catch (err) {
      toast.error("Ошибка сети");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-20">Загрузка категорий из Poster...</div>;
  }

  return (
    <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🚛</div>
        <h1 className="text-2xl font-bold text-gray-900">Кто ваши поставщики?</h1>
        <p className="text-gray-500 mt-2">
          Мы нашли {categories.length} категорий товаров в вашем Poster. 
          Привяжите их к поставщикам, чтобы персонал мог сразу делать заказы.
        </p>
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 mb-8">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="font-medium text-gray-700">{cat.name}</span>
            <select
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              value={mappings[cat.id] || ""}
              onChange={(e) => setMappings({ ...mappings, [cat.id]: parseInt(e.target.value) })}
            >
              <option value="">Не выбрано</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button 
          onClick={handleSave} 
          className="w-full py-4 text-lg" 
          isLoading={isSaving}
          disabled={Object.keys(mappings).length === 0}
        >
          Завершить настройку
        </Button>
        <button 
          onClick={() => router.push("/login?registered=true")}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Я сделаю это позже в настройках
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <Suspense fallback={<div>Загрузка...</div>}>
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
