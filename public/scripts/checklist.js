// Bar Inventory Checklist - Client-side JavaScript
// Updated to use server-side API routes (fixes CORS issues)

// Product data structure
let productData = [];
let shoppingListData = [];
let customItems = []; // Store custom items that don't exist in Poster
let isShoppingListMode = false;

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Set up event listeners immediately
  setupEventListeners();

  // Product data will be initialized after API calls complete
  // This is now handled by updateProductDataFromGlobal()
});

function initializeProductData() {
  // Legacy function - now replaced by updateProductDataFromGlobal()
  console.warn(
    "initializeProductData() is deprecated, use updateProductDataFromGlobal() instead",
  );
}

function updateProductDataFromGlobal() {
  // Use global product data set by the API calls
  const globalProducts = window.barProducts || window.kitchenProducts || [];

  if (globalProducts.length === 0) {
    console.warn(
      "No global product data found. Products may not be loaded yet.",
    );
    return false;
  }

  console.log(
    `📦 Updating product data from global: ${globalProducts.length} products`,
  );

  // Update productData with the global data
  productData = globalProducts.map((product) => ({
    id: product.id,
    name: product.name,
    quantity: product.quantity,
    unit: product.unit,
    minQuantity: product.minQuantity || 0,
    checked: false,
  }));

  // Initialize shopping list data with zero quantities
  shoppingListData = productData.map((product) => ({
    ...product,
    shoppingQuantity: 0,
  }));

  console.log(
    `✅ Product data updated: ${productData.length} products ready for shopping list`,
  );
  return true;
}

// Generate quick-select buttons based on product unit
function generateQuickSelectButtons(productId, unit) {
  // Replace multiple +N buttons with simple +/- step controls (0.5 step)
  return `
    <button
      class="quick-select-btn px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded transition-colors duration-150 font-medium"
      onclick="updateShoppingQuantity(${productId}, -1)"
      title="Уменьшить на 0.5 ${unit}"
      aria-label="Уменьшить"
      type="button"
    >
      −
    </button>
    <button
      class="quick-select-btn px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded transition-colors duration-150 font-medium"
      onclick="updateShoppingQuantity(${productId}, 1)"
      title="Добавить 0.5 ${unit}"
      aria-label="Добавить"
      type="button"
    >
      +
    </button>
  `;
}

// Add quantity from quick-select button
function addQuickQuantity(productId, quantity) {
  const shoppingItem = shoppingListData.find(p => p.id == productId);
  if (shoppingItem) {
    const currentQuantity = shoppingItem.shoppingQuantity || 0;
    const newQuantity = currentQuantity + quantity;
    
    // Simply use the existing setShoppingQuantity function
    // It should handle both data update and input field display
    setShoppingQuantity(productId, newQuantity);
    
    // Show visual feedback on the button
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓';
    button.classList.add('bg-green-100', 'text-green-700', 'border-green-200');
    button.classList.remove('bg-blue-50', 'text-blue-700', 'border-blue-200');
    
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('bg-green-100', 'text-green-700', 'border-green-200');
      button.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-200');
    }, 300);
  }
}

