// Bar Inventory Checklist - Client-side JavaScript
// Updated to use server-side API routes (fixes CORS issues)

// Product data structure
let productData = [];
let shoppingListData = [];
let customItems = []; // Store custom items that don't exist in Poster
let isShoppingListMode = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners immediately
    setupEventListeners();
    
    // Product data will be initialized after API calls complete
    // This is now handled by updateProductDataFromGlobal()
});

function initializeProductData() {
    // Legacy function - now replaced by updateProductDataFromGlobal()
    console.warn('initializeProductData() is deprecated, use updateProductDataFromGlobal() instead');
}

function updateProductDataFromGlobal() {
    // Use global product data set by the API calls
    const globalProducts = window.barProducts || window.kitchenProducts || [];
    
    if (globalProducts.length === 0) {
        console.warn('No global product data found. Products may not be loaded yet.');
        return false;
    }
    
    console.log(`📦 Updating product data from global: ${globalProducts.length} products`);
    
    // Update productData with the global data
    productData = globalProducts.map(product => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        unit: product.unit,
        minQuantity: product.minQuantity || 0,
        checked: false
    }));

    // Initialize shopping list data with zero quantities
    shoppingListData = productData.map(product => ({
        ...product,
        shoppingQuantity: 0
    }));
    
    console.log(`✅ Product data updated: ${productData.length} products ready for shopping list`);
    return true;
}

function renderShoppingListProducts() {
    const container = document.getElementById('productsList');
    
    if (!container) {
        console.error('❌ Shopping list container not found');
        return;
    }
    
    if (shoppingListData.length === 0) {
        console.warn('⚠️ No shopping list data to render');
        container.innerHTML = '<div class="text-center py-8 text-gray-500">Нет товаров для отображения</div>';
        return;
    }
    
    console.log(`🛒 Rendering ${shoppingListData.length} products in shopping list`);
    
    container.innerHTML = shoppingListData.map(product => {
        const isLowStock = product.quantity <= product.minQuantity;
        const quantityColor = isLowStock ? 'text-red-600' : 'text-gray-900';
        const isCustom = product.isCustom;
        const borderColor = isCustom ? 'border-l-4 border-l-blue-500' : '';
        const stockInfo = isCustom ? 
            '<div class="text-sm text-blue-600 mt-1 font-medium">📝 Добавлен вручную</div>' :
            `<div class="text-sm text-gray-500 mt-1">На складе: <span class="${quantityColor} font-medium">${product.quantity}</span> ${product.unit}</div>`;
        
        return `
        <div class="product-item bg-white p-4 ${borderColor}" data-product-id="${product.id}">
            <div class="flex items-center justify-between w-full">
                <div class="flex-1">
                    <h3 class="text-base font-medium text-gray-900">${product.name}</h3>
                    ${stockInfo}
                </div>
                <div class="flex items-center justify-end">
                    <!-- Quantity Input -->
                    <div class="relative">
                        <input 
                            type="number" 
                            class="quantity-input w-24 pr-7 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-right bg-gray-50"
                            value=""
                            min="0"
                            step="0.1"
                            placeholder="0"
                            data-product-id="${product.id}"
                            onchange="setShoppingQuantity(${product.id}, this.value)"
                        />
                        <span class="absolute inset-y-0 right-0 flex items-center pr-2 text-xs text-gray-400 pointer-events-none">
                            ${product.unit}
                        </span>
                    </div>
                    
                    ${isCustom ? `
                    <!-- Delete Custom Item Button -->
                    <button 
                        class="delete-btn w-9 h-10.5 bg-red-500 hover:bg-red-600 text-white ml-2 flex items-center justify-center text-lg font-normal transition-colors duration-200 rounded-lg"
                        data-product-id="${product.id}"
                        onclick="deleteCustomItem(${product.id})"
                        title="Удалить товар"
                    >
                        🗑
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    // Reset quantities to 0 for Poster items, keep initial quantities for custom items
    shoppingListData.forEach(item => {
        if (!item.isCustom) {
            item.shoppingQuantity = 0;
        }
    });
}

function setupEventListeners() {
    // WhatsApp button
    const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
    if (sendWhatsAppBtn) {
        sendWhatsAppBtn.addEventListener('click', function() {
            sendToWhatsApp();
        });
    }

    // Auto-save is handled in setShoppingQuantity function
    // No manual save button needed

    // Search functionality
    const productSearchInput = document.getElementById('productSearchInput');
    if (productSearchInput) {
        productSearchInput.addEventListener('input', function() {
            filterProducts(this.value.trim());
        });
        
        // Clear search on Escape key
        productSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                clearSearch();
            }
        });
    }

    // Clear search button
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            clearSearch();
        });
    }

    // +/- buttons use onclick attributes, no need for additional event listeners

    // Custom item functionality
    setupCustomItemListeners();

    // Quantity input field event listeners (for direct input)
    document.querySelectorAll('.quantity-input').forEach(input => {
        // Handle direct input changes
        input.addEventListener('input', function() {
            const productId = parseInt(this.dataset.productId);
            const value = parseFloat(this.value) || 0;
            setShoppingQuantity(productId, value);
        });

        // Handle focus - select all text for easy editing
        input.addEventListener('focus', function() {
            this.select();
        });

        // Handle Enter key - move to next input
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const inputs = Array.from(document.querySelectorAll('.quantity-input'));
                const currentIndex = inputs.indexOf(this);
                const nextInput = inputs[currentIndex + 1];
                if (nextInput) {
                    nextInput.focus();
                } else {
                    this.blur(); // Remove focus if it's the last input
                }
            }
        });

        // Format number on blur (optional - shows 3 decimal places)
        input.addEventListener('blur', function() {
            const value = parseFloat(this.value) || 0;
            if (value > 0) {
                this.value = value.toFixed(3);
            } else {
                this.value = '0';
            }
        });
    });
}

