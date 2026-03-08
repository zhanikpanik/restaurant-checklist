"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const restaurantId = searchParams.get("restaurant_id");

  const [ingredients, setIngredients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [mappings, setMappings] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = async () => {
    if (!restaurantId) return;
    try {
      // Fetch all section products and suppliers
      const [prodRes, supRes] = await Promise.all([
        fetch(`/api/section-products?restaurant_id=${restaurantId}`),
        fetch(`/api/suppliers?restaurant_id=${restaurantId}`)
      ]);

      const prodData = await prodRes.json();
      const supData = await supRes.json();

      if (prodData.success) {
        setIngredients(prodData.data);
        // If we found ingredients, stop loading
        if (prodData.data.length > 0) setIsLoading(false);
      }
      if (supData.success) setSuppliers(supData.data);
    } catch (err) {
      console.error("Error loading onboarding data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Polling: if no ingredients, check again every 3 seconds (up to 10 times)
    let interval: NodeJS.Timeout;
    if (isLoading && retryCount < 10) {
      interval = setInterval(() => {
        setRetryCount(prev => prev + 1);
        fetchData();
      }, 3000);
    } else {
      setIsLoading(false); // Stop loading after timeout
    }

    return () => clearInterval(interval);
  }, [restaurantId, retryCount, isLoading]);

  // Group and filter ingredients
  const groupedIngredients = useMemo(() => {
    const filtered = ingredients.filter(ing => 
      ing.name.toLowerCase().includes(search.toLowerCase())
    );

    const groups: Record<string, any[]> = {};
    filtered.forEach(ing => {
      const catName = ing.category_name || "Без категории";
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(ing);
    });

    return groups;
  }, [ingredients, search]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/setup/map-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          mappings // { sectionProductId: supplierId }
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

  const setCategorySupplier = (catName: string, supplierId: number) => {
    const newMappings = { ...mappings };
    groupedIngredients[catName].forEach(ing => {
      newMappings[ing.id] = supplierId;
    });
    setMappings(newMappings);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        <p className="text-gray-500 font-medium">Загружаем ингредиенты из Poster...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl flex flex-col h-[90vh]">
      {/* Header */}
      <div className="p-8 border-b">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl">📦</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Привязка поставщиков</h1>
            <p className="text-sm text-gray-500 mt-1">
              Выберите, от какого поставщика приходит каждый товар.
            </p>
          </div>
        </div>
        
        <Input 
          placeholder="Поиск ингредиента (например, молоко)..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-50 border-none"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {Object.entries(groupedIngredients).map(([catName, items]) => (
          <div key={catName} className="space-y-3">
            <div className="flex items-center justify-between sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
              <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">{catName}</h3>
              <select 
                className="text-[10px] bg-gray-50 border-none rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer outline-none"
                onChange={(e) => e.target.value && setCategorySupplier(catName, parseInt(e.target.value))}
                value=""
              >
                <option value="">Назначить всем в категории...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <div className="grid gap-2">
              {items.map((ing) => (
                <div key={ing.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{ing.name}</p>
                    <p className="text-[11px] text-gray-400">{ing.unit || 'шт'}</p>
                  </div>
                  <select
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none w-48 shadow-sm"
                    value={mappings[ing.id] || ""}
                    onChange={(e) => setMappings({ ...mappings, [ing.id]: parseInt(e.target.value) })}
                  >
                    <option value="">Не выбран</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-8 border-t bg-gray-50 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm">
            <span className="text-gray-500">Привязано: </span>
            <span className="font-bold text-purple-600">{Object.keys(mappings).length}</span>
            <span className="text-gray-500"> из {ingredients.length}</span>
          </div>
          <button 
            onClick={() => router.push("/login?registered=true")}
            className="text-sm text-gray-400 hover:text-gray-600 font-medium"
          >
            Пропустить
          </button>
        </div>
        
        <Button 
          onClick={handleSave} 
          className="w-full py-4 text-lg shadow-lg shadow-purple-600/20" 
          isLoading={isSaving}
        >
          Завершить настройку
        </Button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Suspense fallback={<div>Загрузка...</div>}>
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