function renderShoppingListProducts() {
  const container = document.getElementById("productsList");

  if (!container) {
    console.error("❌ Shopping list container not found");
    return;
  }

  if (shoppingListData.length === 0) {
    console.warn("⚠️ No shopping list data to render");
    container.innerHTML =
      '<div class="text-center py-8 text-gray-500">Нет товаров для отображения</div>';
    return;
  }

  console.log(
    `🛒 Rendering ${shoppingListData.length} products in shopping list`,
  );

  container.innerHTML = shoppingListData
    .map((product) => {
      const isLowStock = product.quantity <= product.minQuantity;
      const quantityColor = isLowStock ? "text-red-600" : "text-gray-900";
      const isCustom = product.isCustom;
      const borderColor = isCustom ? "border-l-4 border-l-blue-500" : "";
      const stockInfo = isCustom
        ? '<div class="text-sm text-blue-600 mt-1 font-medium">📝 Добавлен вручную</div>'
        : `<div class="text-sm text-gray-500 mt-1">На складе: <span class="${quantityColor} font-medium">${product.quantity}</span> ${product.unit}</div>`;

      return `
        <div class="product-item bg-white py-4 ${borderColor}" data-product-id="${product.id}">
            <div class="flex items-center justify-between w-full">
                <div class="flex-1">
                    <h3 class="text-base font-medium text-gray-900">${product.name}</h3>
                    ${stockInfo}
                </div>
                                    <div class="flex items-center justify-end">
                    <!-- Inline quantity controls: - [input with unit] + -->
                    <div class="flex items-center bg-gray-100 rounded-lg border border-gray-300">
                        <button
                          class="px-2 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-2xl font-normal transition-colors duration-200 rounded-l-lg"
                          onclick="updateShoppingQuantity(${product.id}, -1)"
                          title="Уменьшить на 0.5 ${product.unit}"
                          type="button"
                        >
                          −
                        </button>
                        <div class="relative">
                            <input
                                type="text"
                                inputmode="numeric"
                                pattern="[0-9]*"
                                class="quantity-input w-16 px-3 py-2 border-0 focus:outline-none focus:ring-0 text-center bg-gray-100 text-sm font-medium"
                                placeholder="0 ${product.unit}"
                                data-product-id="${product.id}"
                                data-unit="${product.unit}"
                                data-imask-suffix=" ${product.unit}"
                            />
                        </div>
                        <button
                          class="px-2 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-2xl font-normal transition-colors duration-200 rounded-r-lg"
                          onclick="updateShoppingQuantity(${product.id}, 1)"
                          title="Добавить 0.5 ${product.unit}"
                          type="button"
                        >
                          +
                        </button>
                    </div>

                    ${
                      isCustom
                        ? `
                    <!-- Delete Custom Item Button -->
                    <button
                        class="delete-btn w-9 h-10.5 bg-red-500 hover:bg-red-600 text-white ml-2 flex items-center justify-center text-lg font-normal transition-colors duration-200 rounded-lg"
                        data-product-id="${product.id}"
                        onclick="deleteCustomItem(${product.id})"
                        title="Удалить товар"
                    >
                        🗑
                    </button>
                    `
                        : ""
                    }
                </div>
            </div>
        </div>
        `;
    })
    .join("");

  // Reset quantities to 0 for Poster items, keep initial quantities for custom items
  shoppingListData.forEach((item) => {
    if (!item.isCustom) {
      item.shoppingQuantity = 0;
    }
  });

  // Setup event listeners for the newly created quantity inputs
  setupQuantityInputListeners();
}

function setupEventListeners() {
  // WhatsApp button
  const sendWhatsAppBtn = document.getElementById("sendWhatsAppBtn");
  if (sendWhatsAppBtn) {
    sendWhatsAppBtn.addEventListener("click", function () {
      sendToWhatsApp();
    });
  }

  // Auto-save is handled in setShoppingQuantity function
  // No manual save button needed

  // Search functionality
  const productSearchInput = document.getElementById("productSearchInput");
  if (productSearchInput) {
    productSearchInput.addEventListener("input", function () {
      filterProducts(this.value.trim());
    });

    // Clear search on Escape key
    productSearchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        clearSearch();
      }
    });
  }

  // Clear search button
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", function () {
      clearSearch();
    });
  }

  // +/- buttons use onclick attributes, no need for additional event listeners

  // Custom item functionality
  setupCustomItemListeners();

  // Setup quantity input event listeners for dynamically created inputs
  setupQuantityInputListeners();
}

// Setup event listeners for quantity inputs (called after rendering)
function setupQuantityInputListeners() {
  document.querySelectorAll(".quantity-input").forEach((input) => {
    const unit = input.dataset.unit;
    const productId = input.dataset.productId;
    
    // Create IMask instance for this input
    const mask = IMask(input, {
      mask: Number,
      scale: 2,  // digits after point, 0 for integers
      signed: false,  // disallow negative
      thousandsSeparator: '',  // don't use thousands separator for simplicity
      padFractionalZeros: false,  // don't pad with zeros
      normalizeZeros: true,  // normalize zeros
      radix: '.',  // fractional delimiter
      min: 0,
      max: 999,
      lazy: false,  // always show mask
      
      // Custom format with unit suffix
      format: function (appended, masked) {
        return masked.value + (masked.value ? ' ' + unit : '');
      },
      
      parse: function (str) {
        return str.replace(' ' + unit, '');
      }
    });
    
    // Handle value changes
    mask.on('accept', function() {
      const value = parseFloat(mask.unmaskedValue) || 0;
      setShoppingQuantity(parseInt(productId), value);
    });
    
    // Handle Enter key navigation
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        const inputs = Array.from(document.querySelectorAll(".quantity-input"));
        const currentIndex = inputs.indexOf(input);
        const nextInput = inputs[currentIndex + 1];
        if (nextInput) {
          nextInput.focus();
        } else {
          input.blur();
        }
      }
    });
    
    // Store mask instance for later use
    input._mask = mask;
  });
}