// Initialize order mode directly (no mode switching needed)
function initializeOrderMode() {
    console.log('🛒 Initializing order mode...');
    
    // Update product data from global variables
    const dataUpdated = updateProductDataFromGlobal();
    
    if (!dataUpdated) {
        console.error('❌ Cannot initialize order mode: No product data available');
        return false;
    }
    
    // Set shopping list mode flag
    isShoppingListMode = true;
    
    // Reset shopping quantities to 0
    shoppingListData.forEach(item => {
        item.shoppingQuantity = 0;
    });
    
    // Render products in order view
    renderShoppingListProducts();
    
    // Update floating button label
    updateFloatingButtonLabel();
    
    // Clear search and focus on search input
    const productSearchInput = document.getElementById('productSearchInput');
    if (productSearchInput) {
        productSearchInput.value = '';
        filterProducts(''); // Reset product visibility
        // Focus on search input after a short delay to ensure visibility
        setTimeout(() => {
            productSearchInput.focus();
        }, 100);
    }
    
    console.log('✅ Order mode initialized with', shoppingListData.length, 'products');
    return true;
}

function updateShoppingQuantity(productId, change) {
    // Convert productId to number to handle type mismatches
    const numericProductId = parseInt(productId);
    
    // Try both strict and loose equality
    let shoppingItem = shoppingListData.find(p => p.id === numericProductId);
    if (!shoppingItem) {
        shoppingItem = shoppingListData.find(p => p.id == productId);
    }
    
    if (shoppingItem) {
        // Fixed 0.5 step increment for all products
        const increment = change * 0.5;
        
        const newQuantity = Math.max(0, (shoppingItem.shoppingQuantity || 0) + increment);
        setShoppingQuantity(shoppingItem.id, newQuantity);
    } else {
        console.error(`❌ Product with ID ${productId} not found in shoppingListData`);
    }
}

