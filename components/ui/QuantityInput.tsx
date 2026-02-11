"use client";

import { useState, useEffect } from "react";

interface QuantityInputProps {
  productName: string;
  quantity: number;
  unit?: string;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  compact?: boolean;
  showRemoveButton?: boolean;
  onRemove?: () => void;
}

export function QuantityInput({
  productName,
  quantity,
  unit = "шт",
  onQuantityChange,
  min = 0,
  compact = false,
  showRemoveButton = false,
  onRemove,
}: QuantityInputProps) {
  const [inputValue, setInputValue] = useState(quantity.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Update input value when quantity prop changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(quantity.toString());
    }
  }, [quantity, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string, numbers, and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(inputValue);
    
    if (isNaN(numValue) || numValue < min) {
      setInputValue(quantity.toString());
    } else {
      onQuantityChange(numValue);
      setInputValue(numValue.toString());
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleDecrease = () => {
    const newQty = Math.max(min, quantity - 1);
    onQuantityChange(newQty);
  };

  const handleIncrease = () => {
    onQuantityChange(quantity + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDecrease}
          className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-lg"
          aria-label="Уменьшить"
        >
          −
        </button>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={isFocused ? inputValue : `${quantity}${unit}`}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="w-16 text-center border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            aria-label={`Количество ${productName}`}
          />
        </div>
        <button
          onClick={handleIncrease}
          className="w-9 h-9 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-lg"
          aria-label="Увеличить"
        >
          +
        </button>
        {showRemoveButton && onRemove && (
          <button
            onClick={onRemove}
            className="w-9 h-9 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
            aria-label="Удалить"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Default layout (for custom page)
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDecrease}
        className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={isFocused ? inputValue : `${quantity}${unit}`}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="w-16 text-center border border-gray-300 rounded-lg px-2 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          aria-label={`Количество ${productName}`}
        />
      </div>
      <button
        onClick={handleIncrease}
        className="w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