// Update quantity input value programmatically (used by +/- buttons)
function updateQuantityInputValue(productId, newValue) {
  const input = document.querySelector(`input.quantity-input[data-product-id="${productId}"]`);
  if (input) {
    if (input._mask) {
      // For IMask inputs, set the unmasked value
      try {
        input._mask.unmaskedValue = newValue.toString();
      } catch (error) {
        // Fallback: set the raw value with unit
        const unit = input.dataset.unit;
        input.value = newValue + (newValue ? ' ' + unit : '');
      }
    } else {
      // For regular inputs, set the formatted value
      const unit = input.dataset.unit;
      input.value = newValue + (newValue ? ' ' + unit : '');
    }
  }
}

// Initialize order mode directly (no mode switching needed)
function initializeOrderMode() {
  console.log("🛒 Initializing order mode...");

  // Update product data from global variables
  const dataUpdated = updateProductDataFromGlobal();

  if (!dataUpdated) {
    console.error("❌ Cannot initialize order mode: No product data available");
    return false;
  }

  // Set shopping list mode flag
  isShoppingListMode = true;

  // Reset shopping quantities to 0
  shoppingListData.forEach((item) => {
    item.shoppingQuantity = 0;
  });

  // Render products in order view
  renderShoppingListProducts();

  // Update floating button label
  updateFloatingButtonLabel();

  // Clear search and focus on search input
  const productSearchInput = document.getElementById("productSearchInput");
  if (productSearchInput) {
    productSearchInput.value = "";
    filterProducts(""); // Reset product visibility
    // Focus on search input after a short delay to ensure visibility
    setTimeout(() => {
      productSearchInput.focus();
    }, 100);
  }

  console.log(
    "✅ Order mode initialized with",
    shoppingListData.length,
    "products",
  );
  return true;
}

function updateShoppingQuantity(productId, change) {
  // Convert productId to number to handle type mismatches
  const numericProductId = parseInt(productId);

  // Try both strict and loose equality
  let shoppingItem = shoppingListData.find((p) => p.id === numericProductId);
  if (!shoppingItem) {
    shoppingItem = shoppingListData.find((p) => p.id == productId);
  }

  if (shoppingItem) {
    // Fixed 0.5 step increment for all products
    const increment = change * 0.5;

    const newQuantity = Math.max(
      0,
      (shoppingItem.shoppingQuantity || 0) + increment,
    );
    setShoppingQuantity(shoppingItem.id, newQuantity);
  } else {
    console.error(
      `❌ Product with ID ${productId} not found in shoppingListData`,
    );
  }
}

function setShoppingQuantity(productId, quantity) {
  console.log(`🛒 Setting quantity for product ${productId} to ${quantity}`);
  const shoppingItem = shoppingListData.find((p) => p.id == productId); // Use == instead of === for type flexibility
  if (shoppingItem) {
    const newQuantity = Math.max(0, parseFloat(quantity) || 0);
    shoppingItem.shoppingQuantity = newQuantity;
    console.log(
      `✅ Updated ${shoppingItem.name}: ${newQuantity} ${shoppingItem.unit}`,
    );

    // Update the masked input field
    updateQuantityInputValue(productId, newQuantity);

    // Also update any legacy quantity displays (if they exist)
    const productItem = document.querySelector(`[data-product-id="${productId}"]`);
    const quantityDisplay = productItem?.querySelector(".quantity-display");
    if (quantityDisplay) {
      quantityDisplay.textContent = `${newQuantity} ${shoppingItem.unit}`;
    }

    // Log for debugging
    if (quantity > 0) {
      console.log(`${shoppingItem.name}: ${newQuantity} ${shoppingItem.unit}`);
    }

    // Auto-save to cache whenever quantity changes
    autoSaveToCache();

    // Update floating button label
    updateFloatingButtonLabel();
  } else {
    console.error(
      `❌ Product with ID ${productId} not found in shoppingListData`,
    );
    console.log(
      "Available product IDs:",
      shoppingListData.map((item) => item.id),
    );
  }
}