function setShoppingQuantity(productId, quantity) {
    console.log(`🛒 Setting quantity for product ${productId} to ${quantity}`);
    const shoppingItem = shoppingListData.find(p => p.id == productId); // Use == instead of === for type flexibility
    if (shoppingItem) {
        const newQuantity = Math.max(0, parseFloat(quantity) || 0);
        shoppingItem.shoppingQuantity = newQuantity;
        console.log(`✅ Updated ${shoppingItem.name}: ${newQuantity} ${shoppingItem.unit}`);
        
        // Update both the input field and any display elements
        const productItem = document.querySelector(`#orderView [data-product-id="${productId}"]`) || 
                           document.querySelector(`[data-product-id="${productId}"]`);
        const quantityInput = productItem?.querySelector('.quantity-input');
        
        if (quantityInput) {
            quantityInput.value = newQuantity > 0 ? newQuantity.toString() : '';
        }
        
        // Also update any legacy quantity displays (if they exist)
        const quantityDisplay = productItem.querySelector('.quantity-display');
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
        console.error(`❌ Product with ID ${productId} not found in shoppingListData`);
        console.log('Available product IDs:', shoppingListData.map(item => item.id));
    }
}

// Auto-save current order to cache
function autoSaveToCache() {
    try {
        // Get products that have quantities > 0
        const itemsToOrder = shoppingListData.filter(item => item.shoppingQuantity > 0);
        
        // Determine department (default to 'bar' for backward compatibility)
        const department = window.currentDepartment || 'bar';
        const departmentName = department === 'kitchen' ? 'Кухня' : 'Бар';
        
        // Create shopping list data
        const orderData = {
            timestamp: new Date().toISOString(),
            department: department,
            departmentName: departmentName,
            items: itemsToOrder.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.shoppingQuantity,
                unit: item.unit
            })),
            totalItems: itemsToOrder.length,
            totalQuantity: itemsToOrder.reduce((sum, item) => sum + item.shoppingQuantity, 0),
            status: 'draft'
        };
        
        // Save to department-specific cache
        const cacheKey = `${department}OrderDraft`;
        localStorage.setItem(cacheKey, JSON.stringify(orderData));
        
        // Only log if there are items
        if (itemsToOrder.length > 0) {
            console.log(`💾 Auto-saved ${departmentName} order: ${itemsToOrder.length} товаров`);
        }
        
    } catch (error) {
        console.error('❌ Auto-save failed:', error);
    }
}

// Update floating button label with order count
function updateFloatingButtonLabel() {
    const sendBtn = document.getElementById('sendWhatsAppBtn');
    if (!sendBtn) return;
    
    // Count products with quantities > 0
    const itemsInOrder = shoppingListData.filter(item => item.shoppingQuantity > 0);
    const itemCount = itemsInOrder.length;
    
    // Update WhatsApp button label
    const textSpan = sendBtn.querySelector('span:last-child');
    if (textSpan) {
        if (itemCount === 0) {
            textSpan.textContent = 'Создать заказ';
            sendBtn.classList.remove('bg-gray-800', 'hover:bg-gray-900');
            sendBtn.classList.add('bg-gray-400', 'hover:bg-gray-500');
        } else {
            const productText = getProductCountText(itemCount);
            textSpan.textContent = `В корзине ${itemCount} ${productText}`;
            sendBtn.classList.remove('bg-gray-400', 'hover:bg-gray-500');
            sendBtn.classList.add('bg-gray-800', 'hover:bg-gray-900');
        }
    }
    
    // Update added products summary label
    updateAddedProductsLabel(itemCount, itemsInOrder);
}

// Get correct Russian plural form for "продукт"
function getProductCountText(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'продукт';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'продукта';
    } else {
        return 'продуктов';
    }
}

// Update added products summary label
function updateAddedProductsLabel(itemCount, itemsInOrder) {
    const addedProductsLabel = document.getElementById('addedProductsLabel');
    const addedProductsText = document.getElementById('addedProductsText');
    
    if (!addedProductsLabel || !addedProductsText) return;
    
    if (itemCount === 0) {
        // Hide the label when no products are added
        addedProductsLabel.classList.add('hidden');
        addedProductsText.textContent = 'Товары не добавлены';
    } else {
        // Show the label and update text
        addedProductsLabel.classList.remove('hidden');
        
        // Calculate total quantity of all added products
        const totalQuantity = itemsInOrder.reduce((sum, item) => sum + item.shoppingQuantity, 0);
        const productText = getProductCountText(itemCount);
        
        // Create detailed summary text
        addedProductsText.textContent = `В корзине: ${itemCount} ${productText} (общее кол-во: ${totalQuantity.toFixed(1)})`;
    }
}

// saveShoppingList function removed - replaced by auto-save functionality

// Search Functions
function filterProducts(searchTerm) {
    const productItems = document.querySelectorAll('#productsList .product-item');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsCount = document.getElementById('searchResultsCount');
    const searchResultsText = document.getElementById('searchResultsText');
    
    if (!searchTerm) {
        // Show all products if search is empty
        productItems.forEach(item => {
            item.style.display = 'flex';
        });
        
        // Hide clear button and results count
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        if (searchResultsCount) searchResultsCount.classList.add('hidden');
        return;
    }
    
    // Show clear button
    if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
    
    // Filter products
    let visibleCount = 0;
    const searchTermLower = searchTerm.toLowerCase();
    
    productItems.forEach(item => {
        const productName = item.querySelector('h3').textContent.toLowerCase();
        const matches = productName.includes(searchTermLower);
        
        if (matches) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show search results count
    if (searchResultsCount && searchResultsText) {
        if (visibleCount === 0) {
            searchResultsText.textContent = `Товары не найдены для "${searchTerm}"`;
            searchResultsText.className = 'text-red-600';
        } else {
            searchResultsText.textContent = `Найдено ${visibleCount} товар${getProductCountSuffix(visibleCount)} для "${searchTerm}"`;
            searchResultsText.className = 'text-green-600';
        }
        searchResultsCount.classList.remove('hidden');
    }
}

function clearSearch() {
    const productSearchInput = document.getElementById('productSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsCount = document.getElementById('searchResultsCount');
    
    // Clear input
    if (productSearchInput) {
        productSearchInput.value = '';
        productSearchInput.focus();
    }
    
    // Hide clear button and results count
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    if (searchResultsCount) searchResultsCount.classList.add('hidden');
    
    // Show all products
    filterProducts('');
    
    console.log('Поиск очищен');
}

function getProductCountSuffix(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return '';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'а';
    } else {
        return 'ов';
    }
}

// WhatsApp Integration - Modified to show confirmation page first
function sendToWhatsApp() {
    // Get products that have quantities > 0
    const itemsToOrder = shoppingListData.filter(item => item.shoppingQuantity > 0);
    
    if (itemsToOrder.length === 0) {
        alert('Добавьте товары в закупку!');
        return;
    }
    
    // Determine department (default to 'bar' for backward compatibility)
    const department = window.currentDepartment || 'bar';
    const departmentName = department === 'kitchen' ? 'Кухня' : 'Бар';
    const departmentEmoji = department === 'kitchen' ? '🍳' : '🍷';
    
    // Generate WhatsApp message
    const formattedText = generateWhatsAppMessage(itemsToOrder, departmentName, departmentEmoji);
    
    // Prepare order data for confirmation page
    const orderData = {
        items: itemsToOrder.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.shoppingQuantity,
            unit: item.unit,
            isUrgent: item.quantity <= 0
        })),
        departmentName: departmentName,
        department: department,
        date: new Date().toLocaleDateString('ru-RU'),
        formattedText: formattedText,
        returnUrl: window.location.pathname
    };
    
    // Save order data to localStorage for confirmation page
    localStorage.setItem('pendingOrder', JSON.stringify(orderData));
    
    // Navigate to confirmation page
    window.location.href = '/confirmation';
    
    console.log(`Перенаправление на страницу подтверждения (${itemsToOrder.length} товаров)`);
}