// Auto-save current order to cache and server
async function autoSaveToCache() {
  try {
    // Get products that have quantities > 0
    const itemsToOrder = shoppingListData.filter(
      (item) => item.shoppingQuantity > 0,
    );

    // Determine department (default to 'bar' for backward compatibility)
    const department = window.currentDepartment || "bar";
    const departmentName = department === "kitchen" ? "Кухня" : department === "custom" ? "Горничная" : "Бар";

    // Save to localStorage (for offline compatibility)
    const cacheKey = `${department}ShoppingList`;
    localStorage.setItem(cacheKey, JSON.stringify(itemsToOrder));

    // Save to server for multi-device sync
    try {
      const response = await fetch('/api/save-cart-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department: department,
          items: itemsToOrder
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log(`🌐 Server sync: ${departmentName} cart saved (${itemsToOrder.length} items)`);
      } else {
        console.warn(`⚠️ Server sync failed for ${departmentName}:`, result.error);
      }
    } catch (serverError) {
      console.warn(`⚠️ Server sync failed for ${departmentName}:`, serverError.message);
    }

    // Only log if there are items
    if (itemsToOrder.length > 0) {
      console.log(
        `💾 Auto-saved ${departmentName} order: ${itemsToOrder.length} товаров`,
      );
    }
  } catch (error) {
    console.error("❌ Auto-save failed:", error);
  }
}