// Save final order to cache with 'sent' status
function saveFinalOrderToCache(itemsToOrder, department, departmentName) {
    try {
        const finalOrder = {
            timestamp: new Date().toISOString(),
            department: department,
            departmentName: departmentName,
            items: itemsToOrder.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.shoppingQuantity,
                unit: item.unit
            })),
            totalItems: itemsToOrder.length,
            totalQuantity: itemsToOrder.reduce((sum, item) => sum + item.shoppingQuantity, 0),
            status: 'sent'
        };
        
        // Save to final orders history
        const historyKey = `${department}OrderHistory`;
        const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        existingHistory.unshift(finalOrder); // Add to beginning
        
        // Keep only last 10 orders
        if (existingHistory.length > 10) {
            existingHistory.splice(10);
        }
        
        localStorage.setItem(historyKey, JSON.stringify(existingHistory));
        
        // Clear the draft
        const draftKey = `${department}OrderDraft`;
        localStorage.removeItem(draftKey);
        
        console.log(`✅ Order saved to history: ${itemsToOrder.length} товаров`);
        
    } catch (error) {
        console.error('❌ Failed to save final order:', error);
    }
}

// Clear all quantities and reset the form
function clearAllQuantities() {
    // Reset data
    shoppingListData.forEach(item => {
        item.shoppingQuantity = 0;
    });
    
    // Clear all input fields
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.value = '';
    });
    
    // Update floating button label
    updateFloatingButtonLabel();
    
    // Clear search
    clearSearch();
    
    console.log('🧹 All quantities cleared');
}

// ===== CUSTOM ITEMS FUNCTIONALITY =====

function setupCustomItemListeners() {
    // Add custom item button
    const addCustomItemBtn = document.getElementById('addCustomItemBtn');
    if (addCustomItemBtn) {
        addCustomItemBtn.addEventListener('click', showCustomItemModal);
    }

    // Close modal buttons
    const closeModalBtn = document.getElementById('closeCustomItemModal');
    const cancelBtn = document.getElementById('cancelCustomItem');
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideCustomItemModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideCustomItemModal);

    // Form submission
    const customItemForm = document.getElementById('customItemForm');
    if (customItemForm) {
        customItemForm.addEventListener('submit', handleCustomItemSubmit);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('customItemModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideCustomItemModal();
            }
        });
    }
}

function showCustomItemModal() {
    const modal = document.getElementById('customItemModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Focus on the first input
        const nameInput = document.getElementById('customItemName');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }
}

function hideCustomItemModal() {
    const modal = document.getElementById('customItemModal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset form
        const form = document.getElementById('customItemForm');
        if (form) {
            form.reset();
        }
    }
}

function handleCustomItemSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('customItemName').value.trim();
    const quantity = parseFloat(document.getElementById('customItemQuantity').value);
    const unit = document.getElementById('customItemUnit').value;
    
    if (!name || !quantity || !unit) {
        alert('Заполните все поля!');
        return;
    }
    
    // Create custom item with unique ID (negative to distinguish from Poster items)
    const customItem = {
        id: -(Date.now()), // Negative ID for custom items
        name: name,
        quantity: 0, // Current stock (unknown for custom items)
        unit: unit,
        minQuantity: 0,
        checked: false,
        shoppingQuantity: quantity,
        isCustom: true
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
    
    // Hide modal
    hideCustomItemModal();
    
    // Show success message
    alert(`Товар "${name}" добавлен в заказ!`);
}

function deleteCustomItem(productId) {
    const itemName = shoppingListData.find(item => item.id === productId)?.name;
    
    if (confirm(`Удалить "${itemName}" из заказа?`)) {
        // Remove from custom items array
        customItems = customItems.filter(item => item.id !== productId);
        
        // Remove from shopping list data
        shoppingListData = shoppingListData.filter(item => item.id !== productId);
        
        console.log(`🗑 Deleted custom item: ${itemName}`);
        
        // Re-render the shopping list
        renderShoppingListProducts();
        
        // Update floating button label
        updateFloatingButtonLabel();
        
        // Auto-save
        autoSaveToCache();
    }
}

function generateWhatsAppMessage(items, departmentName, departmentEmoji) {
    let message = `${departmentEmoji} ${departmentName}:\n`;
    
    // Add items - simple format
    items.forEach(item => {
        message += `• ${item.name} - ${item.shoppingQuantity} ${item.unit}\n`;
    });
    
    return message;
}