// Load cart items from server and merge with local data
async function loadCartFromServer() {
  try {
    const department = window.currentDepartment || "bar";
    
    // Load from server
    const response = await fetch(`/api/get-cart-items?department=${department}`);
    const result = await response.json();
    
    if (result.success && result.data.items) {
      const serverItems = result.data.items;
      
      // Merge server data with local shopping list
      if (shoppingListData && serverItems.length > 0) {
        serverItems.forEach(serverItem => {
          const localItem = shoppingListData.find(item => item.id === serverItem.id);
          if (localItem) {
            localItem.shoppingQuantity = serverItem.shoppingQuantity || 0;
          }
        });
        
        // Update UI to reflect loaded quantities
        updateAllQuantityInputs();
        updateFloatingButtonLabel();
        
        console.log(`🌐 Loaded ${serverItems.length} items from server for ${department}`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to load cart from server:', error.message);
    // Fallback to localStorage
    loadCartFromLocalStorage();
  }
}

// Fallback: Load cart items from localStorage
function loadCartFromLocalStorage() {
  try {
    const department = window.currentDepartment || "bar";
    const cacheKey = `${department}ShoppingList`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData && shoppingListData) {
      const cachedItems = JSON.parse(cachedData);
      
      cachedItems.forEach(cachedItem => {
        const localItem = shoppingListData.find(item => item.id === cachedItem.id);
        if (localItem) {
          localItem.shoppingQuantity = cachedItem.shoppingQuantity || 0;
        }
      });
      
      updateAllQuantityInputs();
      updateFloatingButtonLabel();
      
      console.log(`💾 Loaded ${cachedItems.length} items from localStorage for ${department}`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to load cart from localStorage:', error.message);
  }
}

// Update all quantity inputs in the UI
function updateAllQuantityInputs() {
  if (!shoppingListData) return;
  
  shoppingListData.forEach(item => {
    const input = document.getElementById(`quantity-${item.id}`);
    if (input && item.shoppingQuantity > 0) {
      input.value = item.shoppingQuantity;
    }
  });
}

// Update floating button label with unified order count from all departments
function updateFloatingButtonLabel() {
  const sendBtn = document.getElementById("sendWhatsAppBtn");
  if (!sendBtn) return;

  // Get total items from all departments
  const allOrders = getAllDepartmentOrders();
  const totalItems = allOrders.totalItems;

  if (totalItems > 0) {
    let label = `В корзину (${totalItems})`;
    if (allOrders.departments.length > 1) {
      label += ` из ${allOrders.departments.length} отделов`;
    }
    sendBtn.innerHTML = `<span class="text-center">${label}</span>`;
    sendBtn.classList.remove("bg-gray-400", "hover:bg-gray-500");
    sendBtn.classList.add("bg-blue-600", "hover:bg-blue-700");
  } else {
    sendBtn.innerHTML = `<span class="text-center">В корзину</span>`;
    sendBtn.classList.remove("bg-blue-600", "hover:bg-blue-700");
    sendBtn.classList.add("bg-gray-400", "hover:bg-gray-500");
  }
}

// Get correct Russian plural form for "продукт"
function getProductCountText(count) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "продукт";
  } else if (
    [2, 3, 4].includes(count % 10) &&
    ![12, 13, 14].includes(count % 100)
  ) {
    return "продукта";
  } else {
    return "продуктов";
  }
}

// Update added products summary label
function updateAddedProductsLabel(itemCount, itemsInOrder) {
  const addedProductsLabel = document.getElementById("addedProductsLabel");
  const addedProductsText = document.getElementById("addedProductsText");

  if (!addedProductsLabel || !addedProductsText) return;

  if (itemCount === 0) {
    // Hide the label when no products are added
    addedProductsLabel.classList.add("hidden");
    addedProductsText.textContent = "Товары не добавлены";
  } else {
    // Show the label and update text
    addedProductsLabel.classList.remove("hidden");

    // Calculate total quantity of all added products
    const totalQuantity = itemsInOrder.reduce(
      (sum, item) => sum + item.shoppingQuantity,
      0,
    );
    const productText = getProductCountText(itemCount);

    // Create detailed summary text
    addedProductsText.textContent = `В корзине: ${itemCount} ${productText} (общее кол-во: ${totalQuantity.toFixed(1)})`;
  }
}

// saveShoppingList function removed - replaced by auto-save functionality

// Search Functions
function filterProducts(searchTerm) {
  const productItems = document.querySelectorAll("#productsList .product-item");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const searchResultsCount = document.getElementById("searchResultsCount");
  const searchResultsText = document.getElementById("searchResultsText");

  if (!searchTerm) {
    // Show all products if search is empty
    productItems.forEach((item) => {
      item.style.display = "flex";
    });

    // Hide clear button and results count
    if (clearSearchBtn) clearSearchBtn.classList.add("hidden");
    if (searchResultsCount) searchResultsCount.classList.add("hidden");
    return;
  }

  // Show clear button
  if (clearSearchBtn) clearSearchBtn.classList.remove("hidden");

  // Filter products
  let visibleCount = 0;
  const searchTermLower = searchTerm.toLowerCase();

  productItems.forEach((item) => {
    const productName = item.querySelector("h3").textContent.toLowerCase();
    const matches = productName.includes(searchTermLower);

    if (matches) {
      item.style.display = "flex";
      visibleCount++;
    } else {
      item.style.display = "none";
    }
  });

  // Show search results count
  if (searchResultsCount && searchResultsText) {
    if (visibleCount === 0) {
      searchResultsText.textContent = `Товары не найдены для "${searchTerm}"`;
      searchResultsText.className = "text-red-600";
    } else {
      searchResultsText.textContent = `Найдено ${visibleCount} товар${getProductCountSuffix(visibleCount)} для "${searchTerm}"`;
      searchResultsText.className = "text-green-600";
    }
    searchResultsCount.classList.remove("hidden");
  }
}

function clearSearch() {
  const productSearchInput = document.getElementById("productSearchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const searchResultsCount = document.getElementById("searchResultsCount");

  // Clear input
  if (productSearchInput) {
    productSearchInput.value = "";
    productSearchInput.focus();
  }

  // Hide clear button and results count
  if (clearSearchBtn) clearSearchBtn.classList.add("hidden");
  if (searchResultsCount) searchResultsCount.classList.add("hidden");

  // Show all products
  filterProducts("");

  console.log("Поиск очищен");
}

function getProductCountSuffix(count) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "";
  } else if (
    [2, 3, 4].includes(count % 10) &&
    ![12, 13, 14].includes(count % 100)
  ) {
    return "а";
  } else {
    return "ов";
  }
}

// WhatsApp Integration - Modified to show confirmation page first
function sendToWhatsApp() {
  // Navigate to cart page for review
  window.location.href = "/cart";
  
  console.log("Перенаправление в корзину для проверки заказа");
}

// Save final order to cache with 'sent' status
async function saveFinalOrderToCache(itemsToOrder, department, departmentName) {
  try {
    const finalOrder = {
      timestamp: new Date().toISOString(),
      department: department,
      departmentName: departmentName,
      items: itemsToOrder.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.shoppingQuantity,
        unit: item.unit,
      })),
      totalItems: itemsToOrder.length,
      totalQuantity: itemsToOrder.reduce(
        (sum, item) => sum + item.shoppingQuantity,
        0,
      ),
      status: "sent",
    };

    // Save to localStorage (for backward compatibility)
    const historyKey = `${department}OrderHistory`;
    const existingHistory = JSON.parse(
      localStorage.getItem(historyKey) || "[]",
    );
    existingHistory.unshift(finalOrder); // Add to beginning

    // Keep only last 10 orders
    if (existingHistory.length > 10) {
      existingHistory.splice(10);
    }

    localStorage.setItem(historyKey, JSON.stringify(existingHistory));

    // Also save to server storage (so it's visible on all devices)
    try {
      console.log("💾 Saving order to server storage...");
      const response = await fetch("/api/save-internal-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalOrder),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Order saved to server: ${itemsToOrder.length} товаров`);
      } else {
        console.warn("⚠️ Failed to save to server:", result.error);
      }
    } catch (serverError) {
      console.warn("⚠️ Server save failed:", serverError.message);
    }

    // Clear the draft
    const draftKey = `${department}OrderDraft`;
    localStorage.removeItem(draftKey);

    console.log(`✅ Order saved to history: ${itemsToOrder.length} товаров`);
  } catch (error) {
    console.error("❌ Failed to save final order:", error);
  }
}

// Clear all quantities and reset the form
function clearAllQuantities() {
  // Reset data
  shoppingListData.forEach((item) => {
    item.shoppingQuantity = 0;
  });

  // Clear all input fields
  document.querySelectorAll(".quantity-input").forEach((input) => {
    input.value = "";
  });

  // Update floating button label
  updateFloatingButtonLabel();

  // Clear search
  clearSearch();

  console.log("🧹 All quantities cleared");
}

// ===== CUSTOM ITEMS FUNCTIONALITY =====

function setupCustomItemListeners() {
  // Add custom item button (now inline form)
  const addCustomItemBtn = document.getElementById("addCustomItemBtn");
  if (addCustomItemBtn) {
    addCustomItemBtn.addEventListener("click", handleInlineCustomItemSubmit);
  }

  // Handle Enter key in name input
  const customItemName = document.getElementById("customItemName");
  if (customItemName) {
    customItemName.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleInlineCustomItemSubmit();
      }
    });
  }

  // Handle Enter key in quantity input
  const customItemQuantity = document.getElementById("customItemQuantity");
  if (customItemQuantity) {
    customItemQuantity.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleInlineCustomItemSubmit();
      }
    });
  }
}

function handleInlineCustomItemSubmit() {
  const name = document.getElementById("customItemName")?.value.trim();
  const quantity = parseFloat(
    document.getElementById("customItemQuantity")?.value,
  );
  const unit = document.getElementById("customItemUnit")?.value;

  if (!name || !quantity || !unit) {
    alert("Заполните все поля!");
    return;
  }

  // Create custom item with unique ID (negative to distinguish from Poster items)
  const customItem = {
    id: -Date.now(), // Negative ID for custom items
    name: name,
    quantity: 0, // Current stock (unknown for custom items)
    unit: unit,
    minQuantity: 0,
    checked: false,
    shoppingQuantity: quantity,
    isCustom: true,
  };

  // Add to custom items array
  customItems.push(customItem);

  // Add to shopping list data
  shoppingListData.push(customItem);

  console.log(`✅ Added custom item: ${name} - ${quantity} ${unit}`);

  // Re-render the shopping list to include the new item
  renderShoppingListProducts();

  // Update floating button label
  updateFloatingButtonLabel();

  // Auto-save
  autoSaveToCache();

  // Clear form
  const nameInput = document.getElementById("customItemName");
  const quantityInput = document.getElementById("customItemQuantity");
  const unitSelect = document.getElementById("customItemUnit");
  
  if (nameInput) nameInput.value = '';
  if (quantityInput) quantityInput.value = '';
  if (unitSelect) unitSelect.value = 'шт';

  // Focus back to name input
  if (nameInput) nameInput.focus();

  // Show success message
  alert(`Товар "${name}" добавлен в заказ!`);
}