// ✅ Poster API Functions (using server-side API routes to avoid CORS)
async function initializePosterAPI() {
    try {
        console.log('🔄 Initializing Poster API connection via server routes...');
        
        // Test connection using server-side API route
        const token = '305185:07928627ec76d09e589e1381710e55da';
        const baseUrl = 'https://joinposter.com/api';
        const response = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=2`);
        const connectionResult = await response.json();
        
        if (connectionResult.success) {
            console.log('✅ Poster API connected successfully!');
            console.log('Account info:', connectionResult.account);
            
            // Load products from Poster
            await fetchPosterProducts();
            
            console.log('Подключение к Poster API успешно!');
        } else {
            throw new Error(connectionResult.error || 'Connection failed');
        }
    } catch (error) {
        console.error('❌ Poster API initialization failed:', error);
        console.error('Ошибка подключения к Poster API: ' + error.message);
    }
}

async function fetchPosterProducts() {
    try {
        console.log('🔄 Fetching real ingredients from Poster...');
        
        // Use the new ingredients endpoint that actually works
        const token = '305185:07928627ec76d09e589e1381710e55da';
        const baseUrl = 'https://joinposter.com/api';
        const response = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=2`);
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Real ingredients fetched:', result.data);
            
            if (result.count === 0) {
                console.log('ℹ️ No ingredients found in Poster');
                console.log('Ингредиенты не найдены в Poster');
            } else {
                console.log(`Found ${result.count} real ingredients in Poster`);
                console.log(`✅ Загружено ${result.count} реальных ингредиентов из Poster!`);
                
                // Log the real data
                console.log('Your real Poster inventory:', result.data);
                
                // Show detailed info about real vs displayed data
                const realItems = result.data.map(item => `${item.name}: ${item.quantity} ${item.unit}`).join(', ');
                console.log('Real inventory quantities:', realItems);
            }
        } else {
            throw new Error(result.error || 'Failed to fetch ingredients');
        }
    } catch (error) {
        console.error('❌ Error fetching Poster ingredients:', error);
        console.error('Ошибка загрузки ингредиентов из Poster: ' + error.message);
    }
}

async function fetchPosterCategories() {
    try {
        console.log('🔄 Fetching categories from Poster via server route...');
        
        // Use server-side API route to fetch categories
        const response = await fetch('/api/test-poster-categories');
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Categories fetched:', result.data);
            return result.data;
        } else {
            throw new Error(result.error || 'Failed to fetch categories');
        }
    } catch (error) {
        console.error('❌ Error fetching Poster categories:', error);
        throw error;
    }
}

// Helper function to update UI with real Poster products (optional)
function updateUIWithPosterProducts(posterProducts) {
    if (!posterProducts || posterProducts.length === 0) {
        return;
    }
    
    console.log('🔄 Updating UI with Poster products...');
    
    // TODO: Replace mock data with real Poster products
    // This would involve updating the DOM elements with real product data
    // For now, just log the data
    console.log('Poster products to integrate:', posterProducts);
}

// Legacy functions (placeholder - these endpoints don't exist in your Poster account)
async function updatePosterInventory(productId, quantity) {
    console.warn('updatePosterInventory: This feature is not available in your Poster account');
    throw new Error('Inventory update not supported by your Poster account');
}

async function createPosterPurchaseOrder(shoppingList) {
    console.warn('createPosterPurchaseOrder: This feature is not available in your Poster account');
    console.log('Shopping list would be:', shoppingList);
    throw new Error('Purchase orders not supported by your Poster account');
}

// Notification system removed

// Export functions for potential use in other modules
window.BarInventory = {
    initializeOrderMode,
    updateShoppingQuantity,
    setShoppingQuantity,
    autoSaveToCache,
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
    renderShoppingListProducts
};

// Also expose functions globally for easier access from pages
window.updateProductDataFromGlobal = updateProductDataFromGlobal;
window.setShoppingQuantity = setShoppingQuantity;
window.updateShoppingQuantity = updateShoppingQuantity;
window.initializeOrderMode = initializeOrderMode;
window.updateFloatingButtonLabel = updateFloatingButtonLabel;
window.updateAddedProductsLabel = updateAddedProductsLabel; 