function deleteCustomItem(productId) {
  const itemName = shoppingListData.find((item) => item.id === productId)?.name;

  if (confirm(`Удалить "${itemName}" из заказа?`)) {
    // Remove from custom items array
    customItems = customItems.filter((item) => item.id !== productId);

    // Remove from shopping list data
    shoppingListData = shoppingListData.filter((item) => item.id !== productId);

    console.log(`🗑 Deleted custom item: ${itemName}`);

    // Re-render the shopping list
    renderShoppingListProducts();

    // Update floating button label
    updateFloatingButtonLabel();

    // Auto-save
    autoSaveToCache();
  }
}

// Get orders from all departments and combine them
function getAllDepartmentOrders() {
  const allItems = [];
  const departments = [];
  
  // Get bar orders
  const barOrders = JSON.parse(localStorage.getItem('barShoppingList') || '[]');
  const barItems = barOrders.filter(item => item.shoppingQuantity > 0);
  if (barItems.length > 0) {
    barItems.forEach(item => {
      allItems.push({
        ...item,
        department: 'bar',
        departmentName: 'Бар',
        departmentEmoji: '🍷'
      });
    });
    departments.push({name: 'Бар', emoji: '🍷', count: barItems.length});
  }
  
  // Get kitchen orders
  const kitchenOrders = JSON.parse(localStorage.getItem('kitchenShoppingList') || '[]');
  const kitchenItems = kitchenOrders.filter(item => item.shoppingQuantity > 0);
  if (kitchenItems.length > 0) {
    kitchenItems.forEach(item => {
      allItems.push({
        ...item,
        department: 'kitchen',
        departmentName: 'Кухня',
        departmentEmoji: '🍳'
      });
    });
    departments.push({name: 'Кухня', emoji: '🍳', count: kitchenItems.length});
  }
  
  // Get custom/housekeeping orders
  const customOrders = JSON.parse(localStorage.getItem('customShoppingList') || '[]');
  const customItems = customOrders.filter(item => item.shoppingQuantity > 0);
  if (customItems.length > 0) {
    customItems.forEach(item => {
      allItems.push({
        ...item,
        department: 'custom',
        departmentName: 'Горничная',
        departmentEmoji: '🧹'
      });
    });
    departments.push({name: 'Горничная', emoji: '🧹', count: customItems.length});
  }
  
  return {
    allItems,
    departments,
    totalItems: allItems.length
  };
}

// Generate unified WhatsApp message for all departments
function generateUnifiedWhatsAppMessage(allOrders) {
  if (allOrders.totalItems === 0) {
    return "Нет товаров для заказа";
  }
  
  let message = "📋 Заказ товаров:\n\n";
  
  // Group items by department
  allOrders.departments.forEach(dept => {
    const deptItems = allOrders.allItems.filter(item => item.departmentName === dept.name);
    
    message += `${dept.emoji} ${dept.name}:\n`;
    deptItems.forEach(item => {
      message += `• ${item.name} - ${item.shoppingQuantity} ${item.unit}\n`;
    });
    message += "\n";
  });
  
  // Add summary
  message += `📊 Итого: ${allOrders.totalItems} товар${getItemEnding(allOrders.totalItems)} из ${allOrders.departments.length} отдел${getDepartmentEnding(allOrders.departments.length)}`;
  
  return message;
}

// Helper function for department ending
function getDepartmentEnding(count) {
  if (count === 1) return "а";
  if (count >= 2 && count <= 4) return "ов";
  return "ов";
}

function generateWhatsAppMessage(items, departmentName, departmentEmoji) {
  let message = `${departmentEmoji} ${departmentName}:\n`;

  // Add items - simple format
  items.forEach((item) => {
    message += `• ${item.name} - ${item.shoppingQuantity} ${item.unit}\n`;
  });

  return message;
}

// ✅ Poster API Functions (using server-side API routes to avoid CORS)
async function initializePosterAPI() {
  try {
    console.log("🔄 Initializing Poster API connection via server routes...");

    // Test connection using server-side API route
    const token = "305185:07928627ec76d09e589e1381710e55da";
    const baseUrl = "https://joinposter.com/api";
    const response = await fetch(
      `${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=2`,
    );
    const connectionResult = await response.json();

    if (connectionResult.success) {
      console.log("✅ Poster API connected successfully!");
      console.log("Account info:", connectionResult.account);

      // Load products from Poster
      await fetchPosterProducts();

      console.log("Подключение к Poster API успешно!");
    } else {
      throw new Error(connectionResult.error || "Connection failed");
    }
  } catch (error) {
    console.error("❌ Poster API initialization failed:", error);
    console.error("Ошибка подключения к Poster API: " + error.message);
  }
}

async function fetchPosterProducts() {
  try {
    console.log("🔄 Fetching real ingredients from Poster...");

    // Use the new ingredients endpoint that actually works
    const token = "305185:07928627ec76d09e589e1381710e55da";
    const baseUrl = "https://joinposter.com/api";
    const response = await fetch(
      `${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=2`,
    );
    const result = await response.json();

    if (result.success) {
      console.log("✅ Real ingredients fetched:", result.data);

      if (result.count === 0) {
        console.log("ℹ️ No ingredients found in Poster");
        console.log("Ингредиенты не найдены в Poster");
      } else {
        console.log(`Found ${result.count} real ingredients in Poster`);
        console.log(
          `✅ Загружено ${result.count} реальных ингредиентов из Poster!`,
        );

        // Log the real data
        console.log("Your real Poster inventory:", result.data);

        // Show detailed info about real vs displayed data
        const realItems = result.data
          .map((item) => `${item.name}: ${item.quantity} ${item.unit}`)
          .join(", ");
        console.log("Real inventory quantities:", realItems);
      }
    } else {
      throw new Error(result.error || "Failed to fetch ingredients");
    }
  } catch (error) {
    console.error("❌ Error fetching Poster ingredients:", error);
    console.error("Ошибка загрузки ингредиентов из Poster: " + error.message);
  }
}

async function fetchPosterCategories() {
  try {
    console.log("🔄 Fetching categories from Poster via server route...");

    // Use server-side API route to fetch categories
    const response = await fetch("/api/test-poster-categories");
    const result = await response.json();

    if (result.success) {
      console.log("✅ Categories fetched:", result.data);
      return result.data;
    } else {
      throw new Error(result.error || "Failed to fetch categories");
    }
  } catch (error) {
    console.error("❌ Error fetching Poster categories:", error);
    throw error;
  }
}

// Helper function to update UI with real Poster products (optional)
function updateUIWithPosterProducts(posterProducts) {
  if (!posterProducts || posterProducts.length === 0) {
    return;
  }

  console.log("🔄 Updating UI with Poster products...");

  // TODO: Replace mock data with real Poster products
  // This would involve updating the DOM elements with real product data
  // For now, just log the data
  console.log("Poster products to integrate:", posterProducts);
}

// Legacy functions (placeholder - these endpoints don't exist in your Poster account)
async function updatePosterInventory(productId, quantity) {
  console.warn(
    "updatePosterInventory: This feature is not available in your Poster account",
  );
  throw new Error("Inventory update not supported by your Poster account");
}

async function createPosterPurchaseOrder(shoppingList) {
  console.warn(
    "createPosterPurchaseOrder: This feature is not available in your Poster account",
  );
  console.log("Shopping list would be:", shoppingList);
  throw new Error("Purchase orders not supported by your Poster account");
}

// Notification system removed

// Export functions for global access
window.checklist = {
  initializeOrderMode,
  updateShoppingQuantity,
  setShoppingQuantity,
  autoSaveToCache,
  loadCartFromServer,
  loadCartFromLocalStorage,
  updateAllQuantityInputs,
  saveFinalOrderToCache,
  clearAllQuantities,
  updateFloatingButtonLabel,
  getProductCountText,
  sendToWhatsApp,
  generateWhatsAppMessage,
  filterProducts,
  clearSearch,
  initializePosterAPI,
  fetchPosterProducts,
  fetchPosterCategories,
  updateProductDataFromGlobal,
  renderShoppingListProducts,
  generateQuickSelectButtons,
  addQuickQuantity,
};

// Expose customItems array globally
window.customItems = customItems;
window.shoppingListData = shoppingListData;

// Also expose functions globally for easier access from pages
window.updateProductDataFromGlobal = updateProductDataFromGlobal;
window.setShoppingQuantity = setShoppingQuantity;
window.updateShoppingQuantity = updateShoppingQuantity;
window.initializeOrderMode = initializeOrderMode;
window.updateFloatingButtonLabel = updateFloatingButtonLabel;
window.updateAddedProductsLabel = updateAddedProductsLabel;
window.addQuickQuantity = addQuickQuantity;
